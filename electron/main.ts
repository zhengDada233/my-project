import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as crypto from 'crypto';
import * as net from 'net';
import { autoUpdater } from 'electron-updater';

import * as log from 'electron-log';
import { StrategyConfig, StrategyState } from './strategy-types';

// 设置自动更新日志
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = 'info';

// 设置日志配置
log.transports.file.resolvePath = () => path.join(app.getAppPath(), 'logs/main.log');
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB

// 设置默认NODE_ENV为production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 在开发环境中也输出到控制台
if (process.env.NODE_ENV === 'development') {
  log.transports.console.level = 'debug';
} else {
  // log.transports.console.level = false; // 生产环境关闭控制台输出
}

// 在应用启动日志中添加环境信息
log.info('=== 应用启动 ===');
log.info('运行环境:', process.env.NODE_ENV);
log.info('应用版本:', app.getVersion());
log.info('运行平台:', process.platform);
log.info('运行架构:', process.arch);
log.info('Node版本:', process.versions.node);
log.info('Chrome版本:', process.versions.chrome);
log.info('Electron版本:', process.versions.electron);

let TradingStrategy: any;
const activeStrategies = new Map<string, any>();
let mainWindow: BrowserWindow;

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
    log.info('Development mode: loading from dev server');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const appPath = app.getAppPath();
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
      } else {
        log.info('✗ Not found:', possiblePath);
      }
    }

    if (found) {
      log.info('Loading index.html from:', indexPath);
      mainWindow.loadFile(indexPath)
        .then(() => {
          log.info('Page loaded successfully');
          mainWindow.show();
        })
        .catch((error) => {
          log.error('Failed to load index.html:', error);
          showErrorPage(mainWindow, `Failed to load: ${error.message}\nPath: ${indexPath}`);
        });
    } else {
      log.error('ERROR: index.html not found in any expected location');
      showErrorPage(mainWindow, 
        `index.html not found in any expected location.\n` +
        `App path: ${appPath}\n` +
        `Please check if the frontend was built correctly.`
      );
    }
  }

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    log.error('Failed to load:', errorCode, errorDescription, validatedURL);
    
    if (errorDescription.includes('preload')) {
      showErrorPage(mainWindow, 
        `预加载脚本加载失败: ${errorDescription}\n` +
        `请检查预加载脚本路径: ${path.join(__dirname, 'preload.cjs')}\n` +
        `文件是否存在: ${fs.existsSync(path.join(__dirname, 'preload.cjs'))}`
      );
    } else {
      showErrorPage(mainWindow, `Failed to load: ${errorDescription}\nURL: ${validatedURL}`);
    }
  });

  mainWindow.webContents.on('console-message', (_, level, message) => {
    log.info('DOM is ready');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Finished loading page');
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    log.info(`Renderer console [${level}]:`, message);
  });
  
  mainWindow.once('ready-to-show', () => {
    log.info('Window is ready to show');
  });

  // 开发模式下禁用自动更新
  if (process.env.NODE_ENV !== 'development') {
    // 初始化自动更新
    initAutoUpdater();
  }
}

