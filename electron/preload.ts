import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 自动更新相关API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  restartAndUpdate: () => ipcRenderer.invoke('restart-and-update'),
  
  // 交易相关API
  sendSignedRequest: (params: any, apiKey: string, apiSecret: string) => 
    ipcRenderer.invoke('send-signed-request', params, apiKey, apiSecret),
  createOrder: (params: any, apiKey: string, apiSecret: string) => 
    ipcRenderer.invoke('create-order', params, apiKey, apiSecret),
  getAccountInfo: (apiKey: string, apiSecret: string) => 
    ipcRenderer.invoke('get-account-info', apiKey, apiSecret),
  
  // 市场数据API
  pingBinance: () => ipcRenderer.invoke('ping-binance'),
  getExchangeInfo: (symbol: string) => ipcRenderer.invoke('get-exchange-info'),
  getKlines: (symbol: string, interval: string, limit: number) => 
    ipcRenderer.invoke('get-klines', symbol, interval, limit),
  
  // 网络诊断
  diagnoseNetwork: () => ipcRenderer.invoke('diagnose-network'),
  
  // API验证
  validateApiCredentials: (apiKey: string, apiSecret: string) => 
    ipcRenderer.invoke('validate-api-credentials', apiKey, apiSecret),
  
  // 策略管理
  startTradingStrategy: (config: any) => ipcRenderer.invoke('start-trading-strategy', config),
  stopTradingStrategy: (symbol: string) => ipcRenderer.invoke('stop-trading-strategy', symbol),
  getStrategyStatus: (symbol: string) => ipcRenderer.invoke('get-strategy-status', symbol),
  
  // 日志功能
  log: {
    info: (message: string) => ipcRenderer.invoke('log-info', message),
    error: (message: string) => ipcRenderer.invoke('log-error', message),
    warn: (message: string) => ipcRenderer.invoke('log-warn', message),
    debug: (message: string) => ipcRenderer.invoke('log-debug', message)
  },
  
  // 日志查看功能
  getLogContent: () => ipcRenderer.invoke('get-log-content'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // 自动更新事件监听
  onUpdateStatus: (callback: (event: any, message: string) => void) => 
    ipcRenderer.on('update-status', callback),
  onUpdateAvailable: (callback: (event: any, info: any) => void) => 
    ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback: (event: any, info: any) => void) => 
    ipcRenderer.on('update-not-available', callback),
  onUpdateError: (callback: (event: any, message: string) => void) => 
    ipcRenderer.on('update-error', callback),
  onDownloadProgress: (callback: (event: any, progress: any) => void) => 
    ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => 
    ipcRenderer.on('update-downloaded', callback),
  
  // 移除事件监听器
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
});

// 添加类型定义
declare global {
  interface Window {
    electronAPI: {
      checkForUpdates: () => Promise<any>;
      restartAndUpdate: () => Promise<any>;
      sendSignedRequest: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
      createOrder: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
      getAccountInfo: (apiKey: string, apiSecret: string) => Promise<any>;
      pingBinance: () => Promise<any>;
      getExchangeInfo: (symbol: string) => Promise<any>;
      getKlines: (symbol: string, interval: string, limit: number) => Promise<any>;
      diagnoseNetwork: () => Promise<any>;
      validateApiCredentials: (apiKey: string, apiSecret: string) => Promise<any>;
      startTradingStrategy: (config: any) => Promise<any>;
      stopTradingStrategy: (symbol: string) => Promise<any>;
      getStrategyStatus: (symbol: string) => Promise<any>;
      log: {
        info: (message: string) => Promise<void>;
        error: (message: string) => Promise<void>;
        warn: (message: string) => Promise<void>;
        debug: (message: string) => Promise<void>;
      };
      getLogContent: () => Promise<string>;
      clearLogs: () => Promise<boolean>;
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      onUpdateStatus: (callback: (event: any, message: string) => void) => void;
      onUpdateAvailable: (callback: (event: any, info: any) => void) => void;
      onUpdateNotAvailable: (callback: (event: any, info: any) => void) => void;
      onUpdateError: (callback: (event: any, message: string) => void) => void;
      onDownloadProgress: (callback: (event: any, progress: any) => void) => void;
      onUpdateDownloaded: (callback: (event: any, info: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}