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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const electron_updater_1 = require("electron-updater");
const log = __importStar(require("electron-log"));
// 导入package.json用于版本号同步
const package_json_1 = __importDefault(require("../package.json"));
// 设置自动更新日志
electron_updater_1.autoUpdater.logger = log;
log.transports.file.level = 'info';
// 设置日志配置
log.transports.file.resolvePath = () => path.join(electron_1.app.getAppPath(), 'logs/main.log');
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
// 设置默认NODE_ENV为production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
// 在开发环境中输出到控制台
if (process.env.NODE_ENV === 'development') {
    log.transports.console.level = 'debug';
}
// 应用启动日志（使用package.json中的版本号）
log.info('=== 应用启动 ===');
log.info('应用版本:', package_json_1.default.version);
log.info('运行环境:', process.env.NODE_ENV);
log.info('运行平台:', process.platform);
log.info('Node版本:', process.versions.node);
log.info('Electron版本:', process.versions.electron);
let TradingStrategy;
const activeStrategies = new Map();
let mainWindow = null;
function createWindow() {
    const preloadPath = process.env.NODE_ENV === 'development'
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, 'preload.cjs');
    mainWindow = new electron_1.BrowserWindow({
        height: 800,
        width: 1200,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath,
            webSecurity: false
        }
    });
    if (process.env.NODE_ENV === 'development') {
        log.info('开发模式: 从本地服务器加载');
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        const appPath = electron_1.app.getAppPath();
        log.info('应用路径:', appPath);
        // 可能的前端资源路径
        const possiblePaths = [
            path.join(appPath, 'dist', 'index.html'),
            path.join(appPath, '..', 'dist', 'index.html'),
            path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.html'),
            path.join(process.resourcesPath, 'app', 'dist', 'index.html')
        ];
        let indexPath = '';
        let found = false;
        for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
                indexPath = possiblePath;
                found = true;
                log.info('找到前端资源:', indexPath);
                break;
            }
        }
        if (found && mainWindow) {
            mainWindow.loadFile(indexPath)
                .then(() => {
                log.info('页面加载成功');
                mainWindow?.show();
            })
                .catch((error) => {
                log.error('页面加载失败:', error);
                mainWindow && showErrorPage(mainWindow, `加载失败: ${error.message}\n路径: ${indexPath}`);
            });
        }
        else {
            log.error('未找到前端资源');
            mainWindow && showErrorPage(mainWindow, `未找到index.html\n` +
                `应用路径: ${appPath}\n` +
                `请确认前端已正确构建`);
        }
    }
    if (mainWindow) {
        // 页面加载失败处理
        mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
            log.error('加载失败:', errorCode, errorDescription, validatedURL);
            if (errorDescription.includes('preload') && mainWindow) {
                showErrorPage(mainWindow, `预加载脚本错误: ${errorDescription}\n` +
                    `路径: ${preloadPath}\n` +
                    `存在: ${fs.existsSync(preloadPath)}`);
            }
            else if (mainWindow) {
                showErrorPage(mainWindow, `加载失败: ${errorDescription}\nURL: ${validatedURL}`);
            }
        });
        mainWindow.webContents.on('did-finish-load', () => {
            log.info('页面加载完成');
        });
        mainWindow.once('ready-to-show', () => {
            log.info('窗口准备就绪');
        });
        // 生产环境启用自动更新
        if (process.env.NODE_ENV !== 'development') {
            initAutoUpdater();
        }
    }
}
function initAutoUpdater() {
    // 配置GitHub更新源（使用package.json版本号）
    electron_updater_1.autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'zhengDada233',
        repo: 'my-project',
        releaseType: 'release',
        headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
        }
    });
    // 输出版本信息（与package.json同步）
    log.info(`当前版本: ${package_json_1.default.version}`);
    log.info(`更新源: https://github.com/zhengDada233/my-project`);
    // 每小时检查一次更新
    const updateInterval = setInterval(() => {
        electron_updater_1.autoUpdater.checkForUpdates();
    }, 60 * 60 * 1000);
    // 应用退出时清理定时器
    electron_1.app.on('quit', () => clearInterval(updateInterval));
    // 立即检查更新
    electron_updater_1.autoUpdater.checkForUpdates();
    // 更新事件监听
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        log.info('检查更新中...');
        mainWindow?.webContents.send('update-status', '正在检查更新...');
    });
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        log.info(`发现新版本: ${info.version}`);
        mainWindow?.webContents.send('update-available', info);
    });
    electron_updater_1.autoUpdater.on('update-not-available', (info) => {
        log.info('当前已是最新版本');
        mainWindow?.webContents.send('update-not-available', info);
    });
    electron_updater_1.autoUpdater.on('error', (err) => {
        log.error('更新错误:', err);
        let errorMessage = err.message;
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = '更新验证失败，请检查认证信息';
        }
        mainWindow?.webContents.send('update-error', errorMessage);
    });
    electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
        const progress = `下载进度: ${Math.round(progressObj.percent)}% (${progressObj.transferred}/${progressObj.total})`;
        log.info(progress);
        mainWindow?.webContents.send('download-progress', progressObj);
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        log.info(`更新已下载: ${info.version}`);
        mainWindow?.webContents.send('update-downloaded', info);
        if (mainWindow) {
            const dialogOpts = {
                type: 'info',
                buttons: ['重启', '稍后'],
                title: '应用更新',
                message: '新版本已下载完成',
                detail: '需要重启应用以完成更新。是否立即重启？'
            };
            electron_1.dialog.showMessageBox(mainWindow, dialogOpts).then((returnValue) => {
                if (returnValue.response === 0) {
                    electron_updater_1.autoUpdater.quitAndInstall();
                }
            });
        }
    });
    // IPC更新相关处理
    electron_1.ipcMain.handle('check-for-updates', async () => {
        try {
            return await electron_updater_1.autoUpdater.checkForUpdates();
        }
        catch (error) {
            log.error('检查更新失败:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('download-update', async () => {
        try {
            await electron_updater_1.autoUpdater.checkForUpdates();
        }
        catch (error) {
            log.error('下载更新失败:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('restart-and-update', async () => {
        electron_updater_1.autoUpdater.quitAndInstall();
    });
}
function showErrorPage(window, message) {
    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>应用错误</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: #f0f0f0; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0; 
          padding: 20px;
        }
        .error-container { 
          background: white; 
          padding: 2rem; 
          border-radius: 8px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 90%;
        }
        h2 { color: #d32f2f; margin-top: 0; }
        .error-message {
          background: #ffebee;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
          white-space: pre-wrap;
          font-family: monospace;
        }
        .tip {
          background: #e3f2fd;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h2>🚧 应用错误</h2>
        <div class="error-message">${message}</div>
        <div class="tip">
          <strong>可能的解决方案:</strong>
          <ul>
            <li>执行 <code>npm run build</code> 构建前端</li>
            <li>检查dist目录是否存在index.html</li>
            <li>重启应用</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
    window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    window.show();
}
// 网络连接检查
function checkNetworkConnectivity() {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(80, '8.8.8.8');
    });
}
// Binance相关API处理
electron_1.ipcMain.handle('send-signed-request', async (_event, params, apiKey, apiSecret) => {
    try {
        log.info('处理签名请求', params);
        return { success: true };
    }
    catch (error) {
        log.error('签名请求失败:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('ping-binance', async () => {
    try {
        log.info('Ping Binance');
        return { success: true, timestamp: Date.now() };
    }
    catch (error) {
        log.error('Ping失败:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('diagnose-network', async () => {
    try {
        const isConnected = await checkNetworkConnectivity();
        return { connected: isConnected, timestamp: Date.now() };
    }
    catch (error) {
        log.error('网络诊断失败:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('get-exchange-info', async (_event, symbol) => {
    try {
        log.info('获取交易所信息:', symbol);
        return { symbol, status: 'TRADING' };
    }
    catch (error) {
        log.error('获取信息失败:', error);
        throw error;
    }
});
// 应用生命周期
electron_1.app.whenReady().then(async () => {
    try {
        const isNetworkAvailable = await checkNetworkConnectivity();
        if (!isNetworkAvailable) {
            log.warn('网络连接异常');
        }
        createWindow();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    }
    catch (error) {
        log.error('启动失败:', error);
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map