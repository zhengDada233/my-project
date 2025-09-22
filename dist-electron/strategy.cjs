"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradingStrategy = void 0;
const https = __importStar(require("https"));
const crypto = __importStar(require("crypto"));
const log = __importStar(require("electron-log"));
class TradingStrategy {
    constructor(config) {
        this.intervalId = null;
        this.lastLogTime = 0;
        this.symbolInfo = null;
        this.accountInfo = null;
        this.config = config;
        this.state = {
            isRunning: false,
            lastCheck: 0,
            currentPosition: 'NONE',
            entryPrice: 0,
            stopLossPrice: 0,
            takeProfitPrice: 0,
            currentPrice: 0,
            marketTrend: 'UNKNOWN',
            priceChange: 0,
            rsiValue: 0,
            emaValue: 0,
            lastSignal: 'NONE',
            checkCount: 0,
            orderHistory: [],
            accountBalance: 0,
            positionValue: 0,
            unrealizedPnl: 0
        };
    }
    async start() {
        if (this.state.isRunning) {
            throw new Error('策略已在运行中');
        }
        log.info(`启动交易策略: ${this.config.symbol}`);
        this.state.isRunning = true;
        // 初始化时获取交易对信息和账户信息
        try {
            await this.fetchSymbolInfo();
            await this.updateAccountInfo();
            // 验证账户余额
            if ((this.state.accountBalance ?? 0) <= 0) {
                throw new Error('账户余额不足，无法启动策略');
            }
        }
        catch (error) {
            this.state.isRunning = false;
            throw error;
        }
        await this.executeStrategy();
        this.intervalId = setInterval(() => this.executeStrategy(), this.config.checkInterval);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.state.isRunning = false;
        log.info(`停止交易策略: ${this.config.symbol}`);
    }
    getState() {
        return { ...this.state };
    }
    // 获取交易对信息
    async fetchSymbolInfo() {
        try {
            const response = await this.publicRequest(`exchangeInfo?symbol=${this.config.symbol}`);
            this.symbolInfo = response.symbols.find((s) => s.symbol === this.config.symbol);
            if (!this.symbolInfo) {
                throw new Error(`未找到交易对信息: ${this.config.symbol}`);
            }
            log.info(`交易对信息获取成功: ${this.config.symbol}`);
        }
        catch (error) {
            log.error('获取交易对信息失败:', error);
            throw error;
        }
    }
    // 公共API请求
    async publicRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const req = https.get(`https://api.binance.com/api/v3/${endpoint}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('请求超时'));
            });
        });
    }
    // 重试机制
    async withRetry(operation, operationName, maxRetries = 3, delayMs = 1000) {
        let lastError = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                const errorMessage = error instanceof Error ? error.message : String(error);
                log.warn(`${operationName} 失败，尝试 ${i + 1}/${maxRetries}:`, errorMessage);
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    delayMs *= 2; // 指数退避
                }
            }
        }
        throw lastError || new Error(`${operationName} 失败`);
    }
    async executeStrategy() {
        try {
            this.state.lastCheck = Date.now();
            this.state.checkCount++;
            // 更新账户信息
            await this.updateAccountInfo();
            // 检查账户余额
            if ((this.state.accountBalance ?? 0) <= 0) {
                log.error('账户余额不足，停止策略');
                this.stop();
                return;
            }
            let hourlyKlines = [];
            let minuteKlines = [];
            try {
                hourlyKlines = await this.withRetry(() => this.getKlines('1h', 100), '获取小时K线');
                minuteKlines = await this.withRetry(() => this.getKlines('5m', 20), '获取分钟K线');
            }
            catch (error) {
                log.error('获取K线数据失败:', error);
                this.addOrderHistory({
                    timestamp: Date.now(),
                    type: 'ERROR',
                    price: 0,
                    quantity: 0,
                    status: 'REJECTED',
                    message: `获取市场数据失败: ${error instanceof Error ? error.message : String(error)}`
                });
                return;
            }
            const hourlyCloses = hourlyKlines.map(k => parseFloat(k.close));
            const minuteCloses = minuteKlines.map(k => parseFloat(k.close));
            const hourlyEma = this.calculateEMA(hourlyCloses, this.config.emaPeriod);
            const currentRsi = this.calculateRSI(minuteCloses, this.config.rsiPeriod);
            const marketTrend = minuteCloses[minuteCloses.length - 1] > hourlyEma[hourlyEma.length - 1]
                ? 'BULL'
                : 'BEAR';
            const priceChange = (minuteCloses[minuteCloses.length - 1] - minuteCloses[minuteCloses.length - 5]) /
                minuteCloses[minuteCloses.length - 5];
            const currentPrice = minuteCloses[minuteCloses.length - 1];
            this.state.currentPrice = currentPrice;
            this.state.marketTrend = marketTrend;
            this.state.priceChange = priceChange;
            this.state.rsiValue = currentRsi;
            this.state.emaValue = hourlyEma[hourlyEma.length - 1];
            const now = Date.now();
            if (this.state.checkCount % 10 === 0 || now - this.lastLogTime > 60000) {
                this.logStrategyStatus();
                this.lastLogTime = now;
            }
            if (this.state.currentPosition !== 'NONE') {
                this.calculateUnrealizedPnl(currentPrice);
                if (this.shouldExitPosition(currentPrice)) {
                    this.state.lastSignal = 'EXIT_SIGNAL';
                    await this.exitPosition(currentPrice);
                    return;
                }
                else {
                    this.state.lastSignal = 'HOLD';
                }
            }
            else {
                this.state.lastSignal = 'NO_POSITION';
                if (this.shouldEnterPosition(marketTrend, priceChange, currentRsi)) {
                    this.state.lastSignal = 'ENTRY_SIGNAL';
                    await this.enterPosition(marketTrend, currentPrice);
                }
            }
        }
        catch (error) {
            log.error('策略执行错误:', error);
            this.addOrderHistory({
                timestamp: Date.now(),
                type: 'ERROR',
                price: 0,
                quantity: 0,
                status: 'REJECTED',
                message: `策略执行错误: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    logStrategyStatus() {
        log.info(`
  === 策略状态报告 ===
  时间: ${new Date().toLocaleString()}
  交易对: ${this.config.symbol}
  运行状态: ${this.state.isRunning ? '运行中' : '已停止'}
  检查次数: ${this.state.checkCount}
  当前价格: ${this.state.currentPrice.toFixed(8)}
  市场趋势: ${this.state.marketTrend}
  价格变化: ${(this.state.priceChange * 100).toFixed(2)}%
  RSI值: ${this.state.rsiValue.toFixed(2)}
  EMA值: ${this.state.emaValue.toFixed(8)}
  当前持仓: ${this.state.currentPosition}
  入场价格: ${this.state.entryPrice.toFixed(8)}
  止损价格: ${this.state.stopLossPrice.toFixed(8)}
  止盈价格: ${this.state.takeProfitPrice.toFixed(8)}
  最后信号: ${this.state.lastSignal}
  未实现盈亏: ${this.state.unrealizedPnl !== undefined ? this.state.unrealizedPnl.toFixed(2) + '%' : 'N/A'}
  账户余额: ${this.state.accountBalance !== undefined ? this.state.accountBalance.toFixed(2) + ' USDT' : 'N/A'}
  持仓价值: ${this.state.positionValue !== undefined ? this.state.positionValue.toFixed(2) + ' USDT' : 'N/A'}
  订单历史: ${this.state.orderHistory.length} 条记录
  ===================
      `);
    }
    calculateUnrealizedPnl(currentPrice) {
        if (this.state.currentPosition === 'LONG' && this.state.entryPrice > 0) {
            this.state.unrealizedPnl = ((currentPrice - this.state.entryPrice) / this.state.entryPrice) * 100;
        }
        else if (this.state.currentPosition === 'SHORT' && this.state.entryPrice > 0) {
            this.state.unrealizedPnl = ((this.state.entryPrice - currentPrice) / this.state.entryPrice) * 100;
        }
        else {
            this.state.unrealizedPnl = 0;
        }
    }
    async updateAccountInfo() {
        try {
            this.accountInfo = await this.withRetry(() => this.getAccountInfo(), '获取账户信息');
            const usdtBalance = this.accountInfo.balances.find((b) => b.asset === 'USDT');
            if (usdtBalance) {
                this.state.accountBalance = parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
            }
            else {
                this.state.accountBalance = 0;
            }
            const baseAsset = this.config.symbol.replace('USDT', '');
            const assetBalance = this.accountInfo.balances.find((b) => b.asset === baseAsset);
            if (assetBalance) {
                const assetAmount = parseFloat(assetBalance.free) + parseFloat(assetBalance.locked);
                this.state.positionValue = assetAmount * this.state.currentPrice;
            }
            else {
                this.state.positionValue = 0;
            }
        }
        catch (error) {
            log.error('更新账户信息失败:', error);
            // 不抛出错误，但记录账户信息获取失败
            this.state.accountBalance = 0;
            this.state.positionValue = 0;
        }
    }
    // 获取账户信息
    async getAccountInfo() {
        return new Promise((resolve, reject) => {
            try {
                const params = {
                    timestamp: Date.now().toString(),
                    recvWindow: '60000'
                };
                const queryString = Object.keys(params)
                    .sort()
                    .map(key => `${key}=${encodeURIComponent(params[key])}`)
                    .join('&');
                const signature = crypto
                    .createHmac('sha256', this.config.apiSecret)
                    .update(queryString)
                    .digest('hex');
                const signedQueryString = `${queryString}&signature=${encodeURIComponent(signature)}`;
                const pathWithQuery = `/api/v3/account?${signedQueryString}`;
                const options = {
                    hostname: 'api.binance.com',
                    port: 443,
                    path: pathWithQuery,
                    method: 'GET',
                    headers: {
                        'X-MBX-APIKEY': this.config.apiKey,
                        'User-Agent': 'BinanceElectronApp/1.0.0'
                    },
                    timeout: 30000
                };
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk.toString();
                    });
                    res.on('end', () => {
                        try {
                            const parsedData = JSON.parse(data);
                            // 检查API错误
                            if (parsedData.code) {
                                reject(new Error(`Binance API错误: ${parsedData.msg} (代码: ${parsedData.code})`));
                                return;
                            }
                            resolve(parsedData);
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                });
                req.on('error', (error) => {
                    reject(error);
                });
                req.setTimeout(30000, () => {
                    req.destroy();
                    reject(new Error('获取账户信息请求超时'));
                });
                req.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    addOrderHistory(order) {
        if (this.state.orderHistory.length >= 50) {
            this.state.orderHistory.shift();
        }
        this.state.orderHistory.push(order);
    }
    validateApiResponse(data) {
        if (data && data.code) {
            throw new Error(`Binance API 错误: ${data.msg || '未知错误'} (代码: ${data.code})`);
        }
        if (!Array.isArray(data)) {
            throw new Error(`无效的 API 响应: 期望数组，但收到 ${typeof data}`);
        }
    }
    async getKlines(interval, limit) {
        return new Promise((resolve, reject) => {
            const url = `https://api.binance.com/api/v3/klines?symbol=${this.config.symbol}&interval=${interval}&limit=${limit}`;
            const req = https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(data);
                        // 验证 API 响应
                        this.validateApiResponse(parsedData);
                        const klines = parsedData.map((k) => ({
                            openTime: k[0],
                            open: k[1],
                            high: k[2],
                            low: k[3],
                            close: k[4],
                            volume: k[5],
                            closeTime: k[6],
                            quoteAssetVolume: k[7],
                            numberOfTrades: k[8],
                            takerBuyBaseAssetVolume: k[9],
                            takerBuyQuoteAssetVolume: k[10]
                        }));
                        resolve(klines);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('获取K线数据请求超时'));
            });
        });
    }
    calculateEMA(data, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        let sma = 0;
        for (let i = 0; i < period; i++) {
            sma += data[i];
        }
        sma /= period;
        ema.push(sma);
        for (let i = period; i < data.length; i++) {
            ema.push((data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
        }
        return ema;
    }
    calculateRSI(data, period) {
        if (data.length < period + 1) {
            throw new Error('数据长度不足计算RSI');
        }
        let gains = 0;
        let losses = 0;
        for (let i = 1; i <= period; i++) {
            const change = data[i] - data[i - 1];
            if (change >= 0) {
                gains += change;
            }
            else {
                losses -= change;
            }
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;
        for (let i = period + 1; i < data.length; i++) {
            const change = data[i] - data[i - 1];
            if (change >= 0) {
                avgGain = (avgGain * (period - 1) + change) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            }
            else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) - change) / period;
            }
        }
        if (avgLoss === 0)
            return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    shouldEnterPosition(trend, priceChange, rsi) {
        if (trend === 'BULL') {
            return priceChange > 0.002 && rsi < 60;
        }
        else {
            return priceChange < -0.002 && rsi > 40;
        }
    }
    shouldExitPosition(currentPrice) {
        if (this.state.currentPosition === 'LONG') {
            return currentPrice <= this.state.stopLossPrice ||
                currentPrice >= this.state.takeProfitPrice;
        }
        else if (this.state.currentPosition === 'SHORT') {
            return currentPrice >= this.state.stopLossPrice ||
                currentPrice <= this.state.takeProfitPrice;
        }
        return false;
    }
    // 计算符合LOT_SIZE要求的数量
    calculateQuantity(price) {
        if (!this.symbolInfo) {
            throw new Error('交易对信息未获取');
        }
        // 找到LOT_SIZE过滤器
        const lotSizeFilter = this.symbolInfo.filters.find((f) => f.filterType === 'LOT_SIZE');
        if (!lotSizeFilter) {
            throw new Error('交易对没有LOT_SIZE过滤器');
        }
        const minQty = parseFloat(lotSizeFilter.minQty);
        const maxQty = parseFloat(lotSizeFilter.maxQty);
        const stepSize = parseFloat(lotSizeFilter.stepSize);
        // 计算基于仓位比例的数量，考虑手续费
        const amount = (this.state.accountBalance ?? 0) * this.config.positionSize * 0.995; // 预留0.5%作为手续费
        let quantity = amount / price;
        // 确保数量在最小和最大之间
        quantity = Math.max(minQty, Math.min(maxQty, quantity));
        // 调整数量到步长的整数倍
        quantity = Math.floor(quantity / stepSize) * stepSize;
        // 确保数量不小于最小数量
        quantity = Math.max(quantity, minQty);
        // 最终检查：确保交易金额不超过可用余额的99%（预留手续费）
        const finalAmount = quantity * price;
        const maxAllowedAmount = (this.state.accountBalance ?? 0) * 0.99;
        if (finalAmount > maxAllowedAmount) {
            // 重新计算数量，确保不超过最大允许金额
            quantity = Math.floor(maxAllowedAmount / price / stepSize) * stepSize;
            quantity = Math.max(quantity, minQty);
        }
        return parseFloat(quantity.toFixed(8));
    }
    // 检查余额
    async checkBalance(side, quantity, price) {
        try {
            await this.updateAccountInfo();
            const baseAsset = this.config.symbol.replace('USDT', '');
            if (side === 'BUY') {
                // 检查USDT余额是否足够，考虑手续费
                const usdtBalance = this.accountInfo.balances.find((b) => b.asset === 'USDT');
                if (usdtBalance) {
                    const freeUSDT = parseFloat(usdtBalance.free);
                    const neededUSDT = quantity * price * 1.001; // 考虑0.1%的手续费
                    return freeUSDT >= neededUSDT;
                }
            }
            else {
                // 检查基础资产余额是否足够，考虑手续费
                const assetBalance = this.accountInfo.balances.find((b) => b.asset === baseAsset);
                if (assetBalance) {
                    const freeAsset = parseFloat(assetBalance.free);
                    return freeAsset >= quantity * 1.001; // 考虑0.1%的手续费
                }
            }
            return false;
        }
        catch (error) {
            log.error('检查余额失败:', error);
            return false;
        }
    }
    async enterPosition(trend, currentPrice) {
        try {
            log.info(`发现入场机会: ${trend === 'BULL' ? '买入' : '卖出'} ${this.config.symbol}`);
            // 计算交易数量
            let quantity;
            try {
                quantity = this.calculateQuantity(currentPrice);
            }
            catch (error) {
                log.error('计算交易数量失败:', error);
                this.addOrderHistory({
                    timestamp: Date.now(),
                    type: trend === 'BULL' ? 'BUY' : 'SELL',
                    price: currentPrice,
                    quantity: 0,
                    status: 'REJECTED',
                    message: `计算交易数量失败: ${error instanceof Error ? error.message : String(error)}`
                });
                return;
            }
            // 检查余额是否足够
            const hasEnoughBalance = await this.checkBalance(trend === 'BULL' ? 'BUY' : 'SELL', quantity, currentPrice);
            if (!hasEnoughBalance) {
                log.error('余额不足，跳过交易');
                this.addOrderHistory({
                    timestamp: Date.now(),
                    type: trend === 'BULL' ? 'BUY' : 'SELL',
                    price: currentPrice,
                    quantity: quantity,
                    status: 'REJECTED',
                    message: '余额不足'
                });
                return;
            }
            // 双重检查：确保交易金额不超过可用余额的99%
            const tradeAmount = quantity * currentPrice;
            const availableBalance = this.state.accountBalance ?? 0;
            if (tradeAmount > availableBalance * 0.99) {
                log.error('交易金额超过可用余额限制，跳过交易');
                this.addOrderHistory({
                    timestamp: Date.now(),
                    type: trend === 'BULL' ? 'BUY' : 'SELL',
                    price: currentPrice,
                    quantity: quantity,
                    status: 'REJECTED',
                    message: `交易金额 ${tradeAmount.toFixed(2)} USDT 超过可用余额限制 ${(availableBalance * 0.99).toFixed(2)} USDT`
                });
                return;
            }
            const orderParams = {
                symbol: this.config.symbol,
                side: trend === 'BULL' ? 'BUY' : 'SELL',
                type: 'MARKET',
                quantity: quantity.toFixed(8),
                timestamp: Date.now()
            };
            log.info('订单参数:', orderParams);
            const order = await this.sendSignedRequest(orderParams);
            // 检查订单是否成功
            if (order.code) {
                throw new Error(`订单创建失败: ${order.msg} (代码: ${order.code})`);
            }
            log.info(`订单创建成功:`, order);
            this.addOrderHistory({
                timestamp: Date.now(),
                type: trend === 'BULL' ? 'BUY' : 'SELL',
                price: parseFloat(order.fills && order.fills.length > 0 ? order.fills[0].price : currentPrice.toString()),
                quantity: parseFloat(order.executedQty || quantity.toString()),
                status: order.status || 'FILLED',
                message: `订单ID: ${order.orderId}`
            });
            this.state.currentPosition = trend === 'BULL' ? 'LONG' : 'SHORT';
            this.state.entryPrice = parseFloat(order.fills && order.fills.length > 0 ? order.fills[0].price : currentPrice.toString());
            this.state.stopLossPrice = trend === 'BULL'
                ? this.state.entryPrice * (1 - this.config.stopLoss)
                : this.state.entryPrice * (1 + this.config.stopLoss);
            this.state.takeProfitPrice = trend === 'BULL'
                ? this.state.entryPrice * (1 + this.config.takeProfit)
                : this.state.entryPrice * (1 - this.config.takeProfit);
            this.state.unrealizedPnl = 0;
            // 更新账户信息
            await this.updateAccountInfo();
        }
        catch (error) {
            log.error('入场失败:', error);
            this.addOrderHistory({
                timestamp: Date.now(),
                type: trend === 'BULL' ? 'BUY' : 'SELL',
                price: currentPrice,
                quantity: 0,
                status: 'REJECTED',
                message: `入场失败: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    async exitPosition(currentPrice) {
        try {
            log.info(`执行出场: ${this.state.currentPosition === 'LONG' ? '卖出' : '买入'} ${this.config.symbol}`);
            const side = this.state.currentPosition === 'LONG' ? 'SELL' : 'BUY';
            // 计算平仓数量（使用当前持仓数量）
            const baseAsset = this.config.symbol.replace('USDT', '');
            const assetBalance = this.accountInfo.balances.find((b) => b.asset === baseAsset);
            let quantity = 0;
            if (assetBalance) {
                quantity = parseFloat(assetBalance.free); // 使用可用余额
            }
            if (quantity <= 0) {
                log.error('没有可平仓的数量');
                this.addOrderHistory({
                    timestamp: Date.now(),
                    type: side,
                    price: currentPrice,
                    quantity: 0,
                    status: 'REJECTED',
                    message: '没有可平仓的数量'
                });
                return;
            }
            // 确保数量符合LOT_SIZE要求
            const lotSizeFilter = this.symbolInfo.filters.find((f) => f.filterType === 'LOT_SIZE');
            if (lotSizeFilter) {
                const minQty = parseFloat(lotSizeFilter.minQty);
                const stepSize = parseFloat(lotSizeFilter.stepSize);
                // 调整数量到步长的整数倍
                quantity = Math.floor(quantity / stepSize) * stepSize;
                quantity = Math.max(quantity, minQty);
            }
            const orderParams = {
                symbol: this.config.symbol,
                side: side,
                type: 'MARKET',
                quantity: quantity.toFixed(8),
                timestamp: Date.now()
            };
            const order = await this.sendSignedRequest(orderParams);
            // 检查订单是否成功
            if (order.code) {
                throw new Error(`平仓订单创建失败: ${order.msg} (代码: ${order.code})`);
            }
            log.info(`平仓订单创建成功:`, order);
            let realizedPnl = 0;
            if (this.state.currentPosition === 'LONG') {
                realizedPnl = ((currentPrice - this.state.entryPrice) / this.state.entryPrice) * 100;
            }
            else {
                realizedPnl = ((this.state.entryPrice - currentPrice) / this.state.entryPrice) * 100;
            }
            this.addOrderHistory({
                timestamp: Date.now(),
                type: side,
                price: parseFloat(order.fills && order.fills.length > 0 ? order.fills[0].price : currentPrice.toString()),
                quantity: parseFloat(order.executedQty || quantity.toString()),
                status: order.status || 'FILLED',
                message: `平仓订单ID: ${order.orderId}, 盈亏: ${realizedPnl.toFixed(2)}%`
            });
            this.state.currentPosition = 'NONE';
            this.state.entryPrice = 0;
            this.state.stopLossPrice = 0;
            this.state.takeProfitPrice = 0;
            this.state.unrealizedPnl = 0;
            // 更新账户信息
            await this.updateAccountInfo();
        }
        catch (error) {
            log.error('出场失败:', error);
            this.addOrderHistory({
                timestamp: Date.now(),
                type: this.state.currentPosition === 'LONG' ? 'SELL' : 'BUY',
                price: currentPrice,
                quantity: 0,
                status: 'REJECTED',
                message: `出场失败: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    async sendSignedRequest(params) {
        return new Promise((resolve, reject) => {
            try {
                log.info('发送请求:', JSON.stringify(params, null, 2));
                if (!params.timestamp) {
                    params.timestamp = Date.now();
                }
                const queryString = Object.keys(params)
                    .sort()
                    .map(key => `${key}=${encodeURIComponent(params[key])}`)
                    .join('&');
                const signature = crypto
                    .createHmac('sha256', this.config.apiSecret)
                    .update(queryString)
                    .digest('hex');
                const signedQueryString = `${queryString}&signature=${encodeURIComponent(signature)}`;
                const options = {
                    hostname: 'api.binance.com',
                    port: 443,
                    path: '/api/v3/order',
                    method: 'POST',
                    headers: {
                        'X-MBX-APIKEY': this.config.apiKey,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(signedQueryString),
                        'User-Agent': 'BinanceElectronApp/1.0.0'
                    },
                    timeout: 30000
                };
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk.toString();
                    });
                    res.on('end', () => {
                        try {
                            const parsedData = JSON.parse(data);
                            // 检查API错误
                            if (parsedData.code) {
                                reject(new Error(`Binance API错误: ${parsedData.msg} (代码: ${parsedData.code})`));
                                return;
                            }
                            resolve(parsedData);
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                });
                req.setTimeout(30000, () => {
                    req.destroy();
                    reject(new Error('订单请求超时'));
                });
                req.on('error', (error) => {
                    reject(error);
                });
                req.write(signedQueryString);
                req.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.TradingStrategy = TradingStrategy;
exports.default = TradingStrategy;
//# sourceMappingURL=strategy.js.map