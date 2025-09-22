/// <reference lib="dom" />
// src/utils/env.ts
/**
 * 环境变量工具（完整导出所有必要函数）
 */

// 环境检测
const isBrowser = (() => {
  try {
    return typeof window !== 'undefined' && typeof self !== 'undefined';
  } catch (e) {
    return false;
  }
})();

const isNode = (() => {
  try {
    return typeof process !== 'undefined' && 
           process.versions?.node != null &&
           typeof window === 'undefined';
  } catch (e) {
    return false;
  }
})();

// 获取应用名称
export function getAppName(): string {
  if (isBrowser) {
    // @ts-ignore
    return import.meta.env?.VITE_APP_NAME || '加密货币交易助手';
  } else if (isNode) {
    return process.env.VITE_APP_NAME || '加密货币交易助手';
  }
  return '加密货币交易助手';
}

// 获取应用版本
export function getAppVersion(): string {
  if (isBrowser) {
    // @ts-ignore
    return import.meta.env?.VITE_APP_VERSION || '1.0.0';
  } else if (isNode) {
    return process.env.VITE_APP_VERSION || '1.0.0';
  }
  return '1.0.0';
}

// 判断是否为开发环境（确保导出）
export function isDevelopment(): boolean {
  if (isBrowser) {
    // @ts-ignore
    return import.meta.env?.VITE_DEV || false;
  } else if (isNode) {
    return process.env.VITE_DEV === 'true' || false;
  }
  return false;
}

// 判断是否为生产环境（确保导出）
export function isProduction(): boolean {
  if (isBrowser) {
    // @ts-ignore
    return import.meta.env?.VITE_PROD || false;
  } else if (isNode) {
    return process.env.VITE_PROD === 'true' || false;
  }
  return false;
}

// 获取环境变量值
export function getEnvValue(key: string): string | undefined {
  if (isBrowser) {
    // @ts-ignore
    return import.meta.env?.[key] as string;
  } else if (isNode) {
    return process.env[key] as string;
  }
  return undefined;
}

// 获取所有环境变量信息
export function getEnvInfo(): Record<string, string> {
  const env: Record<string, string> = {};
  
  if (isBrowser) {
    // @ts-ignore
    const metaEnv = import.meta.env;
    if (metaEnv) {
      for (const key in metaEnv) {
        if (key.startsWith('VITE_')) {
          env[key] = metaEnv[key] as string;
        }
      }
    }
  } else if (isNode && process.env) {
    for (const key in process.env) {
      if (key.startsWith('VITE_')) {
        env[key] = process.env[key] as string;
      }
    }
  }
  
  return env;
}

// 导出环境信息对象
export const envInfo = getEnvInfo();
