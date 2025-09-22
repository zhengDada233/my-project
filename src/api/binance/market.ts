// 市场数据 API
import { BinanceApiBase } from './base';
import { ExchangeInfo, SymbolInfo, BinanceResponse } from './types';

export class MarketApi extends BinanceApiBase {
  // 获取交易所信息
  async getExchangeInfo(symbol?: string): Promise<ExchangeInfo> {
    const params: Record<string, any> = {};
    if (symbol) {
      params.symbol = symbol;
    }
    
    return this.publicRequest<ExchangeInfo>('exchangeInfo', params);
  }

  // 获取所有交易对信息
  async getAllSymbols(): Promise<SymbolInfo[]> {
    const info = await this.getExchangeInfo();
    return info.symbols;
  }

  // 获取特定交易对信息
  async getSymbolInfo(symbol: string): Promise<SymbolInfo | undefined> {
    const info = await this.getExchangeInfo();
    return info.symbols.find(s => s.symbol === symbol);
  }

  // 获取服务器时间
  async getServerTime(): Promise<number> {
    const response = await this.publicRequest<{ serverTime: number }>('time');
    return response.serverTime;
  }

  // Ping 测试
  async ping(): Promise<{}> {
    return this.publicRequest<{}>('ping');
  }
}

// 创建市场 API 实例
export const marketApi = new MarketApi();