import { BinanceApiError } from './types';
import { isElectronAPIAvailable, getElectronAPI } from '../electron';

export class BinanceApiBase {
  private baseUrl = 'https://api.binance.com/api/v3/';

  // 公共请求（无需签名）
  async publicRequest<T>(endpoint: string, params: any = {}): Promise<T> {
    try {
      // 构建查询字符串
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
      
      // 检查是否在Electron环境中
      if (isElectronAPIAvailable()) {
        return getElectronAPI().sendPublicRequest(url);
      }
      
      // 非Electron环境下的处理（如浏览器）
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new BinanceApiError(
          errorData?.code || response.status,
          errorData?.msg || `HTTP error! status: ${response.status}`
        );
      }
      
      return response.json() as Promise<T>;
    } catch (error) {
      console.error('Binance API public request failed:', error);
      
      if (error instanceof BinanceApiError) {
        throw error;
      }
      
      // 处理未知错误类型
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BinanceApiError(-1, errorMsg);
    }
  }

  // 私有请求（需要签名）
  async signedRequest<T>(endpoint: string, params: any, apiKey: string, apiSecret: string): Promise<T> {
    try {
      if (!isElectronAPIAvailable()) {
        throw new Error('Electron API is not available for signed requests');
      }
      
      // 添加时间戳（如果不存在）
      if (!params.timestamp) {
        params.timestamp = Date.now();
      }
      
      return getElectronAPI().sendSignedRequest(
        `${this.baseUrl}${endpoint}`,
        params,
        apiKey,
        apiSecret
      );
    } catch (error) {
      console.error('Binance API signed request failed:', error);
      
      if (error instanceof BinanceApiError) {
        throw error;
      }
      
      // 处理未知错误类型
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BinanceApiError(-1, errorMsg);
    }
  }
}
    