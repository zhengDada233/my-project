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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const electron_updater_1 = require("electron-updater");
const log = __importStar(require("electron-log"));
// 设置自动更新日志
electron_updater_1.autoUpdater.logger = log;
// 修复日志级别设置的类型问题
log.transports.file.level = 'info';
// 设置日志配置
log.transports.file.resolvePath = () => path.join(electron_1.app.getAppPath(), 'logs/main.log');
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
// 设置默认VITE_APP_ENV为production
process.env.VITE_APP_ENV = process.env.VITE_APP_ENV || 'production';
// 在开发环境中也输出到控制台
if (process.env.VITE_APP_ENV === 'development') {
    log.transports.console.level = 'debug';
}
else {
    // 生产环境可选择关闭控制台输出
    // (log.transports.console as any).level = false;
}
// 在应用启动日志中添加环境信息
log.info('=== 应用启动 ===');
log.info('运行环境:', process.env.VITE_APP_ENV);
log.info('应用版本:', electron_1.app.getVersion());
log.info('运行平台:', process.platform);
log.info('运行架构:', process.arch);
log.info('Node版本:', process.versions.node);
log.info('Chrome版本:', process.versions.chrome);
log.info('Electron版本:', process.versions.electron);
let TradingStrategy;
const activeStrategies = new Map();
let mainWindow = null;
function createWindow() {
    const preloadPath = process.env.VITE_APP_ENV === 'development'
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
    if (process.env.VITE_APP_ENV === 'development') {
        log.info('Development mode: loading from dev server');
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        const appPath = electron_1.app.getAppPath();
        log.info('Application path:', appPath);
        const possiblePaths = [
            path.join(appPath, 'dist', 'index.html'),
            path.join(appPath, '..', 'dist', 'index.html'),
            path.join(appPath, 'index.html'),
            path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.html'),
            path.join(process.resourcesPath, 'app', 'dist', 'index.html')
        ];
        let indexPath = '';
        let found = false;
        for (const possiblePath of possiblePaths) {
            log.info('Checking path:', possiblePath);
            if (fs.existsSync(possiblePath)) {
                indexPath = possiblePath;
                found = true;
                log.info('✓ Found index.html at:', indexPath);
                break;
            }
            else {
                log.info('✗ Not found:', possiblePath);
            }
        }
        if (found && mainWindow) {
            log.info('Loading index.html from:', indexPath);
            mainWindow.loadFile(indexPath)
                .then(() => {
                log.info('Page loaded successfully');
                mainWindow?.show();
            })
                .catch((error) => {
                log.error('Failed to load index.html:', error);
                if (mainWindow) {
                    showErrorPage(mainWindow, `Failed to load: ${error.message}\nPath: ${indexPath}`);
                }
            });
        }
        else {
            log.error('ERROR: index.html not found in any expected location');
            if (mainWindow) {
                showErrorPage(mainWindow, `index.html not found in any expected location.\n` +
                    `App path: ${appPath}\n` +
                    `Please check if the frontend was built correctly.`);
            }
        }
    }
    if (mainWindow) {
        mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
            log.error('Failed to load:', errorCode, errorDescription, validatedURL);
            if (errorDescription.includes('preload') && mainWindow) {
                showErrorPage(mainWindow, `预加载脚本加载失败: ${errorDescription}\n` +
                    `请检查预加载脚本路径: ${path.join(__dirname, 'preload.cjs')}\n` +
                    `文件是否存在: ${fs.existsSync(path.join(__dirname, 'preload.cjs'))}`);
            }
            else if (mainWindow) {
                showErrorPage(mainWindow, `Failed to load: ${errorDescription}\nURL: ${validatedURL}`);
            }
        });
        mainWindow.webContents.on('console-message', (_, level, message) => {
            log.info('DOM is ready');
        });
        mainWindow.webContents.on('did-finish-load', () => {
            log.info('Finished loading page');
        });
        mainWindow.webContents.on('console-message', (_, level, message) => {
            log.info(`Renderer console [${level}]:`, message);
        });
        mainWindow.once('ready-to-show', () => {
            log.info('Window is ready to show');
        });
        // 开发模式下禁用自动更新
        if (process.env.VITE_APP_ENV !== 'development') {
            // 初始化自动更新
            initAutoUpdater();
        }
    }
}
function initAutoUpdater() {
    // 配置GitHub更新源，使用类型断言解决headers类型问题
    electron_updater_1.autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'zhengDada233', // 替换为你的GitHub用户名
        repo: 'my-project', // 替换为你的仓库名称
        releaseType: 'release',
        // 添加更新请求的认证头，使用as any绕过类型检查
        headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}` // 从环境变量获取token
        }
    }); // 关键修复：添加类型断言
    // 设置自动更新检查频率（每小时一次）
    const updateInterval = setInterval(() => {
        electron_updater_1.autoUpdater.checkForUpdates();
    }, 60 * 60 * 1000);
    // 应用退出时清除定时器
    electron_1.app.on('quit', () => {
        clearInterval(updateInterval);
    });
    // 立即检查更新
    electron_updater_1.autoUpdater.checkForUpdates();
    // 监听更新事件
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        log.info('Checking for update...');
        mainWindow?.webContents.send('update-status', '正在检查更新...');
    });
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        log.info('Update available:', info.version);
        mainWindow?.webContents.send('update-available', info);
    });
    electron_updater_1.autoUpdater.on('update-not-available', (info) => {
        log.info('Update not available:', info);
        mainWindow?.webContents.send('update-not-available', info);
    });
    electron_updater_1.autoUpdater.on('error', (err) => {
        log.error('Error in auto-updater:', err);
        let errorMessage = err.message;
        // 处理认证错误
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = '更新验证失败，请检查认证信息';
        }
        mainWindow?.webContents.send('update-error', errorMessage);
    });
    electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
        let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
        log_message = `${log_message} - Downloaded ${progressObj.percent}%`;
        log_message = `${log_message} (${progressObj.transferred}/${progressObj.total})`;
        log.info(log_message);
        mainWindow?.webContents.send('download-progress', progressObj);
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded:', info);
        mainWindow?.webContents.send('update-downloaded', info);
        // 提示用户重启应用以完成更新
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
    // IPC通信处理
    electron_1.ipcMain.handle('check-for-updates', async (_event) => {
        try {
            return await electron_updater_1.autoUpdater.checkForUpdates();
        }
        catch (error) {
            log.error('检查更新失败:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('download-update', async (_event) => {
        try {
            // 触发检查更新，这将自动开始下载可用更新
            await electron_updater_1.autoUpdater.checkForUpdates();
        }
        catch (error) {
            log.error('下载更新失败:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('restart-and-update', async (_event) => {
        electron_updater_1.autoUpdater.quitAndInstall();
    });
}
function showErrorPage(window, message) {
    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Application Error</title>
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
          box-sizing: border-box;
        }
        .error-container { 
          text-align: center; 
          background: white; 
          padding: 2rem; 
          border-radius: 8px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 90%;
          max-height: 90vh;
          overflow: auto;
        }
        h2 {
          color: #d32f2f;
          margin-top: 0;
        }
        .error-message {
          background: #ffebee;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
          text-align: left;
          white-space: pre-wrap;
          font-family: monospace;
        }
        .tip {
          background: #e3f2fd;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h2>🚧 Application Error</h2>
        <div class="error-message">${message}</div>
        <div class="tip">
          <strong>Possible solutions:</strong>
          <ul>
            <li>Run <code>npm run build</code> to build the frontend</li>
            <li>Check if dist/ directory contains index.html</li>
            <li>Restart the application</li>
          </ul>
        </div>
        <p>Please check the terminal for detailed logs.</p>
      </div>
    </body>
    </html>
  `;
    window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    window.show();
}
function checkNetworkConnectivity() {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        socket.on('connect', () => {
            log.info('Network connectivity: OK');
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            log.info('Network connectivity: Timeout');
            socket.destroy();
            resolve(false);
        });
        socket.on('error', (error) => {
            log.info('Network connectivity: Error', error.message);
            socket.destroy();
            resolve(false);
        });
        socket.connect(80, '8.8.8.8');
    });
}
// 其他Binance相关API处理
electron_1.ipcMain.handle('send-signed-request', async (_event, params, apiKey, apiSecret) => {
    // 实现签名请求逻辑
    try {
        // 这里应该有实际的签名请求实现
        log.info('处理签名请求', params);
        return { success: true };
    }
    catch (error) {
        log.error('签名请求失败:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('ping-binance', async (_event) => {
    // 实现ping Binance的逻辑
    try {
        log.info('Ping Binance');
        return { success: true, timestamp: Date.now() };
    }
    catch (error) {
        log.error('Ping Binance失败:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('diagnose-network', async (_event) => {
    // 实现网络诊断逻辑
    try {
        const isConnected = await checkNetworkConnectivity();
        return {
            connected: isConnected,
            timestamp: Date.now(),
            host: '8.8.8.8'
        };
    }
    catch (error) {
        log.error('网络诊断失败:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('get-exchange-info', async (_event, symbol) => {
    // 实现获取交易所信息的逻辑
    try {
        log.info('获取交易所信息:', symbol);
        // 这里应该有实际的实现
        return { symbol, status: 'TRADING' };
    }
    catch (error) {
        log.error('获取交易所信息失败:', error);
        throw error;
    }
});
electron_1.app.whenReady().then(async () => {
    try {
        const isNetworkAvailable = await checkNetworkConnectivity();
        if (!isNetworkAvailable) {
            log.warn('Network connectivity issues detected');
        }
        createWindow();
        electron_1.app.on('activate', function () {
            log.info('App activated');
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    }
    catch (error) {
        log.error('创建窗口失败:', error);
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map