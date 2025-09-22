// 交易 API
import { BinanceApiBase } from './base';
import { CreateOrderParams, Order, BinanceResponse } from './types';

export class TradeApi extends BinanceApiBase {
  // 创建订单
  async createOrder(
    params: CreateOrderParams,
    apiKey: string,
    apiSecret: string
  ): Promise<Order> {
    // 确保有时间戳
    const orderParams = {
      ...params,
      timestamp: params.timestamp || Date.now()
    };

    return this.signedRequest<Order>('order', orderParams, apiKey, apiSecret);
  }

  // 查询订单
  async getOrder(
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

    return this.signedRequest<Order>('order', params, apiKey, apiSecret);
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

    return this.signedRequest<Order>('order', params, apiKey, apiSecret);
  }

  // 获取当前所有订单
  async getOpenOrders(
    symbol: string,
    apiKey: string,
    apiSecret: string
  ): Promise<Order[]> {
    const params = {
      symbol,
      timestamp: Date.now()
    };

    return this.signedRequest<Order[]>('openOrders', params, apiKey, apiSecret);
  }
}

// 创建交易 API 实例
export const tradeApi = new TradeApi();