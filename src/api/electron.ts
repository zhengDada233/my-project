/// <reference lib="dom" />
// 强制引入DOM类型定义，解决window未定义问题

import { LogAPI } from './types';

// 完整的Electron API接口定义
export interface ElectronAPI {
  log: LogAPI;
  createOrder: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
  cancelOrder: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
  getAccountInfo: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
  sendSignedRequest: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
  sendPublicRequest: (endpoint: string, params: any) => Promise<any>;
  startTradingStrategy: (config: any) => Promise<{ success: boolean; message?: string }>;
  stopTradingStrategy: (symbol: string) => Promise<{ success: boolean; message?: string }>;
  getTradingStrategyStatus: (symbol: string) => Promise<any>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  restartAndUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (event: any, message: string) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// 全局声明window对象，确保TypeScript识别
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// 安全检查window是否存在的辅助函数
function hasWindow(): boolean {
  try {
    return typeof window !== 'undefined' && window !== null;
  } catch (e) {
    return false;
  }
}

// 检查Electron API是否可用
export function isElectronAPIAvailable(): boolean {
  if (!hasWindow()) return false;
  return !!window.electronAPI;
}

// 安全获取Electron API
export function getElectronAPI(): ElectronAPI {
  if (!hasWindow()) {
    throw new Error('window对象不存在，无法访问Electron API');
  }
  if (!window.electronAPI) {
    throw new Error('Electron API未定义');
  }
  return window.electronAPI;
}
