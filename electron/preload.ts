import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// 定义更新相关类型
export interface UpdateInfo {
  version: string;
  releaseDate: string;
  changelog?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

// 定义Electron API接口
export interface ElectronAPI {
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  restartAndUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (event: IpcRendererEvent, message: string) => void) => void;
  onUpdateAvailable: (callback: (event: IpcRendererEvent, info: UpdateInfo) => void) => void;
  onUpdateNotAvailable: (callback: (event: IpcRendererEvent, info: UpdateInfo) => void) => void;
  onUpdateError: (callback: (event: IpcRendererEvent, message: string) => void) => void;
  onDownloadProgress: (callback: (event: IpcRendererEvent, progress: DownloadProgress) => void) => void;
  onUpdateDownloaded: (callback: (event: IpcRendererEvent, info: UpdateInfo) => void) => void;
  removeAllListeners: (channel: string) => void;
  sendSignedRequest: (params: any, apiKey: string, apiSecret: string) => Promise<any>;
  pingBinance: () => Promise<any>;
  diagnoseNetwork: () => Promise<any>;
  getExchangeInfo: (symbol: string) => Promise<any>;
}

// 实现Electron API
const electronAPI: ElectronAPI = {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  restartAndUpdate: () => ipcRenderer.invoke('restart-and-update'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  sendSignedRequest: (params, apiKey, apiSecret) => 
    ipcRenderer.invoke('send-signed-request', params, apiKey, apiSecret),
  pingBinance: () => ipcRenderer.invoke('ping-binance'),
  diagnoseNetwork: () => ipcRenderer.invoke('diagnose-network'),
  getExchangeInfo: (symbol) => ipcRenderer.invoke('get-exchange-info', symbol)
};

// 暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 扩展Window接口
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
    