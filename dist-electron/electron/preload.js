"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// electron/preload.ts
const electron_1 = require("electron");
// 实现Electron API
const electronAPI = {
    log: {
        info: (...args) => electron_1.ipcRenderer.invoke('log:info', ...args),
        warn: (...args) => electron_1.ipcRenderer.invoke('log:warn', ...args),
        error: (...args) => electron_1.ipcRenderer.invoke('log:error', ...args),
        debug: (...args) => electron_1.ipcRenderer.invoke('log:debug', ...args),
    },
    createOrder: (params, apiKey, apiSecret) => electron_1.ipcRenderer.invoke('order:create', params, apiKey, apiSecret),
    cancelOrder: (params, apiKey, apiSecret) => electron_1.ipcRenderer.invoke('order:cancel', params, apiKey, apiSecret),
    getAccountInfo: (params, apiKey, apiSecret) => electron_1.ipcRenderer.invoke('account:info', params, apiKey, apiSecret),
    sendSignedRequest: (params, apiKey, apiSecret) => electron_1.ipcRenderer.invoke('request:signed', params, apiKey, apiSecret),
    sendPublicRequest: (endpoint, params) => electron_1.ipcRenderer.invoke('request:public', endpoint, params),
    startTradingStrategy: (config) => electron_1.ipcRenderer.invoke('strategy:start', config),
    stopTradingStrategy: (symbol) => electron_1.ipcRenderer.invoke('strategy:stop', symbol),
    getTradingStrategyStatus: (symbol) => electron_1.ipcRenderer.invoke('strategy:status', symbol),
    checkForUpdates: () => electron_1.ipcRenderer.invoke('update:check'),
    downloadUpdate: () => electron_1.ipcRenderer.invoke('update:download'),
    restartAndUpdate: () => electron_1.ipcRenderer.invoke('update:restart'),
    onUpdateStatus: (callback) => {
        electron_1.ipcRenderer.on('update:status', (event, message) => {
            callback(event, message);
        });
    },
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    }
};
// 注入API到window对象
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map