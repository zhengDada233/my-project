// src/middleware/env-check.ts
import { logger } from '../utils/logger';
// 修正：将 getEnv 改为实际存在的 getEnvValue
import { getEnvValue, isProduction, isDevelopment } from '../utils/env';

export const checkEnvironment = (): void => {
  // 示例：使用 getEnvValue 获取环境变量（根据实际业务逻辑调整）
  const apiUrl = getEnvValue('VITE_API_URL');
  
  if (isDevelopment()) {
    logger.info('运行在开发环境');
    if (!apiUrl) {
      logger.warn('开发环境中未配置 VITE_API_URL，可能导致API请求失败');
    }
  }
  
  if (isProduction()) {
    logger.info('运行在生产环境');
    if (!apiUrl) {
      logger.error('生产环境中必须配置 VITE_API_URL，请检查环境变量');
      throw new Error('缺少必要的环境变量 VITE_API_URL');
    }
  }
  
  // 其他环境检查逻辑...
};
