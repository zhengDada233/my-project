// src/middleware/env-check.ts
import { logger } from '../utils/logger';
import { getEnv, isProduction, isDevelopment } from '../utils/env';

export const checkEnvironment = (): void => {
  const nodeEnv = getEnv('NODE_ENV');
  const appName = getEnv('VITE_APP_NAME');
  const appVersion = getEnv('VITE_APP_VERSION');
  
  logger.info(`应用启动: ${appName} v${appVersion}`);
  logger.info(`运行环境: ${nodeEnv}`);
  
  if (!nodeEnv) {
    logger.warn('NODE_ENV 未设置，默认使用 production');
  }
  
  if (isDevelopment()) {
    logger.info('开发模式: 启用调试功能');
  } else if (isProduction()) {
    logger.info('生产模式: 优化性能和安全');
  } else {
    logger.warn(`未知环境: ${nodeEnv}`);
  }
  
  // 检查必要的环境变量
  const requiredVars = ['VITE_API_BASE_URL', 'VITE_WS_BASE_URL'];
  const missingVars = requiredVars.filter(varName => !getEnv(varName));
  
  if (missingVars.length > 0) {
    logger.warn(`缺少环境变量: ${missingVars.join(', ')}`);
    logger.info('使用默认值继续运行');
  }
};