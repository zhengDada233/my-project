// src/api/binance/strategy.ts
import * as log from 'electron-log';

import { marketApi } from './market';
import { tradeApi } from './trade';
import { BinanceApiError } from './types';

// 策略配置接口
export interface StrategyConfig {
  symbol: string;
  apiKey: string;
  apiSecret: string;
  positionSize: number; // 仓位比例 (0-1)
  stopLoss: number;     // 止损比例 (0-1)
  takeProfit: number;   // 止盈比例 (0-1)
  emaPeriod: number;    // EMA周期
  rsiPeriod: number;    // RSI周期
  checkInterval: number; // 检查间隔(毫秒)
}

// K线数据接口
export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
}

// 策略状态
export interface StrategyState {
  isRunning: boolean;
  lastCheck: number;
  currentPosition: 'LONG' | 'SHORT' | 'NONE';
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
}

export class TradingStrategy {
  private config: StrategyConfig;
  private state: StrategyState;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: StrategyConfig) {
    this.config = config;
    this.state = {
      isRunning: false,
      lastCheck: 0,
      currentPosition: 'NONE',
      entryPrice: 0,
      stopLossPrice: 0,
      takeProfitPrice: 0
    };
  }

  // 启动策略
  async start(): Promise<void> {
    if (this.state.isRunning) {
      throw new Error('策略已在运行中');
    }

    log.info(`启动交易策略: ${this.config.symbol}`);
    this.state.isRunning = true;

    // 初始检查
    await this.executeStrategy();

    // 设置定期检查
    this.intervalId = setInterval(
      () => this.executeStrategy(),
      this.config.checkInterval
    );
  }

  // 停止策略
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.state.isRunning = false;
    log.info(`停止交易策略: ${this.config.symbol}`);
  }

  // 获取策略状态
  getState(): StrategyState {
    return { ...this.state };
  }

  // 执行策略逻辑
  private async executeStrategy(): Promise<void> {
    try {
      this.state.lastCheck = Date.now();
      
      // 1. 获取数据
      const hourlyKlines = await this.getKlines('1h', 100);
      const minuteKlines = await this.getKlines('5m', 20);
      
      // 2. 计算指标
      const hourlyCloses = hourlyKlines.map(k => parseFloat(k.close));
      const minuteCloses = minuteKlines.map(k => parseFloat(k.close));
      
      const hourlyEma = this.calculateEMA(hourlyCloses, this.config.emaPeriod);
      const currentRsi = this.calculateRSI(minuteCloses, this.config.rsiPeriod);
      
      // 3. 判断趋势
      const marketTrend = minuteCloses[minuteCloses.length - 1] > hourlyEma[hourlyEma.length - 1] 
        ? 'BULL' 
        : 'BEAR';
      
      // 4. 计算价格变化
      const priceChange = (minuteCloses[minuteCloses.length - 1] - minuteCloses[minuteCloses.length - 5]) / 
                         minuteCloses[minuteCloses.length - 5];
      
      const currentPrice = minuteCloses[minuteCloses.length - 1];
      
      // 5. 检查是否有持仓
      if (this.state.currentPosition !== 'NONE') {
        // 检查止损止盈
        if (this.shouldExitPosition(currentPrice)) {
          await this.exitPosition(currentPrice);
          return;
        }
      } else {
        // 6. 寻找入场机会
        if (this.shouldEnterPosition(marketTrend, priceChange, currentRsi)) {
          await this.enterPosition(marketTrend, currentPrice);
        }
      }
    } catch (error) {
      console.error('策略执行错误:', error);
    }
  }

  // 获取K线数据
  private async getKlines(interval: string, limit: number): Promise<Kline[]> {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${this.config.symbol}&interval=${interval}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`获取K线数据失败: ${response.status}`);
      }
      
      const data = await response.json();
      return data.map((k: any[]) => ({
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
    } catch (error) {
      console.error('获取K线数据错误:', error);
      throw error;
    }
  }

  // 计算EMA
  private calculateEMA(data: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // 初始EMA为SMA
    let sma = 0;
    for (let i = 0; i < period; i++) {
      sma += data[i];
    }
    sma /= period;
    ema.push(sma);
    
    // 计算后续EMA
    for (let i = period; i < data.length; i++) {
      ema.push((data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
    }
    
    return ema;
  }

  // 计算RSI
  private calculateRSI(data: number[], period: number): number {
    if (data.length < period + 1) {
      throw new Error('数据长度不足计算RSI');
    }
    
    let gains = 0;
    let losses = 0;
    
    // 计算初始平均值
    for (let i = 1; i <= period; i++) {
      const change = data[i] - data[i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // 计算后续值
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      
      if (change >= 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // 判断是否应该入场
  private shouldEnterPosition(trend: string, priceChange: number, rsi: number): boolean {
    if (trend === 'BULL') {
      return priceChange > 0.002 && rsi < 60;
    } else {
      return priceChange < -0.002 && rsi > 40;
    }
  }

  // 判断是否应该出场
  private shouldExitPosition(currentPrice: number): boolean {
    if (this.state.currentPosition === 'LONG') {
      return currentPrice <= this.state.stopLossPrice || 
             currentPrice >= this.state.takeProfitPrice;
    } else if (this.state.currentPosition === 'SHORT') {
      return currentPrice >= this.state.stopLossPrice || 
             currentPrice <= this.state.takeProfitPrice;
    }
    return false;
  }

  // 入场
  private async enterPosition(trend: string, currentPrice: number): Promise<void> {
    try {
      log.info(`发现入场机会: ${trend === 'BULL' ? '买入' : '卖出'} ${this.config.symbol}`);
      
      // 计算仓位大小
      const symbolInfo = await marketApi.getSymbolInfo(this.config.symbol);
      if (!symbolInfo) {
        throw new Error(`无法获取交易对信息: ${this.config.symbol}`);
      }
      
      // 计算数量 (简化处理)
      const quantity = this.calculateQuantity(currentPrice, symbolInfo);
      
      // 创建订单
      const orderParams = {
        symbol: this.config.symbol,
        side: trend === 'BULL' ? 'BUY' : 'SELL',
        type: 'MARKET',
        quantity: quantity,
        timestamp: Date.now()
      };
      
      const order = await tradeApi.createOrder(
        orderParams, 
        this.config.apiKey, 
        this.config.apiSecret
      );
      
      log.info(`订单创建成功:`, order);
      
      // 更新状态
      this.state.currentPosition = trend === 'BULL' ? 'LONG' : 'SHORT';
      this.state.entryPrice = currentPrice;
      this.state.stopLossPrice = trend === 'BULL' 
        ? currentPrice * (1 - this.config.stopLoss)
        : currentPrice * (1 + this.config.stopLoss);
      this.state.takeProfitPrice = trend === 'BULL'
        ? currentPrice * (1 + this.config.takeProfit)
        : currentPrice * (1 - this.config.takeProfit);
        
    } catch (error) {
      console.error('入场失败:', error);
    }
  }

  // 出场
  private async exitPosition(currentPrice: number): Promise<void> {
    try {
      log.info(`执行出场: ${this.state.currentPosition === 'LONG' ? '卖出' : '买入'} ${this.config.symbol}`);
      
      // 计算反向操作
      const side = this.state.currentPosition === 'LONG' ? 'SELL' : 'BUY';
      
      // 获取交易对信息
      const symbolInfo = await marketApi.getSymbolInfo(this.config.symbol);
      if (!symbolInfo) {
        throw new Error(`无法获取交易对信息: ${this.config.symbol}`);
      }
      
      // 计算数量 (简化处理)
      const quantity = this.calculateQuantity(currentPrice, symbolInfo);
      
      // 创建平仓订单
      const orderParams = {
        symbol: this.config.symbol,
        side: side,
        type: 'MARKET',
        quantity: quantity,
        timestamp: Date.now()
      };
      
      const order = await tradeApi.createOrder(
        orderParams, 
        this.config.apiKey, 
        this.config.apiSecret
      );
      
      log.info(`平仓订单创建成功:`, order);
      
      // 更新状态
      this.state.currentPosition = 'NONE';
      this.state.entryPrice = 0;
      this.state.stopLossPrice = 0;
      this.state.takeProfitPrice = 0;
      
    } catch (error) {
      console.error('出场失败:', error);
    }
  }

  // 计算交易数量
  private calculateQuantity(price: number, symbolInfo: any): number {
    // 这里简化处理，实际应根据账户余额和仓位比例计算
    // 并考虑交易对的最小交易量限制
    const basePrecision = this.getPrecision(symbolInfo.baseAssetPrecision);
    return parseFloat((0.001).toFixed(basePrecision));
  }

  // 获取精度
  private getPrecision(precision: number): number {
    return Math.max(0, Math.floor(Math.log10(1 / precision)));
  }
}