// Electron API 类型定义
export interface ElectronAPI {
  sendSignedRequest: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
  pingBinance: () => Promise<any>;
  diagnoseNetwork: () => Promise<any>;
  getExchangeInfo: (symbol: string) => Promise<any>;
}

// 全局声明
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// 检查 Electron API 是否可用
export const isElectronAPIAvailable = (): boolean => {
  return !!window.electronAPI;
};

// 获取 Electron API
export const getElectronAPI = (): ElectronAPI => {
  if (!window.electronAPI) {
    throw new Error('Electron API is not available. This function should only be called in an Electron environment.');
  }
  return window.electronAPI;
};