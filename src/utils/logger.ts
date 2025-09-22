import { getLogLevel, isDebugEnabled, isDevelopment } from './env';

// 日志级别枚举
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// 日志级别权重
const logLevelWeights = {
  [LogLevel.ERROR]: 4,
  [LogLevel.WARN]: 3,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 1
};

// 获取当前日志级别权重
const getCurrentLogLevelWeight = (): number => {
  const level = getLogLevel().toLowerCase();
  return logLevelWeights[level as LogLevel] || logLevelWeights[LogLevel.INFO];
};

// 检查是否应该记录日志
const shouldLog = (level: LogLevel): boolean => {
  const currentWeight = getCurrentLogLevelWeight();
  const targetWeight = logLevelWeights[level];
  return targetWeight >= currentWeight;
};

// 统一的日志工具
export const logger = {
  info: (message: string, ...args: any[]) => {
    if (!shouldLog(LogLevel.INFO)) return;
    
    const fullMessage = `${message} ${args.length ? JSON.stringify(args) : ''}`;
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.info(fullMessage);
    } else {
      console.log(`[INFO] ${new Date().toISOString()}: ${fullMessage}`);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (!shouldLog(LogLevel.ERROR)) return;
    
    const fullMessage = `${message} ${args.length ? JSON.stringify(args) : ''}`;
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.error(fullMessage);
    } else {
      console.error(`[ERROR] ${new Date().toISOString()}: ${fullMessage}`);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (!shouldLog(LogLevel.WARN)) return;
    
    const fullMessage = `${message} ${args.length ? JSON.stringify(args) : ''}`;
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.warn(fullMessage);
    } else {
      console.warn(`[WARN] ${new Date().toISOString()}: ${fullMessage}`);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (!shouldLog(LogLevel.DEBUG)) return;
    
    const fullMessage = `${message} ${args.length ? JSON.stringify(args) : ''}`;
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.debug(fullMessage);
    } else {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${fullMessage}`);
    }
  },
  
  // 环境信息日志
  logEnvironment: () => {
    if (!shouldLog(LogLevel.INFO)) return;
    
    const { getEnvReport, isDevelopment, isProduction, getAppName, getAppVersion } = require('./env');
    const envInfo = getEnvReport();
    
    this.info(`应用启动: ${getAppName()} v${getAppVersion()}`);
    this.info(`运行环境: ${isDevelopment() ? '开发' : isProduction() ? '生产' : '未知'}`);
    this.info('环境变量:', envInfo);
  }
};