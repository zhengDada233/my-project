import { BinanceApiError } from './types';

// 基础 API 类
export class BinanceApiBase {
  protected async signedRequest<T>(
    endpoint: string,
    params: Record<string, any>,
    apiKey: string,
    apiSecret: string
  ): Promise<T> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API is not available');
      }

      const response = await window.electronAPI.sendSignedRequest(params, apiKey, apiSecret);
      
      if (response.code && response.code < 0) {
        throw new BinanceApiError(response.code, response.msg || 'Unknown error');
      }
      
      return response as T;
    } catch (error) {
      console.error('Binance API request failed:', error);
      
      if (error instanceof BinanceApiError) {
        throw error;
      }
      
      throw new BinanceApiError(-1, error.message || 'Unknown error occurred');
    }
  }

  protected async publicRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      // 公共 API 不需要 Electron 环境，直接使用 fetch
      const queryString = new URLSearchParams(params).toString();
      const url = `https://api.binance.com/api/v3/${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error('Binance public API request failed:', error);
      throw new BinanceApiError(-1, error.message || 'Unknown error occurred');
    }
  }
}