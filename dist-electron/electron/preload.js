"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 实现Electron API
const electronAPI = {
    checkForUpdates: () => electron_1.ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => electron_1.ipcRenderer.invoke('download-update'),
    restartAndUpdate: () => electron_1.ipcRenderer.invoke('restart-and-update'),
    onUpdateStatus: (callback) => electron_1.ipcRenderer.on('update-status', callback),
    onUpdateAvailable: (callback) => electron_1.ipcRenderer.on('update-available', callback),
    onUpdateNotAvailable: (callback) => electron_1.ipcRenderer.on('update-not-available', callback),
    onUpdateError: (callback) => electron_1.ipcRenderer.on('update-error', callback),
    onDownloadProgress: (callback) => electron_1.ipcRenderer.on('download-progress', callback),
    onUpdateDownloaded: (callback) => electron_1.ipcRenderer.on('update-downloaded', callback),
    removeAllListeners: (channel) => electron_1.ipcRenderer.removeAllListeners(channel),
    sendSignedRequest: (params, apiKey, apiSecret) => electron_1.ipcRenderer.invoke('send-signed-request', params, apiKey, apiSecret),
    pingBinance: () => electron_1.ipcRenderer.invoke('ping-binance'),
    diagnoseNetwork: () => electron_1.ipcRenderer.invoke('diagnose-network'),
    getExchangeInfo: (symbol) => electron_1.ipcRenderer.invoke('get-exchange-info', symbol)
};
// 暴露API给渲染进程
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map