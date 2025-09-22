import { BinanceApiError } from './types';
import { logger } from '../../utils/logger';

export interface Order {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
}

export class TradeApi {
  // 创建订单
  async createOrder(
    params: any,
    apiKey: string,
    apiSecret: string
  ): Promise<Order> {
    if (!window.electronAPI) {
      throw new Error('Electron API is not available');
    }

    try {
      logger.info('创建订单:', { ...params, apiKey: '***' });
      const response = await window.electronAPI.createOrder({
        ...params,
        timestamp: Date.now()
      }, apiKey, apiSecret);
      
      if (response.code) {
        throw new BinanceApiError(response.code, response.msg);
      }
      
      logger.info('订单创建成功:', response);
      return response;
    } catch (error) {
      logger.error('创建订单失败:', error);
      
      if (error instanceof BinanceApiError) {
        // 处理Binance特定错误
        if (error.code === -2010) {
          throw new Error(`余额不足: ${error.msg}`);
        } else if (error.code === -1013) {
          throw new Error(`无效数量: ${error.msg}`);
        }
      }
      
      throw error;
    }
  }

  // 撤销订单
  async cancelOrder(
    symbol: string,
    orderId: number,
    apiKey: string,
    apiSecret: string
  ): Promise<Order> {
    const params = {
      symbol,
      orderId,
      timestamp: Date.now()
    };

    if (!window.electronAPI) {
      throw new Error('Electron API is not available');
    }

    try {
      logger.info(`撤销订单: ${symbol} #${orderId}`);
      const response = await window.electronAPI.cancelOrder(params, apiKey, apiSecret);
      
      if (response.code) {
        throw new BinanceApiError(response.code, response.msg);
      }
      
      return response;
    } catch (error) {
      logger.error(`撤销订单失败: ${symbol} #${orderId}`, error);
      throw error;
    }
  }

  // 获取账户信息
  async getAccountInfo(apiKey: string, apiSecret: string): Promise<any> {
    if (!window.electronAPI) {
      throw new Error('Electron API is not available');
    }

    try {
      logger.info('获取账户信息');
      const params = { timestamp: Date.now() };
      const response = await window.electronAPI.getAccountInfo(params, apiKey, apiSecret);
      
      if (response.code) {
        throw new BinanceApiError(response.code, response.msg);
      }
      
      return response;
    } catch (error) {
      logger.error('获取账户信息失败:', error);
      throw error;
    }
  }
}

export const tradeApi = new TradeApi();