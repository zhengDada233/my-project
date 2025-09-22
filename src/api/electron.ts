// 定义Electron API接口
interface ElectronAPI {
  // 日志相关
  log: {
    info: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  };
  
  // 交易相关
  createOrder: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
  cancelOrder: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
  getAccountInfo: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
  
  // 公共请求
  sendPublicRequest: (url: string) => Promise<any>;
  sendSignedRequest: (url: string, params: any, apiKey: string, apiSecret: string) => Promise<any>;
  
  // 策略控制
  startTradingStrategy: (config: any) => Promise<{ success: boolean; message?: string }>;
  stopTradingStrategy: (symbol: string) => Promise<{ success: boolean; message?: string }>;
  getTradingStrategyStatus: (symbol: string) => Promise<any>;
}

// 扩展Window接口以包含electronAPI
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// 安全检查Electron API是否可用
export function isElectronAPIAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

// 安全获取Electron API
export function getElectronAPI(): ElectronAPI {
  if (!isElectronAPIAvailable()) {
    throw new Error('Electron API is not available');
  }
  return window.electronAPI!;
}
    