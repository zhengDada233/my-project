// src/api/types.ts
/**
 * 共享类型定义
 */

// 日志API接口定义
export interface LogAPI {
  info: (...args: any[]) => Promise<void>;
  warn: (...args: any[]) => Promise<void>;
  error: (...args: any[]) => Promise<void>;
  debug: (...args: any[]) => Promise<void>;
}

// 交易订单参数类型
export interface OrderParams {
  symbol: string;
  type: 'limit' | 'market' | 'stop' | string;
  side: 'buy' | 'sell';
  quantity?: number;
  price?: number;
  [key: string]: any; // 允许其他参数
}

// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
}

// 交易策略配置类型
export interface StrategyConfig {
  symbol: string;
  interval: string;
  params: Record<string, any>;
}
