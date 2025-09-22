"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradingStrategy = void 0;
const main_1 = require("./main");
const trade_1 = require("../src/api/binance/trade");
const market_1 = require("../src/api/binance/market");
class TradingStrategy {
    constructor(config) {
        this.intervalId = null;
        this.config = config;
        this.state = {
            accountBalance: 0,
            positionValue: 0,
            currentPrice: 0,
            currentPosition: 'NONE',
            entryPrice: 0,
            stopLossPrice: 0,
            takeProfitPrice: 0,
            lastCheck: 0,
            checkCount: 0,
            marketTrend: 'UNCERTAIN',
            priceChange: 0,
            rsiValue: 0,
            emaValue: 0,
            lastSignal: '',
            orderHistory: []
        };
        this.symbolInfo = null;
        this.accountInfo = null;
    }
    start() {
        main_1.log.info(`启动交易策略: ${this.config.symbol}`);
        this.intervalId = setInterval(() => this.executeStrategy(), this.config.checkInterval);
        this.executeStrategy(); // 立即执行一次
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        main_1.log.info(`停止交易策略: ${this.config.symbol}`);
    }
    async executeStrategy() {
        try {
            this.state.lastCheck = Date.now();
            this.state.checkCount++;
            // 更新账户信息
            await this.updateAccountInfo();
            // 检查账户余额
            if ((this.state.accountBalance ?? 0) <= 0 && this.state.currentPosition === 'NONE') {
                main_1.log.error('账户余额不足，停止策略');
                this.stop();
                return;
            }
            // 获取多个时间框架的K线数据
            let hourlyKlines = [];
            let fifteenMinKlines = [];
            let fiveMinKlines = [];
            try {
                hourlyKlines = await this.withRetry(() => this.getKlines('1h', 100), '获取小时K线');
                fifteenMinKlines = await this.withRetry(() => this.getKlines('15m', 50), '获取15分钟K线');
                fiveMinKlines = await this.withRetry(() => this.getKlines('5m', 30), '获取5分钟K线');
            }
            catch (error) {
                main_1.log.error('获取K线数据失败:', error);
                return;
            }
            // 获取交易对信息
            if (!this.symbolInfo) {
                try {
                    this.symbolInfo = await this.withRetry(() => market_1.marketApi.getSymbolInfo(this.config.symbol), '获取交易对信息');
                }
                catch (error) {
                    main_1.log.error('获取交易对信息失败:', error);
                    return;
                }
            }
            // 计算各时间框架指标
            const hourlyCloses = hourlyKlines.map(k => parseFloat(k.close));
            const fifteenMinCloses = fifteenMinKlines.map(k => parseFloat(k.close));
            const fiveMinCloses = fiveMinKlines.map(k => parseFloat(k.close));
            const hourlyEma = this.calculateEMA(hourlyCloses, this.config.emaPeriod);
            const fifteenMinEma = this.calculateEMA(fifteenMinCloses, Math.round(this.config.emaPeriod / 2));
            const fiveMinRsi = this.calculateRSI(fiveMinCloses, this.config.rsiPeriod);
            // 多时间框架趋势确认
            const hourlyTrend = hourlyCloses[hourlyCloses.length - 1] > hourlyEma[hourlyEma.length - 1] ? 'BULL' : 'BEAR';
            const fifteenMinTrend = fifteenMinCloses[fifteenMinCloses.length - 1] > fifteenMinEma[fifteenMinEma.length - 1] ? 'BULL' : 'BEAR';
            // 主要趋势由小时线决定，15分钟线确认
            const marketTrend = hourlyTrend === fifteenMinTrend ? hourlyTrend : 'UNCERTAIN';
            // 短期价格变化（5分钟线）
            const priceChange = fiveMinCloses.length >= 6
                ? (fiveMinCloses[fiveMinCloses.length - 1] - fiveMinCloses[fiveMinCloses.length - 6]) / fiveMinCloses[fiveMinCloses.length - 6] * 100
                : 0;
            const currentPrice = fiveMinCloses[fiveMinCloses.length - 1];
            // 更新状态
            this.state.currentPrice = currentPrice;
            this.state.marketTrend = marketTrend;
            this.state.priceChange = priceChange;
            this.state.rsiValue = fiveMinRsi[fiveMinRsi.length - 1];
            this.state.emaValue = hourlyEma[hourlyEma.length - 1];
            // 检查是否需要平仓
            if (this.state.currentPosition !== 'NONE') {
                this.adjustStopLoss(currentPrice);
                if (this.shouldExitPosition(currentPrice)) {
                    await this.exitPosition(currentPrice);
                    return;
                }
            }
            // 检查是否需要入场
            if (this.state.currentPosition === 'NONE' &&
                this.shouldEnterPosition(marketTrend, priceChange, fiveMinRsi[fiveMinRsi.length - 1], fifteenMinTrend)) {
                await this.enterPosition(marketTrend, currentPrice, fifteenMinKlines);
            }
        }
        catch (error) {
            main_1.log.error('策略执行失败:', error);
        }
    }
    async updateAccountInfo() {
        try {
            // 保存当前账户信息用于失败时恢复
            const currentAccountInfo = this.accountInfo;
            const currentBalance = this.state.accountBalance;
            const currentPositionValue = this.state.positionValue;
            this.accountInfo = await this.withRetry(() => this.getAccountInfo(), '获取账户信息');
            // 精确计算USDT余额
            const usdtBalance = this.accountInfo.balances.find((b) => b.asset === 'USDT');
            if (usdtBalance) {
                this.state.accountBalance = parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
            }
            else {
                main_1.log.warn('未找到USDT余额信息');
                // 不重置为0，保留上次值
            }
            // 计算当前持仓价值
            const baseAsset = this.config.symbol.replace('USDT', '');
            const assetBalance = this.accountInfo.balances.find((b) => b.asset === baseAsset);
            if (assetBalance) {
                const assetAmount = parseFloat(assetBalance.free) + parseFloat(assetBalance.locked);
                this.state.positionValue = assetAmount * this.state.currentPrice;
            }
            else {
                main_1.log.warn(`未找到${baseAsset}余额信息`);
                // 不重置为0，保留上次值
            }
        }
        catch (error) {
            main_1.log.error('更新账户信息失败:', error);
            // 保留上次的账户信息而不是清零，避免误判
            main_1.log.warn('使用上次的账户信息继续操作');
        }
    }
    async enterPosition(trend, currentPrice, klines) {
        try {
            const action = trend === 'BULL' ? '买入' : '卖出';
            main_1.log.info(`发现入场机会: ${action} ${this.config.symbol}`);
            if (!this.symbolInfo) {
                throw new Error(`未获取到交易对信息: ${this.config.symbol}`);
            }
            // 确保账户信息已更新
            await this.updateAccountInfo();
            // 检查余额是否充足
            const requiredBalance = this.calculateRequiredBalance(currentPrice, trend);
            if (this.state.accountBalance < requiredBalance) {
                main_1.log.error(`余额不足，需要 ${requiredBalance.toFixed(2)} USDT，但账户只有 ${this.state.accountBalance.toFixed(2)} USDT`);
                this.addOrderHistory({
                    timestamp: Date.now(),
                    type: trend === 'BULL' ? 'BUY' : 'SELL',
                    price: currentPrice,
                    quantity: 0,
                    status: 'REJECTED',
                    message: `余额不足: 需要 ${requiredBalance.toFixed(2)} USDT, 可用 ${this.state.accountBalance.toFixed(2)} USDT`
                });
                return;
            }
            // 计算正确的交易数量
            const quantity = this.calculateQuantity(currentPrice, trend);
            if (quantity <= 0) {
                throw new Error(`计算的交易数量无效: ${quantity}`);
            }
            // 计算动态止盈止损
            const { stopLoss, takeProfit } = this.calculateDynamicLevels(currentPrice, trend, klines);
            // 创建订单
            const orderParams = {
                symbol: this.config.symbol,
                side: trend === 'BULL' ? 'BUY' : 'SELL',
                type: 'MARKET',
                quantity: quantity,
                timestamp: Date.now()
            };
            const order = await trade_1.tradeApi.createOrder(orderParams, this.config.apiKey, this.config.apiSecret);
            main_1.log.info(`入场订单创建成功:`, order);
            // 更新状态
            this.state.currentPosition = trend === 'BULL' ? 'LONG' : 'SHORT';
            this.state.entryPrice = currentPrice;
            this.state.stopLossPrice = stopLoss;
            this.state.takeProfitPrice = takeProfit;
            this.state.lastSignal = 'ENTRY_SIGNAL';
            this.addOrderHistory({
                timestamp: Date.now(),
                type: trend === 'BULL' ? 'BUY' : 'SELL',
                price: currentPrice,
                quantity: quantity,
                status: 'SUCCESS',
                message: `入场成功，订单ID: ${order.orderId}`
            });
        }
        catch (error) {
            main_1.log.error('入场操作失败:', error);
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
            const action = this.state.currentPosition === 'LONG' ? '卖出' : '买入';
            main_1.log.info(`执行出场: ${action} ${this.config.symbol}`);
            // 计算反向操作
            const side = this.state.currentPosition === 'LONG' ? 'SELL' : 'BUY';
            // 获取交易对信息
            if (!this.symbolInfo) {
                throw new Error(`无法获取交易对信息: ${this.config.symbol}`);
            }
            // 计算数量
            const quantity = this.calculateExitQuantity(currentPrice);
            if (quantity <= 0) {
                throw new Error(`计算的平仓数量无效: ${quantity}`);
            }
            // 创建平仓订单
            const orderParams = {
                symbol: this.config.symbol,
                side: side,
                type: 'MARKET',
                quantity: quantity,
                timestamp: Date.now()
            };
            const order = await trade_1.tradeApi.createOrder(orderParams, this.config.apiKey, this.config.apiSecret);
            main_1.log.info(`平仓订单创建成功:`, order);
            // 计算盈亏
            const profitRate = this.state.currentPosition === 'LONG'
                ? ((currentPrice - this.state.entryPrice) / this.state.entryPrice) * 100
                : ((this.state.entryPrice - currentPrice) / this.state.entryPrice) * 100;
            // 更新状态
            this.state.currentPosition = 'NONE';
            this.state.lastSignal = 'EXIT_SIGNAL';
            this.addOrderHistory({
                timestamp: Date.now(),
                type: side,
                price: currentPrice,
                quantity: quantity,
                status: 'SUCCESS',
                message: `平仓成功，订单ID: ${order.orderId}, 盈亏: ${profitRate.toFixed(2)}%`
            });
        }
        catch (error) {
            main_1.log.error('出场失败:', error);
            this.addOrderHistory({
                timestamp: Date.now(),
                type: this.state.currentPosition === 'LONG' ? 'SELL' : 'BUY',
                price: currentPrice,
                quantity: 0,
                status: 'REJECTED',
                message: `平仓失败: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    // 计算所需余额（包含手续费）
    calculateRequiredBalance(currentPrice, trend) {
        const quantity = this.calculateQuantity(currentPrice, trend);
        const feeRate = 0.001; // 假设0.1%的手续费
        // 买入时：价格 × 数量 × (1 + 手续费率)
        // 卖出时需要的是基础货币余额，这里简化处理为USDT价值
        return currentPrice * quantity * (1 + feeRate);
    }
    // 优化数量计算
    calculateQuantity(currentPrice, trend) {
        if (!this.symbolInfo || !this.state.accountBalance) {
            return 0;
        }
        // 获取交易对的精度信息
        const lotSizeFilter = this.symbolInfo.filters.find((f) => f.filterType === 'LOT_SIZE');
        if (!lotSizeFilter) {
            throw new Error('未找到交易对的数量过滤信息');
        }
        const minQty = parseFloat(lotSizeFilter.minQty);
        const stepSize = parseFloat(lotSizeFilter.stepSize);
        const maxQty = parseFloat(lotSizeFilter.maxQty);
        // 根据仓位比例计算最大可交易数量
        const maxAmount = this.state.accountBalance * this.config.positionSize;
        let quantity = maxAmount / currentPrice;
        // 应用最大数量限制
        if (quantity > maxQty) {
            quantity = maxQty;
        }
        // 应用最小数量限制
        if (quantity < minQty) {
            main_1.log.warn(`计算的数量 ${quantity} 小于最小交易数量 ${minQty}`);
            return 0;
        }
        // 按步长调整数量
        const decimalPlaces = stepSize.toString().split('.')[1]?.length || 0;
        quantity = parseFloat(quantity.toFixed(decimalPlaces));
        return quantity;
    }
    // 计算平仓数量
    calculateExitQuantity(currentPrice) {
        if (!this.symbolInfo) {
            return 0;
        }
        const baseAsset = this.config.symbol.replace('USDT', '');
        const assetBalance = this.accountInfo?.balances.find((b) => b.asset === baseAsset);
        if (!assetBalance) {
            return 0;
        }
        const lotSizeFilter = this.symbolInfo.filters.find((f) => f.filterType === 'LOT_SIZE');
        if (!lotSizeFilter) {
            throw new Error('未找到交易对的数量过滤信息');
        }
        const stepSize = parseFloat(lotSizeFilter.stepSize);
        let quantity = parseFloat(assetBalance.free) + parseFloat(assetBalance.locked);
        // 按步长调整数量
        const decimalPlaces = stepSize.toString().split('.')[1]?.length || 0;
        quantity = parseFloat(quantity.toFixed(decimalPlaces));
        return quantity;
    }
    // 优化入场条件
    shouldEnterPosition(trend, priceChange, rsi, fifteenMinTrend) {
        // 趋势不一致时不交易
        if (trend === 'UNCERTAIN') {
            return false;
        }
        // 过滤微小波动
        const minPriceChange = 0.3; // 0.3%的价格变化（绝对值）
        // 检查交易量是否支持当前趋势
        const volumeIncreasing = this.checkVolumeIncreasing();
        if (trend === 'BULL' && fifteenMinTrend === 'BULL') {
            // 多头入场条件：RSI未超买，价格上涨，交易量增加
            return priceChange > minPriceChange && rsi < 65 && volumeIncreasing;
        }
        else if (trend === 'BEAR' && fifteenMinTrend === 'BEAR') {
            // 空头入场条件：RSI未超卖，价格下跌，交易量增加
            return priceChange < -minPriceChange && rsi > 35 && volumeIncreasing;
        }
        return false;
    }
    // 检查是否需要平仓
    shouldExitPosition(currentPrice) {
        // 达到止盈价
        if (this.state.currentPosition === 'LONG' && currentPrice >= this.state.takeProfitPrice) {
            main_1.log.info(`达到止盈价: ${currentPrice} >= ${this.state.takeProfitPrice}`);
            return true;
        }
        if (this.state.currentPosition === 'SHORT' && currentPrice <= this.state.takeProfitPrice) {
            main_1.log.info(`达到止盈价: ${currentPrice} <= ${this.state.takeProfitPrice}`);
            return true;
        }
        // 达到止损价
        if (this.state.currentPosition === 'LONG' && currentPrice <= this.state.stopLossPrice) {
            main_1.log.info(`达到止损价: ${currentPrice} <= ${this.state.stopLossPrice}`);
            return true;
        }
        if (this.state.currentPosition === 'SHORT' && currentPrice >= this.state.stopLossPrice) {
            main_1.log.info(`达到止损价: ${currentPrice} >= ${this.state.stopLossPrice}`);
            return true;
        }
        return false;
    }
    // 检查交易量是否在增加
    checkVolumeIncreasing() {
        // 实际实现应检查最近K线的交易量趋势
        // 这里简化为返回true
        return true;
    }
    // 计算动态止盈止损
    calculateDynamicLevels(currentPrice, trend, klines) {
        // 计算近期波动率
        const closes = klines.map(k => parseFloat(k.close));
        const volatility = this.calculateVolatility(closes);
        // 根据波动率调整比例
        const baseStopLoss = this.config.stopLoss;
        const baseTakeProfit = this.config.takeProfit;
        // 波动越大，止损越大
        const adjustedStopLoss = Math.max(baseStopLoss, volatility * 1.5);
        // 止盈设置为止损的1.5-2倍，确保风险回报比合理
        const adjustedTakeProfit = adjustedStopLoss * 1.75;
        if (trend === 'BULL') {
            return {
                stopLoss: currentPrice * (1 - adjustedStopLoss),
                takeProfit: currentPrice * (1 + adjustedTakeProfit)
            };
        }
        else {
            return {
                stopLoss: currentPrice * (1 + adjustedStopLoss),
                takeProfit: currentPrice * (1 - adjustedTakeProfit)
            };
        }
    }
    // 计算波动率
    calculateVolatility(closes) {
        if (closes.length < 2)
            return 0;
        // 计算最近10根K线的平均涨跌幅
        let totalChange = 0;
        const period = Math.min(10, closes.length - 1);
        for (let i = closes.length - 1; i > closes.length - 1 - period; i--) {
            totalChange += Math.abs(closes[i] - closes[i - 1]) / closes[i - 1];
        }
        return totalChange / period;
    }
    // 移动止损调整
    adjustStopLoss(currentPrice) {
        if (this.state.currentPosition === 'LONG') {
            // 多头：当价格上涨一定比例，提高止损
            const profitThreshold = 0.02; // 2%利润
            const priceIncrease = (currentPrice - this.state.entryPrice) / this.state.entryPrice;
            if (priceIncrease > profitThreshold) {
                // 新止损 = 当前价格 * (1 - 原止损比例/2)
                const newStopLoss = currentPrice * (1 - this.config.stopLoss / 2);
                if (newStopLoss > this.state.stopLossPrice) {
                    main_1.log.info(`移动止损更新: ${this.state.stopLossPrice.toFixed(8)} → ${newStopLoss.toFixed(8)}`);
                    this.state.stopLossPrice = newStopLoss;
                }
            }
        }
        else if (this.state.currentPosition === 'SHORT') {
            // 空头：当价格下跌一定比例，降低止损
            const profitThreshold = 0.02; // 2%利润
            const priceDecrease = (this.state.entryPrice - currentPrice) / this.state.entryPrice;
            if (priceDecrease > profitThreshold) {
                // 新止损 = 当前价格 * (1 + 原止损比例/2)
                const newStopLoss = currentPrice * (1 + this.config.stopLoss / 2);
                if (newStopLoss < this.state.stopLossPrice) {
                    main_1.log.info(`移动止损更新: ${this.state.stopLossPrice.toFixed(8)} → ${newStopLoss.toFixed(8)}`);
                    this.state.stopLossPrice = newStopLoss;
                }
            }
        }
    }
    // 计算EMA
    calculateEMA(closes, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        // 计算初始EMA（SMA）
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += closes[i];
        }
        const initialEma = sum / period;
        ema.push(initialEma);
        // 计算后续EMA
        for (let i = period; i < closes.length; i++) {
            const currentEma = (closes[i] - ema[i - period]) * multiplier + ema[i - period];
            ema.push(currentEma);
        }
        return ema;
    }
    // 计算RSI
    calculateRSI(closes, period) {
        const rsi = [];
        const changes = [];
        // 计算价格变化
        for (let i = 1; i < closes.length; i++) {
            changes.push(closes[i] - closes[i - 1]);
        }
        // 计算初始RSI
        const gains = changes.slice(0, period).filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
        const losses = Math.abs(changes.slice(0, period).filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
        const rs = gains / losses;
        rsi.push(100 - (100 / (1 + rs)));
        // 计算后续RSI
        for (let i = period; i < changes.length; i++) {
            const currentGain = changes[i] > 0 ? changes[i] : 0;
            const currentLoss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
            const avgGain = (gains * (period - 1) + currentGain) / period;
            const avgLoss = (losses * (period - 1) + currentLoss) / period;
            const currentRs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + currentRs)));
        }
        return rsi;
    }
    // 添加订单历史
    addOrderHistory(order) {
        this.state.orderHistory.push(order);
        // 限制历史记录数量
        if (this.state.orderHistory.length > 100) {
            this.state.orderHistory.shift();
        }
    }
    // 获取K线数据
    async getKlines(interval, limit) {
        return market_1.marketApi.getKlines(this.config.symbol, interval, limit);
    }
    // 获取账户信息
    async getAccountInfo() {
        return trade_1.tradeApi.getAccountInfo(this.config.apiKey, this.config.apiSecret);
    }
    // 带重试的请求
    async withRetry(fn, label, retries = 3, delay = 1000) {
        try {
            return await fn();
        }
        catch (error) {
            if (retries > 0) {
                main_1.log.warn(`获取${label}失败，剩余重试次数: ${retries}`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.withRetry(fn, label, retries - 1, delay * 2);
            }
            throw error;
        }
    }
    // 获取当前策略状态
    getState() {
        return { ...this.state };
    }
}
exports.TradingStrategy = TradingStrategy;
//# sourceMappingURL=strategy.js.map