// src/utils/logger.ts
import { getAppName, getAppVersion, isDevelopment, getEnvInfo } from './env.js';
import { isElectronAPIAvailable, getElectronAPI } from '../api/electron.js';

export class Logger {
  constructor() {
    this.initialize();
  }

  private initialize() {
    // 绑定this上下文
    this.info = this.info.bind(this);
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.debug = this.debug.bind(this);

    // 记录应用启动信息
    this.info(`应用启动: ${getAppName()} v${getAppVersion()}`);
    this.info(`运行环境: ${isDevelopment() ? '开发' : '生产'}`);
    this.info('环境变量:', getEnvInfo());
  }

  /**
   * 记录信息日志
   */
  info(message: string, data?: any) {
    const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
    console.log(`[INFO] ${new Date().toISOString()} ${fullMessage}`);
    
    // 使用统一的API访问方式
    if (isElectronAPIAvailable()) {
      getElectronAPI().log.info(fullMessage);
    }
  }

  /**
   * 记录错误日志
   */
  error(message: string, data?: any) {
    const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
    console.error(`[ERROR] ${new Date().toISOString()} ${fullMessage}`);
    
    if (isElectronAPIAvailable()) {
      getElectronAPI().log.error(fullMessage);
    }
  }

  /**
   * 记录警告日志
   */
  warn(message: string, data?: any) {
    const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
    console.warn(`[WARN] ${new Date().toISOString()} ${fullMessage}`);
    
    if (isElectronAPIAvailable()) {
      getElectronAPI().log.warn(fullMessage);
    }
  }

  /**
   * 记录调试日志
   */
  debug(message: string, data?: any) {
    const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
    console.debug(`[DEBUG] ${new Date().toISOString()} ${fullMessage}`);
    
    if (isElectronAPIAvailable()) {
      getElectronAPI().log.debug(fullMessage);
    }
  }
}

// 导出单例实例
export const logger = new Logger();
