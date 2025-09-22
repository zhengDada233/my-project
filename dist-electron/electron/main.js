"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const log = __importStar(require("electron-log"));
exports.log = log;
const strategy_1 = require("./strategy");
// 配置日志
log.transports.file.level = 'info';
log.transports.console.level = 'info';
// 存储运行中的策略
const runningStrategies = {};
// 创建窗口
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    // 加载应用
    if (electron_1.app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    else {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
}
// 策略相关IPC处理
electron_1.ipcMain.handle('startTradingStrategy', async (_, config) => {
    try {
        if (runningStrategies[config.symbol]) {
            return { success: false, message: '策略已在运行' };
        }
        const strategy = new strategy_1.TradingStrategy(config);
        runningStrategies[config.symbol] = strategy;
        strategy.start();
        return { success: true };
    }
    catch (error) {
        log.error('启动策略失败:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '启动策略失败'
        };
    }
});
electron_1.ipcMain.handle('stopTradingStrategy', async (_, symbol) => {
    try {
        if (runningStrategies[symbol]) {
            runningStrategies[symbol].stop();
            delete runningStrategies[symbol];
            return { success: true };
        }
        return { success: false, message: '策略未在运行' };
    }
    catch (error) {
        log.error('停止策略失败:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '停止策略失败'
        };
    }
});
electron_1.ipcMain.handle('getTradingStrategyStatus', async (_, symbol) => {
    try {
        if (runningStrategies[symbol]) {
            return runningStrategies[symbol].getState();
        }
        return null;
    }
    catch (error) {
        log.error('获取策略状态失败:', error);
        throw error;
    }
});
// 应用生命周期
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    // 停止所有运行中的策略
    Object.values(runningStrategies).forEach(strategy => {
        strategy.stop();
    });
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map