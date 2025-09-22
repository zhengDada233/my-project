import { BinanceApiBase } from './base';
import { BinanceApiError } from './types';

export interface SymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  filters: any[];
}

export class MarketApi extends BinanceApiBase {
  // 获取交易对信息
  async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    try {
      const symbols = await this.publicRequest<SymbolInfo[]>('exchangeInfo', {});
      const symbolInfo = symbols.symbols.find(s => s.symbol === symbol);
      
      if (!symbolInfo) {
        throw new Error(`交易对 ${symbol} 不存在`);
      }
      
      return symbolInfo;
    } catch (error) {
      console.error(`获取交易对 ${symbol} 信息失败:`, error);
      throw error;
    }
  }

  // 获取K线数据
  async getKlines(symbol: string, interval: string, limit: number): Promise<any> {
    const params = { symbol, interval, limit };
    return this.publicRequest<any>('klines', params);
  }

  // 获取最新价格
  async getLatestPrice(symbol: string): Promise<number> {
    try {
      const prices = await this.publicRequest<any[]>('ticker/price', { symbol });
      return parseFloat(prices[0].price);
    } catch (error) {
      console.error(`获取 ${symbol} 最新价格失败:`, error);
      throw error;
    }
  }
}

export const marketApi = new MarketApi();
    