interface EnvConfig {
  [key: string]: string;
}

/**
 * 获取环境变量
 * @param key 环境变量键名
 * @param defaultValue 默认值
 * @returns 环境变量值或默认值
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  return defaultValue;
}

/**
 * 检查是否为开发环境
 * @returns 是否为开发环境
 */
export function isDevelopment(): boolean {
  return getEnv('VITE_ENV') === 'development';
}

/**
 * 检查是否为生产环境
 * @returns 是否为生产环境
 */
export function isProduction(): boolean {
  return getEnv('VITE_ENV') === 'production';
}

/**
 * 获取应用名称
 * @returns 应用名称
 */
export function getAppName(): string {
  return getEnv('VITE_APP_NAME', '加密货币交易策略');
}

/**
 * 获取API基础URL
 * @returns API基础URL
 */
export function getApiBaseUrl(): string {
  return getEnv('VITE_API_URL', 'https://api.example.com');
}

/**
 * 获取所有环境变量
 * @returns 环境变量对象
 */
export function getAllEnv(): EnvConfig {
  const env: EnvConfig = {};
  
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    for (const key in import.meta.env) {
      if (import.meta.env[key]) {
        env[key] = import.meta.env[key] as string;
      }
    }
  }
  
  return env;
}

// 应用启动时记录环境信息
const envInfo = getAllEnv();
if (isDevelopment()) {
  console.log('当前环境变量:', envInfo);
}
    