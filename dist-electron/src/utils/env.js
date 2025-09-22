"use strict";
// 环境工具函数 - 不依赖 dotenv
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultEnvConfig = exports.getEnvReport = exports.getAllEnvVars = exports.getLogLevel = exports.isDebugEnabled = exports.getAppVersion = exports.getAppName = exports.getWsBaseUrl = exports.getApiBaseUrl = exports.isProduction = exports.isDevelopment = exports.getEnv = void 0;
// 获取环境变量
const getEnv = (key, defaultValue = '') => {
    // 优先使用import.meta.env中的变量
    if (import.meta.env[key]) {
        return import.meta.env[key];
    }
    // 其次使用process.env中的变量
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    return defaultValue;
};
exports.getEnv = getEnv;
// 检查是否是开发环境
const isDevelopment = () => {
    return (0, exports.getEnv)('NODE_ENV') === 'development';
};
exports.isDevelopment = isDevelopment;
// 检查是否是生产环境
const isProduction = () => {
    return (0, exports.getEnv)('NODE_ENV') === 'production';
};
exports.isProduction = isProduction;
// 获取API基础URL
const getApiBaseUrl = () => {
    return (0, exports.getEnv)('VITE_API_BASE_URL', 'https://api.binance.com');
};
exports.getApiBaseUrl = getApiBaseUrl;
// 获取WebSocket基础URL
const getWsBaseUrl = () => {
    return (0, exports.getEnv)('VITE_WS_BASE_URL', 'wss://stream.binance.com:9443');
};
exports.getWsBaseUrl = getWsBaseUrl;
// 获取应用名称
const getAppName = () => {
    return (0, exports.getEnv)('VITE_APP_NAME', 'BinanceTradingApp');
};
exports.getAppName = getAppName;
// 获取应用版本
const getAppVersion = () => {
    return (0, exports.getEnv)('VITE_APP_VERSION', '1.0.0');
};
exports.getAppVersion = getAppVersion;
// 是否启用调试模式
const isDebugEnabled = () => {
    return (0, exports.getEnv)('VITE_DEBUG', 'false') === 'true';
};
exports.isDebugEnabled = isDebugEnabled;
// 获取日志级别
const getLogLevel = () => {
    return (0, exports.getEnv)('VITE_LOG_LEVEL', 'info');
};
exports.getLogLevel = getLogLevel;
// 获取所有环境变量
const getAllEnvVars = () => {
    const env = {};
    // 收集import.meta.env中的变量
    if (import.meta.env) {
        for (const key in import.meta.env) {
            if (import.meta.env[key]) {
                env[key] = import.meta.env[key];
            }
        }
    }
    // 收集process.env中的变量
    if (typeof process !== 'undefined' && process.env) {
        for (const key in process.env) {
            if (process.env[key]) {
                env[key] = process.env[key];
            }
        }
    }
    return env;
};
exports.getAllEnvVars = getAllEnvVars;
// 环境信息报告
const getEnvReport = () => {
    const env = (0, exports.getAllEnvVars)();
    const filteredEnv = {};
    // 过滤敏感信息
    for (const key in env) {
        if (key.includes('API') || key.includes('KEY') || key.includes('SECRET')) {
            filteredEnv[key] = '***REDACTED***';
        }
        else {
            filteredEnv[key] = env[key];
        }
    }
    return JSON.stringify(filteredEnv, null, 2);
};
exports.getEnvReport = getEnvReport;
// 创建默认环境配置
const createDefaultEnvConfig = () => {
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
exports.createDefaultEnvConfig = createDefaultEnvConfig;
//# sourceMappingURL=env.js.map