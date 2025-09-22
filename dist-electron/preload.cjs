"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 暴露安全的API给渲染进程
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // 自动更新相关API
    checkForUpdates: () => electron_1.ipcRenderer.invoke('check-for-updates'),
    restartAndUpdate: () => electron_1.ipcRenderer.invoke('restart-and-update'),
    // 交易相关API
    sendSignedRequest: (params, apiKey, apiSecret) => electron_1.ipcRenderer.invoke('send-signed-request', params, apiKey, apiSecret),
    createOrder: (params, apiKey, apiSecret) => electron_1.ipcRenderer.invoke('create-order', params, apiKey, apiSecret),
    getAccountInfo: (apiKey, apiSecret) => electron_1.ipcRenderer.invoke('get-account-info', apiKey, apiSecret),
    // 市场数据API
    pingBinance: () => electron_1.ipcRenderer.invoke('ping-binance'),
    getExchangeInfo: (symbol) => electron_1.ipcRenderer.invoke('get-exchange-info'),
    getKlines: (symbol, interval, limit) => electron_1.ipcRenderer.invoke('get-klines', symbol, interval, limit),
    // 网络诊断
    diagnoseNetwork: () => electron_1.ipcRenderer.invoke('diagnose-network'),
    // API验证
    validateApiCredentials: (apiKey, apiSecret) => electron_1.ipcRenderer.invoke('validate-api-credentials', apiKey, apiSecret),
    // 策略管理
    startTradingStrategy: (config) => electron_1.ipcRenderer.invoke('start-trading-strategy', config),
    stopTradingStrategy: (symbol) => electron_1.ipcRenderer.invoke('stop-trading-strategy', symbol),
    getStrategyStatus: (symbol) => electron_1.ipcRenderer.invoke('get-strategy-status', symbol),
    // 日志功能
    log: {
        info: (message) => electron_1.ipcRenderer.invoke('log-info', message),
        error: (message) => electron_1.ipcRenderer.invoke('log-error', message),
        warn: (message) => electron_1.ipcRenderer.invoke('log-warn', message),
        debug: (message) => electron_1.ipcRenderer.invoke('log-debug', message)
    },
    // 日志查看功能
    getLogContent: () => electron_1.ipcRenderer.invoke('get-log-content'),
    clearLogs: () => electron_1.ipcRenderer.invoke('clear-logs'),
    // 应用信息
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    getPlatform: () => electron_1.ipcRenderer.invoke('get-platform'),
    // 自动更新事件监听
    onUpdateStatus: (callback) => electron_1.ipcRenderer.on('update-status', callback),
    onUpdateAvailable: (callback) => electron_1.ipcRenderer.on('update-available', callback),
    onUpdateNotAvailable: (callback) => electron_1.ipcRenderer.on('update-not-available', callback),
    onUpdateError: (callback) => electron_1.ipcRenderer.on('update-error', callback),
    onDownloadProgress: (callback) => electron_1.ipcRenderer.on('download-progress', callback),
    onUpdateDownloaded: (callback) => electron_1.ipcRenderer.on('update-downloaded', callback),
    // 移除事件监听器
    removeAllListeners: (channel) => electron_1.ipcRenderer.removeAllListeners(channel)
});
//# sourceMappingURL=preload.js.map