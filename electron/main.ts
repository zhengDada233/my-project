import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as log from 'electron-log';
import { TradingStrategy } from './strategy';

// 配置日志
log.transports.file.level = 'info';
log.transports.console.level = 'info';

// 存储运行中的策略
const runningStrategies: { [key: string]: TradingStrategy } = {};

// 创建窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // 加载应用
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }
}

// 策略相关IPC处理
ipcMain.handle('startTradingStrategy', async (_, config) => {
  try {
    if (runningStrategies[config.symbol]) {
      return { success: false, message: '策略已在运行' };
    }

    const strategy = new TradingStrategy(config);
    runningStrategies[config.symbol] = strategy;
    strategy.start();
    
    return { success: true };
  } catch (error) {
    log.error('启动策略失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '启动策略失败' 
    };
  }
});

ipcMain.handle('stopTradingStrategy', async (_, symbol) => {
  try {
    if (runningStrategies[symbol]) {
      runningStrategies[symbol].stop();
      delete runningStrategies[symbol];
      return { success: true };
    }
    return { success: false, message: '策略未在运行' };
  } catch (error) {
    log.error('停止策略失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '停止策略失败' 
    };
  }
});

ipcMain.handle('getTradingStrategyStatus', async (_, symbol) => {
  try {
    if (runningStrategies[symbol]) {
      return runningStrategies[symbol].getState();
    }
    return null;
  } catch (error) {
    log.error('获取策略状态失败:', error);
    throw error;
  }
});

// 应用生命周期
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 停止所有运行中的策略
  Object.values(runningStrategies).forEach(strategy => {
    strategy.stop();
  });
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 导出log供其他模块使用
export { log };
    