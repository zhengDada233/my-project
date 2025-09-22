// 环境工具函数 - 不依赖 dotenv

// 获取环境变量
export const getEnv = (key: string, defaultValue: string = ''): string => {
  // 优先使用import.meta.env中的变量
  if (import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  
  // 其次使用process.env中的变量
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  
  return defaultValue;
};

// 检查是否是开发环境
export const isDevelopment = (): boolean => {
  return getEnv('NODE_ENV') === 'development';
};

// 检查是否是生产环境
export const isProduction = (): boolean => {
  return getEnv('NODE_ENV') === 'production';
};

// 获取API基础URL
export const getApiBaseUrl = (): string => {
  return getEnv('VITE_API_BASE_URL', 'https://api.binance.com');
};

// 获取WebSocket基础URL
export const getWsBaseUrl = (): string => {
  return getEnv('VITE_WS_BASE_URL', 'wss://stream.binance.com:9443');
};

// 获取应用名称
export const getAppName = (): string => {
  return getEnv('VITE_APP_NAME', 'BinanceTradingApp');
};

// 获取应用版本
export const getAppVersion = (): string => {
  return getEnv('VITE_APP_VERSION', '1.0.0');
};

// 是否启用调试模式
export const isDebugEnabled = (): boolean => {
  return getEnv('VITE_DEBUG', 'false') === 'true';
};

// 获取日志级别
export const getLogLevel = (): string => {
  return getEnv('VITE_LOG_LEVEL', 'info');
};

// 获取所有环境变量
export const getAllEnvVars = (): Record<string, string> => {
  const env: Record<string, string> = {};
  
  // 收集import.meta.env中的变量
  if (import.meta.env) {
    for (const key in import.meta.env) {
      if (import.meta.env[key]) {
        env[key] = import.meta.env[key] as string;
      }
    }
  }
  
  // 收集process.env中的变量
  if (typeof process !== 'undefined' && process.env) {
    for (const key in process.env) {
      if (process.env[key]) {
        env[key] = process.env[key] as string;
      }
    }
  }
  
  return env;
};

// 环境信息报告
export const getEnvReport = (): string => {
  const env = getAllEnvVars();
  const filteredEnv: Record<string, string> = {};
  
  // 过滤敏感信息
  for (const key in env) {
    if (key.includes('API') || key.includes('KEY') || key.includes('SECRET')) {
      filteredEnv[key] = '***REDACTED***';
    } else {
      filteredEnv[key] = env[key];
    }
  }
  
  return JSON.stringify(filteredEnv, null, 2);
};

// 创建默认环境配置
export const createDefaultEnvConfig = (): string => {
  return `# 默认环境配置 - 生产环境
NODE_ENV=production
VITE_APP_NAME=BinanceTradingApp
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.binance.com
VITE_WS_BASE_URL=wss://stream.binance.com:9443
VITE_DEBUG=false
VITE_LOG_LEVEL=info
`;
};