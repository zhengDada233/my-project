// src/api/binance/market.ts
import { BinanceApiBase } from './base.js';
import { logger } from '../../utils/logger.js';

// 定义K线数据接口
export interface Kline {
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  [key: string]: string;
}

// 定义交易对信息接口
export interface SymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  filters: Array<{
    filterType: string;
    minQty?: string;
    maxQty?: string;
    stepSize?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

// 市场API类
export class MarketApi extends BinanceApiBase {
  /**
   * 获取K线数据
   */
  async getKlines(
    symbol: string, 
    interval: string, 
    limit: number = 500
  ): Promise<Kline[]> {
    logger.debug(`获取K线数据: ${symbol} ${interval} ${limit}`);
    return this.publicRequest<Kline[]>(`klines`, {
      symbol,
      interval,
      limit
    });
  }

  /**
   * 获取交易对信息
   */
  async getSymbolInfo(symbol: string): Promise<SymbolInfo | null> {
    logger.debug(`获取交易对信息: ${symbol}`);
    const symbols = await this.publicRequest<SymbolInfo[]>(`exchangeInfo`, {});
    
    // 修复：直接从数组中查找，而非访问symbols.symbols
    return symbols.find((s: SymbolInfo) => s.symbol === symbol) || null;
  }

  /**
   * 获取最新价格
   */
  async getLatestPrice(symbol: string): Promise<number> {
    logger.debug(`获取最新价格: ${symbol}`);
    const prices = await this.publicRequest<any[]>(`ticker/price`, { symbol });
    return parseFloat(prices[0]?.price || '0');
  }
}

// 导出市场API实例
export const marketApi = new MarketApi();
