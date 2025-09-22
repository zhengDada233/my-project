// src/api/binance/index.ts
export * from './types';
export * from './base';
export * from './market';
export * from './trade';
export * from './strategy'; // 新增导出

// 统一导出所有 API 实例
import { marketApi } from './market';
import { tradeApi } from './trade';

export { marketApi, tradeApi };

// 确保 BinanceApiError 也被导出
export { BinanceApiError } from './types';