import { getAppName, getAppVersion, isDevelopment } from './env';
import { isElectronAPIAvailable, getElectronAPI } from '../api/electron';

export class Logger {
  private prefix: string;
  
  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}] ` : '';
    // 绑定this上下文
    this.info = this.info.bind(this);
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.debug = this.debug.bind(this);
  }
  
  /**
   * 记录信息日志
   * @param message 日志消息
   * @param data 附加数据
   */
  info(message: string, data?: any): void {
    const fullMessage = `${this.prefix}${message}`;
    
    // 控制台输出
    if (data) {
      console.info(fullMessage, data);
    } else {
      console.info(fullMessage);
    }
    
    // Electron日志
    if (isElectronAPIAvailable() && getElectronAPI().log) {
      getElectronAPI().log.info(fullMessage, data);
    }
  }
  
  /**
   * 记录错误日志
   * @param message 日志消息
   * @param error 错误对象
   */
  error(message: string, error?: any): void {
    const fullMessage = `${this.prefix}${message}`;
    
    // 控制台输出
    if (error) {
      console.error(fullMessage, error);
    } else {
      console.error(fullMessage);
    }
    
    // Electron日志
    if (isElectronAPIAvailable() && getElectronAPI().log) {
      getElectronAPI().log.error(fullMessage, error);
    }
  }
  
  /**
   * 记录警告日志
   * @param message 日志消息
   * @param data 附加数据
   */
  warn(message: string, data?: any): void {
    const fullMessage = `${this.prefix}${message}`;
    
    // 控制台输出
    if (data) {
      console.warn(fullMessage, data);
    } else {
      console.warn(fullMessage);
    }
    
    // Electron日志
    if (isElectronAPIAvailable() && getElectronAPI().log) {
      getElectronAPI().log.warn(fullMessage, data);
    }
  }
  
  /**
   * 记录调试日志（仅开发环境）
   * @param message 日志消息
   * @param data 附加数据
   */
  debug(message: string, data?: any): void {
    if (!isDevelopment()) return;
    
    const fullMessage = `${this.prefix}${message}`;
    
    // 控制台输出
    if (data) {
      console.debug(fullMessage, data);
    } else {
      console.debug(fullMessage);
    }
    
    // Electron日志
    if (isElectronAPIAvailable() && getElectronAPI().log) {
      getElectronAPI().log.debug(fullMessage, data);
    }
  }
}

// 创建默认日志实例
export const logger = new Logger();

// 应用启动日志
export class AppLogger extends Logger {
  constructor() {
    super('App');
    
    // 记录应用启动信息
    const envInfo = {
      development: isDevelopment(),
      version: getAppVersion()
    };
    
    this.info(`应用启动: ${getAppName()} v${getAppVersion()}`);
    this.info(`运行环境: ${isDevelopment() ? '开发' : '生产'}`);
    this.info('环境变量:', envInfo);
  }
}

// 初始化应用日志
export const appLogger = new AppLogger();
