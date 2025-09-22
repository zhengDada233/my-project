// src/utils/env.ts
interface ImportMetaEnv {
  [key: string]: string | boolean | undefined;
  VITE_APP_NAME: string;
  VITE_APP_VERSION: string;
  VITE_DEV: boolean;
  VITE_PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * 获取应用名称
 */
export const getAppName = (): string => {
  return import.meta.env.VITE_APP_NAME || '加密货币交易助手';
};

/**
 * 获取应用版本号
 */
export const getAppVersion = (): string => {
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
};

/**
 * 检查是否为开发环境
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.VITE_DEV || false;
};

/**
 * 检查是否为生产环境
 */
export const isProduction = (): boolean => {
  return import.meta.env.VITE_PROD || false;
};

/**
 * 获取环境变量值
 */
export const getEnv = (key: string): string | undefined => {
  if (import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  return undefined;
};

/**
 * 获取所有环境变量
 */
export const getAllEnv = (): Record<string, string> => {
  const env: Record<string, string> = {};
  
  if (import.meta.env) {
    for (const key in import.meta.env) {
      if (import.meta.env[key]) {
        env[key] = import.meta.env[key] as string;
      }
    }
  }
  
  return env;
};

// 导出环境信息用于日志
export const envInfo = {
  appName: getAppName(),
  appVersion: getAppVersion(),
  isDevelopment: isDevelopment(),
  isProduction: isProduction()
};
    