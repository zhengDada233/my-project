import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as net from 'net';
import { autoUpdater, UpdateCheckResult, UpdateInfo, ProgressInfo } from 'electron-updater';

import * as log from 'electron-log';
import { StrategyConfig, StrategyState } from './strategy-types';
// 导入package.json用于版本号同步
import packageJson from '../package.json';

// 设置自动更新日志
autoUpdater.logger = log;
(log.transports.file as any).level = 'info';

// 设置日志配置
log.transports.file.resolvePath = () => path.join(app.getAppPath(), 'logs/main.log');
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB

// 设置默认NODE_ENV为production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 在开发环境中输出到控制台
if (process.env.NODE_ENV === 'development') {
  (log.transports.console as any).level = 'debug';
}

// 应用启动日志（使用package.json中的版本号）
log.info('=== 应用启动 ===');
log.info('应用版本:', packageJson.version);
log.info('运行环境:', process.env.NODE_ENV);
log.info('运行平台:', process.platform);
log.info('Node版本:', process.versions.node);
log.info('Electron版本:', process.versions.electron);

let TradingStrategy: any;
const activeStrategies = new Map<string, any>();
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const preloadPath = process.env.NODE_ENV === 'development' 
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
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
  } else {
    const appPath = app.getAppPath();
    log.info('应用路径:', appPath);
    
    // 可能的前端资源路径
    const possiblePaths: string[] = [
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
    } else {
      log.error('未找到前端资源');
      mainWindow && showErrorPage(mainWindow, 
        `未找到index.html\n` +
        `应用路径: ${appPath}\n` +
        `请确认前端已正确构建`
      );
    }
  }

  if (mainWindow) {
    // 页面加载失败处理
    mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
      log.error('加载失败:', errorCode, errorDescription, validatedURL);
      
      if (errorDescription.includes('preload') && mainWindow) {
        showErrorPage(mainWindow, 
          `预加载脚本错误: ${errorDescription}\n` +
          `路径: ${preloadPath}\n` +
          `存在: ${fs.existsSync(preloadPath)}`
        );
      } else if (mainWindow) {
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

function initAutoUpdater(): void {
  // 配置GitHub更新源（使用package.json版本号）
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'zhengDada233',
    repo: 'my-project',
    releaseType: 'release',
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`
    }
  } as any);

  // 输出版本信息（与package.json同步）
  log.info(`当前版本: ${packageJson.version}`);
  log.info(`更新源: https://github.com/zhengDada233/my-project`);

  // 每小时检查一次更新
  const updateInterval = setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60 * 60 * 1000);

  // 应用退出时清理定时器
  app.on('quit', () => clearInterval(updateInterval));

  // 立即检查更新
  autoUpdater.checkForUpdates();

  // 更新事件监听
  autoUpdater.on('checking-for-update', () => {
    log.info('检查更新中...');
    mainWindow?.webContents.send('update-status', '正在检查更新...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info(`发现新版本: ${info.version}`);
    mainWindow?.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    log.info('当前已是最新版本');
    mainWindow?.webContents.send('update-not-available', info);
  });

  autoUpdater.on('error', (err: Error) => {
    log.error('更新错误:', err);
    let errorMessage = err.message;
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = '更新验证失败，请检查认证信息';
    }
    mainWindow?.webContents.send('update-error', errorMessage);
  });

  autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
    const progress = `下载进度: ${Math.round(progressObj.percent)}% (${progressObj.transferred}/${progressObj.total})`;
    log.info(progress);
    mainWindow?.webContents.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
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
      
      dialog.showMessageBox(mainWindow, dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    }
  });

  // IPC更新相关处理
  ipcMain.handle('check-for-updates', async (): Promise<UpdateCheckResult | null> => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('检查更新失败:', error);
      throw error;
    }
  });

  ipcMain.handle('download-update', async (): Promise<void> => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('下载更新失败:', error);
      throw error;
    }
  });

  ipcMain.handle('restart-and-update', async (): Promise<void> => {
    autoUpdater.quitAndInstall();
  });
}

function showErrorPage(window: BrowserWindow, message: string): void {
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
function checkNetworkConnectivity(): Promise<boolean> {
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
ipcMain.handle('send-signed-request', async (_event, params: any, apiKey: string, apiSecret: string) => {
  try {
    log.info('处理签名请求', params);
    return { success: true };
  } catch (error) {
    log.error('签名请求失败:', error);
    throw error;
  }
});

ipcMain.handle('ping-binance', async () => {
  try {
    log.info('Ping Binance');
    return { success: true, timestamp: Date.now() };
  } catch (error) {
    log.error('Ping失败:', error);
    throw error;
  }
});

ipcMain.handle('diagnose-network', async () => {
  try {
    const isConnected = await checkNetworkConnectivity();
    return { connected: isConnected, timestamp: Date.now() };
  } catch (error) {
    log.error('网络诊断失败:', error);
    throw error;
  }
});

ipcMain.handle('get-exchange-info', async (_event, symbol: string) => {
  try {
    log.info('获取交易所信息:', symbol);
    return { symbol, status: 'TRADING' };
  } catch (error) {
    log.error('获取信息失败:', error);
    throw error;
  }
});

// 应用生命周期
app.whenReady().then(async () => {
  try {
    const isNetworkAvailable = await checkNetworkConnectivity();
    if (!isNetworkAvailable) {
      log.warn('网络连接异常');
    }
    
    createWindow();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    log.error('启动失败:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
    