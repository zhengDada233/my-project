// src/api/binance/base.ts
import { isElectronAPIAvailable, getElectronAPI } from '../electron.js';
import { logger } from '../../utils/logger.js';

// 定义Binance错误数据结构
export interface BinanceErrorData {
  code: number;
  msg: string;
}

// Binance API错误类
export class BinanceApiError extends Error {
  code: number;
  
  constructor(code: number, message: string) {
    super(message);
    this.name = 'BinanceApiError';
    this.code = code;
  }
}

// Binance API基础类
export class BinanceApiBase {
  protected baseUrl = 'https://api.binance.com/api/v3';

  /**
   * 发送带签名的请求（需要API密钥）
   */
  protected async signedRequest<T>(endpoint: string, params: any, apiKey: string, apiSecret: string): Promise<T> {
    if (!isElectronAPIAvailable()) {
      throw new Error('Electron API is not available');
    }

    try {
      logger.debug(`发送签名请求: ${endpoint}`, params);
      const response = await getElectronAPI().sendSignedRequest(
        { ...params, url: `${this.baseUrl}/${endpoint}` },
        apiKey,
        apiSecret
      );
      
      if (response.code) {
        throw new BinanceApiError(response.code, response.msg);
      }
      
      return response;
    } catch (error) {
      logger.error(`签名请求失败: ${endpoint}`, error);
      
      if (error instanceof BinanceApiError) {
        throw error;
      }
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new BinanceApiError(-1, errorMsg);
    }
  }

  /**
   * 发送公开请求（不需要API密钥）
   */
  protected async publicRequest<T>(endpoint: string, params: any = {}): Promise<T> {
    if (!isElectronAPIAvailable()) {
      throw new Error('Electron API is not available');
    }

    try {
      logger.debug(`发送公开请求: ${endpoint}`, params);
      const response = await getElectronAPI().sendPublicRequest(
        `${this.baseUrl}/${endpoint}`,
        params
      );
      
      if (response.code) {
        throw new BinanceApiError(response.code, response.msg);
      }
      
      return response;
    } catch (error) {
      logger.error(`公开请求失败: ${endpoint}`, error);
      
      if (error instanceof BinanceApiError) {
        throw error;
      }
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new BinanceApiError(-1, errorMsg);
    }
  }
}