function initAutoUpdater(): void {
  // 设置自动更新检查频率（每小时一次）
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60 * 60 * 1000);

  // 立即检查更新
  autoUpdater.checkForUpdates();

  // 监听更新事件
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    mainWindow.webContents.send('update-status', 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    mainWindow.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    mainWindow.webContents.send('update-not-available', info);
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    mainWindow.webContents.send('update-error', err.message);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
    log_message = `${log_message} - Downloaded ${progressObj.percent}%`;
    log_message = `${log_message} (${progressObj.transferred}/${progressObj.total})`;
    log.info(log_message);
    mainWindow.webContents.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    mainWindow.webContents.send('update-downloaded', info);
    
    // 提示用户重启应用以完成更新
    const dialogOpts = {
      type: 'info',
      buttons: ['重启', '稍后'],
      title: '应用更新',
      message: '新版本已下载完成',
      detail: '需要重启应用以完成更新。是否立即重启？'
    };
    
    // 注意：这里需要使用 dialog 模块，需要先导入
    import('electron').then(({ dialog }) => {
      dialog.showMessageBox(mainWindow, dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  });
}

function showErrorPage(window: BrowserWindow, message: string) {
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

function checkNetworkConnectivity(): Promise<boolean> {
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

app.whenReady().then(async () => {
  try {
    const isNetworkAvailable = await checkNetworkConnectivity();
    if (!isNetworkAvailable) {
      log.warn('Network connectivity issues detected');
    }
    
    createWindow();
    
    app.on('activate', function () {
      log.info('App activated');
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    log.error('创建目录失败:', error);
  }
});

app.on('window-all-closed', () => {
  log.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('App is about to quit');
});

// 添加自动更新相关的 IPC 处理
ipcMain.handle('check-for-updates', () => {
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdates();
  }
});

ipcMain.handle('restart-and-update', () => {
  autoUpdater.quitAndInstall();
});

// 处理签名请求
ipcMain.handle('send-signed-request', async (_, params: any, apiKey: string, apiSecret: string) => {
  log.info('=== Processing Signed Request ===');
  log.info('API Key:', apiKey ? 'Provided' : 'Missing');
  log.info('API Secret:', apiSecret ? 'Provided' : 'Missing');
  log.info('Request params:', JSON.stringify(params, null, 2));

  return new Promise((resolve, reject) => {
    try {
      if (!params.timestamp) {
        params.timestamp = Date.now().toString();
        log.info('Added timestamp:', params.timestamp);
      }

      const queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${encodeURIComponent((params as Record<string, string>)[key])}`)
        .join('&');
      
      log.info('Query string:', queryString);
      
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(queryString)
        .digest('hex');

      log.info('Generated signature:', signature);

      const signedQueryString = `${queryString}&signature=${encodeURIComponent(signature)}`;
      
      log.info('Final request data:', signedQueryString);
      
      const options: https.RequestOptions = {
        hostname: 'api.binance.com',
        port: 443,
        path: '/api/v3/order',
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(signedQueryString),
          'User-Agent': 'BinanceElectronApp/1.0.0'
        },
        timeout: 30000
      };

      log.info('Request options:', JSON.stringify(options, null, 2));

      const req = https.request(options, (res) => {
        log.info('Response received. Status:', res.statusCode);
        log.info('Response headers:', JSON.stringify(res.headers, null, 2));

        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        
        res.on('end', () => {
          log.info('Response data:', data);
          try {
            const parsedData = JSON.parse(data);
            log.info('Parsed response:', JSON.stringify(parsedData, null, 2));
            resolve(parsedData);
          } catch (error) {
            log.warn('Failed to parse JSON response, returning raw data');
            resolve(data);
          }
        });
      });

      req.setTimeout(30000, () => {
        log.error('Request timeout after 30 seconds');
        req.destroy();
        reject(new Error('Request timeout to Binance API'));
      });

      req.on('error', (error: Error) => {
        log.error('Request error:', error.message);
        log.error('Error code:', (error as any).code);
        
        if (error.message.includes('ECONNREFUSED')) {
          reject(new Error('无法连接到Binance API。请检查网络连接和VPN设置。'));
        } else if (error.message.includes('CERT_HAS_EXPIRED')) {
          reject(new Error('SSL证书错误。请检查系统日期和时间设置。'));
        } else {
          reject(error);
        }
      });

      log.info('Sending request to Binance API...');
      req.write(signedQueryString);
      req.end();

    } catch (error) {
      log.error('Error processing request:', error);
      reject(error);
    }
  });
});

// 添加一个简单的ping端点用于测试
ipcMain.handle('ping-binance', async () => {
  return new Promise((resolve, reject) => {
    const req = https.get('https://api.binance.com/api/v3/ping', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Ping timeout'));
    });
  });
});

ipcMain.handle('get-exchange-info', async (event, symbol: string) => {
  return new Promise((resolve, reject) => {
    const req = https.get(`https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
});

// 添加验证 API 密钥的端点
ipcMain.handle('validate-api-credentials', async (event: Electron.IpcMainInvokeEvent, apiKey: string, apiSecret: string) => {
  log.info('=== 验证 API 凭证 ===');
  
  return new Promise((resolve, reject) => {
    try {
      const params = {
        timestamp: Date.now().toString(),
        recvWindow: '60000'
      };
      
      const queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${encodeURIComponent((params as Record<string, string>)[key])}`)
        .join('&');
      
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(queryString)
        .digest('hex');

      const signedQueryString = `${queryString}&signature=${encodeURIComponent(signature)}`;
      
      const pathWithQuery = `/api/v3/account?${signedQueryString}`;
      
      const options: https.RequestOptions = {
        hostname: 'api.binance.com',
        port: 443,
        path: pathWithQuery,
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'User-Agent': 'BinanceElectronApp/1.0.0'
        },
        timeout: 30000
      };

      const req = https.request(options, (res) => {
        log.info('验证响应. 状态:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        
        res.on('end', () => {
          log.info('验证响应数据:', data);
          
          if (res.statusCode === 200) {
            resolve({ valid: true, message: 'API 凭证有效' });
          } else {
            try {
              const parsedData = JSON.parse(data);
              let errorMessage = parsedData.msg || `API 验证失败 (状态码: ${res.statusCode})`;
              
              // 提供更详细的错误信息
              if (parsedData.code === -2014) {
                errorMessage = 'API Key 无效。请检查您的 API Key 是否正确，并确保它在 Binance 账户中已启用。';
              } else if (parsedData.code === -2015) {
                errorMessage = 'API Secret 无效。请检查您的 API Secret 是否正确。';
              } else if (parsedData.code === -2027) {
                errorMessage = 'IP 地址不在白名单中。请将当前 IP 地址添加到您的 API Key 白名单中。';
              }
              
              resolve({ valid: false, message: errorMessage });
            } catch (error) {
              resolve({ valid: false, message: `API 验证失败 (状态码: ${res.statusCode})` });
            }
          }
        });
      });

      req.setTimeout(30000, () => {
        log.error('验证请求超时 (30秒)');
        req.destroy();
        resolve({ valid: false, message: '验证请求超时，请检查网络连接' });
      });

      req.on('error', (error: Error) => {
        log.error('验证请求错误:', error.message);
        resolve({ valid: false, message: `网络错误: ${error.message}` });
      });

      log.info('发送验证请求到 Binance API...');
      req.end();

    } catch (error) {
      log.error('验证凭证错误:', error);
      reject(error);
    }
  });
});

// 在 electron/main.ts 中修改 start-trading-strategy IPC 处理程序
ipcMain.handle('start-trading-strategy', async (event, config: StrategyConfig) => {
  try {
    if (!TradingStrategy) {
      try {
        const { app } = require('electron');
        const path = require('path');
        const fs = require('fs');
        
        const strategyPath = path.join(app.getAppPath(), 'dist-electron', 'strategy.cjs');
        log.info('策略模块路径:', strategyPath);
        
        if (!fs.existsSync(strategyPath)) {
          throw new Error(`策略文件不存在于路径: ${strategyPath}`);
        }
        
        const strategyModule = require(strategyPath);
        TradingStrategy = strategyModule.default || strategyModule.TradingStrategy || strategyModule;
        
        if (!TradingStrategy) {
          throw new Error('无法从策略模块中识别出 TradingStrategy 类');
        }
        
        log.info('策略模块加载成功');
      } catch (requireError) {
        log.error('Require 策略模块失败:', requireError);
        
        let errorMessage = '未知错误';
        if (requireError instanceof Error) {
          errorMessage = requireError.message;
        } else if (typeof requireError === 'string') {
          errorMessage = requireError;
        } else {
          errorMessage = JSON.stringify(requireError);
        }
        
        return { 
          success: false, 
          message: `无法加载交易策略模块: ${errorMessage}` 
        };
      }
    }
    
    const strategy = new TradingStrategy(config);
    await strategy.start();
    
    activeStrategies.set(config.symbol, strategy);
    
    return { success: true, message: '策略启动成功' };
  } catch (error) {
    log.error('启动策略失败:', error);
    
    let errorMessage = '未知错误';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = JSON.stringify(error);
    }
    
    return { 
      success: false, 
      message: `启动策略失败: ${errorMessage}` 
    };
  }
});

ipcMain.handle('stop-trading-strategy', async (event, symbol: string) => {
  try {
    const strategy = activeStrategies.get(symbol);
    if (strategy) {
      strategy.stop();
      activeStrategies.delete(symbol);
      return { success: true, message: '策略已停止' };
    } else {
      return { success: false, message: '未找到活动的策略' };
    }
  } catch (error) {
    log.error('停止策略失败:', error);
    return { 
      success: false, 
      message: `停止策略失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
});

ipcMain.handle('get-strategy-status', async (event, symbol: string) => {
  try {
    const strategy = activeStrategies.get(symbol);
    if (strategy) {
      const status: StrategyState = strategy.getState();
      return { success: true, status };
    } else {
      return { success: false, message: '未找到活动的策略' };
    }
  } catch (error) {
    log.error('获取策略状态失败:', error);
    return { 
      success: false, 
      message: `获取策略状态失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
});

// 添加日志IPC处理
ipcMain.handle('log-info', (_, message: string) => {
  log.info('Renderer: ' + message);
});

ipcMain.handle('log-error', (_, message: string) => {
  log.error('Renderer: ' + message);
});

ipcMain.handle('log-warn', (_, message: string) => {
  log.warn('Renderer: ' + message);
});

ipcMain.handle('log-debug', (_, message: string) => {
  log.debug('Renderer: ' + message);
});

// 创建日志查看功能
const createLogger = () => {
  const appDataPath = app.getPath('userData');
  const logDir = path.join(appDataPath, 'logs');
  const logPath = path.join(logDir, 'app.log');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  return {
    info: (message: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] INFO: ${message} ${args.length ? JSON.stringify(args) : ''}\n`;
      
      console.log(logMessage);
      fs.appendFileSync(logPath, logMessage);
    },
    
    error: (message: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ERROR: ${message} ${args.length ? JSON.stringify(args) : ''}\n`;
      
      console.error(logMessage);
      fs.appendFileSync(logPath, logMessage);
    },
    
    warn: (message: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] WARN: ${message} ${args.length ? JSON.stringify(args) : ''}\n`;
      
      console.warn(logMessage);
      fs.appendFileSync(logPath, logMessage);
    },
    
    debug: (message: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] DEBUG: ${message} ${args.length ? JSON.stringify(args) : ''}\n`;
      
      console.debug(logMessage);
      fs.appendFileSync(logPath, logMessage);
    },
    
    getLogPath: () => logPath
  };
};

const logger = createLogger();

ipcMain.handle('get-log-content', async () => {
  try {
    const logPath = logger.getLogPath();
    if (fs.existsSync(logPath)) {
      return fs.readFileSync(logPath, 'utf-8');
    }
    return '日志文件不存在';
  } catch (error) {
    logger.error('读取日志文件失败:', error);
    return `读取日志文件失败: ${error instanceof Error ? error.message : String(error)}`;
  }
});

ipcMain.handle('clear-logs', async () => {
  try {
    const logPath = logger.getLogPath();
    if (fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '');
      return true;
    }
    return false;
  } catch (error) {
    logger.error('清空日志文件失败:', error);
    return false;
  }
});

// 创建订单
ipcMain.handle('create-order', async (event, params: any, apiKey: string, apiSecret: string) => {
  log.info('=== 创建订单 ===');
  log.info('订单参数:', JSON.stringify(params, null, 2));
  
  return new Promise((resolve, reject) => {
    try {
      // 确保参数包含timestamp
      if (!params.timestamp) {
        params.timestamp = Date.now().toString();
        log.info('添加时间戳:', params.timestamp);
      }

      // 创建查询字符串并按照字母顺序排序参数
      const queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${encodeURIComponent((params as Record<string, string>)[key])}`)
        .join('&');
      
      log.info('查询字符串:', queryString);
      
      // 使用API Secret创建HMAC-SHA256签名
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(queryString)
        .digest('hex');

      log.info('生成签名:', signature);

      // 将签名附加到查询字符串
      const signedQueryString = `${queryString}&signature=${encodeURIComponent(signature)}`;
      
      log.info('最终请求数据:', signedQueryString);
      
      const options: https.RequestOptions = {
        hostname: 'api.binance.com',
        port: 443,
        path: '/api/v3/order',
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(signedQueryString),
          'User-Agent': 'BinanceElectronApp/1.0.0'
        },
        timeout: 30000
      };

      log.info('请求选项:', JSON.stringify(options, null, 2));

      const req = https.request(options, (res) => {
        log.info('响应接收. 状态:', res.statusCode);
        log.info('响应头:', JSON.stringify(res.headers, null, 2));

        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        
        res.on('end', () => {
          log.info('响应数据:', data);
          try {
            const parsedData = JSON.parse(data);
            log.info('解析响应:', JSON.stringify(parsedData, null, 2));
            
            // 检查API错误
            if (parsedData.code) {
              log.error('Binance API错误:', parsedData.msg, `(代码: ${parsedData.code})`);
              reject(new Error(`Binance API错误: ${parsedData.msg} (代码: ${parsedData.code})`));
            } else {
              resolve(parsedData);
            }
          } catch (error) {
            log.warn('解析JSON响应失败，返回原始数据');
            resolve(data);
          }
        });
      });

      req.setTimeout(30000, () => {
        log.error('请求超时 (30秒)');
        req.destroy();
        reject(new Error('请求Binance API超时'));
      });

      req.on('error', (error: Error) => {
        log.error('请求错误:', error.message);
        log.error('错误代码:', (error as any).code);
        
        if (error.message.includes('ECONNREFUSED')) {
          reject(new Error('无法连接到Binance API。请检查网络连接和VPN设置。'));
        } else if (error.message.includes('CERT_HAS_EXPIRED')) {
          reject(new Error('SSL证书错误。请检查系统日期和时间设置。'));
        } else {
          reject(error);
        }
      });

      log.info('发送请求到Binance API...');
      req.write(signedQueryString);
      req.end();

    } catch (error) {
      log.error('处理请求错误:', error);
      reject(error);
    }
  });
});

// 获取账户信息
ipcMain.handle('get-account-info', async (event, apiKey: string, apiSecret: string) => {
  log.info('=== 获取账户信息 ===');
  
  return new Promise((resolve, reject) => {
    try {
      const params = {
        timestamp: Date.now().toString(),
        recvWindow: '60000'
      };
      
      // 创建查询字符串
      const queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${encodeURIComponent((params as Record<string, string>)[key])}`)
        .join('&');
      
      // 使用API Secret创建HMAC-SHA256签名
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(queryString)
        .digest('hex');

      // 将签名附加到查询字符串
      const signedQueryString = `${queryString}&signature=${encodeURIComponent(signature)}`;
      
      // 将查询字符串附加到路径上
      const pathWithQuery = `/api/v3/account?${signedQueryString}`;
      
      const options: https.RequestOptions = {
        hostname: 'api.binance.com',
        port: 443,
        path: pathWithQuery,
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'User-Agent': 'BinanceElectronApp/1.0.0'
        },
        timeout: 30000
      };

      const req = https.request(options, (res) => {
        log.info('账户信息响应. 状态:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        
        res.on('end', () => {
          log.info('账户信息响应数据:', data);
          
          if (res.statusCode === 200) {
            try {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
            } catch (error) {
              reject(error);
            }
          } else {
            try {
              const parsedData = JSON.parse(data);
              reject(new Error(`获取账户信息失败: ${parsedData.msg || '未知错误'} (状态码: ${res.statusCode})`));
            } catch (error) {
              reject(new Error(`获取账户信息失败 (状态码: ${res.statusCode})`));
            }
          }
        });
      });

      req.setTimeout(30000, () => {
        log.error('账户信息请求超时 (30秒)');
        req.destroy();
        reject(new Error('获取账户信息请求超时'));
      });

      req.on('error', (error: Error) => {
        log.error('账户信息请求错误:', error.message);
        reject(error);
      });

      log.info('发送账户信息请求到Binance API...');
      req.end();

    } catch (error) {
      log.error('获取账户信息错误:', error);
      reject(error);
    }
  });
});

// 获取K线数据
ipcMain.handle('get-klines', async (event, symbol: string, interval: string, limit: number) => {
  log.info(`获取K线数据: ${symbol}, 间隔: ${interval}, 数量: ${limit}`);
  
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('获取K线数据请求超时'));
    });
  });
});

// 获取应用版本
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 获取平台信息
ipcMain.handle('get-platform', () => {
  return process.platform;
});