// electron/preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ElectronAPI } from '../src/api/electron.js';

// 实现Electron API
const electronAPI: ElectronAPI = {
  log: {
    info: (...args: any[]) => ipcRenderer.invoke('log:info', ...args),
    warn: (...args: any[]) => ipcRenderer.invoke('log:warn', ...args),
    error: (...args: any[]) => ipcRenderer.invoke('log:error', ...args),
    debug: (...args: any[]) => ipcRenderer.invoke('log:debug', ...args),
  },
  createOrder: (params, apiKey, apiSecret) => 
    ipcRenderer.invoke('order:create', params, apiKey, apiSecret),
  cancelOrder: (params, apiKey, apiSecret) => 
    ipcRenderer.invoke('order:cancel', params, apiKey, apiSecret),
  getAccountInfo: (params, apiKey, apiSecret) => 
    ipcRenderer.invoke('account:info', params, apiKey, apiSecret),
  sendSignedRequest: (params, apiKey, apiSecret) => 
    ipcRenderer.invoke('request:signed', params, apiKey, apiSecret),
  sendPublicRequest: (endpoint, params) => 
    ipcRenderer.invoke('request:public', endpoint, params),
  startTradingStrategy: (config) => 
    ipcRenderer.invoke('strategy:start', config),
  stopTradingStrategy: (symbol) => 
    ipcRenderer.invoke('strategy:stop', symbol),
  getTradingStrategyStatus: (symbol) => 
    ipcRenderer.invoke('strategy:status', symbol),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  restartAndUpdate: () => ipcRenderer.invoke('update:restart'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update:status', (event: IpcRendererEvent, message: string) => {
      callback(event, message);
    });
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// 注入API到window对象
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
