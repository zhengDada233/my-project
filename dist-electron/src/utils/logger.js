"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
const env_1 = require("./env");
// 日志级别枚举
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// 日志级别权重
const logLevelWeights = {
    [LogLevel.ERROR]: 4,
    [LogLevel.WARN]: 3,
    [LogLevel.INFO]: 2,
    [LogLevel.DEBUG]: 1
};
// 获取当前日志级别权重
const getCurrentLogLevelWeight = () => {
    const level = (0, env_1.getLogLevel)().toLowerCase();
    return logLevelWeights[level] || logLevelWeights[LogLevel.INFO];
};
// 检查是否应该记录日志
const shouldLog = (level) => {
    const currentWeight = getCurrentLogLevelWeight();
    const targetWeight = logLevelWeights[level];
    return targetWeight >= currentWeight;
};
// 统一的日志工具
exports.logger = {
    info: (message, ...args) => {
        if (!shouldLog(LogLevel.INFO))
            return;
        const fullMessage = `${message} ${args.length ? JSON.stringify(args) : ''}`;
        if (window.electronAPI && window.electronAPI.log) {
            window.electronAPI.log.info(fullMessage);
        }
        else {
            console.log(`[INFO] ${new Date().toISOString()}: ${fullMessage}`);
        }
    },
    error: (message, ...args) => {
        if (!shouldLog(LogLevel.ERROR))
            return;
        const fullMessage = `${message} ${args.length ? JSON.stringify(args) : ''}`;
        if (window.electronAPI && window.electronAPI.log) {
            window.electronAPI.log.error(fullMessage);
        }
        else {
            console.error(`[ERROR] ${new Date().toISOString()}: ${fullMessage}`);
        }
    },
    warn: (message, ...args) => {
        if (!shouldLog(LogLevel.WARN))
            return;
        const fullMessage = `${message} ${args.length ? JSON.stringify(args) : ''}`;
        if (window.electronAPI && window.electronAPI.log) {
            window.electronAPI.log.warn(fullMessage);
        }
        else {
            console.warn(`[WARN] ${new Date().toISOString()}: ${fullMessage}`);
        }
    },
    debug: (message, ...args) => {
        if (!shouldLog(LogLevel.DEBUG))
            return;
        const fullMessage = `${message} ${args.length ? JSON.stringify(args) : ''}`;
        if (window.electronAPI && window.electronAPI.log) {
            window.electronAPI.log.debug(fullMessage);
        }
        else {
            console.debug(`[DEBUG] ${new Date().toISOString()}: ${fullMessage}`);
        }
    },
    // 环境信息日志
    logEnvironment: () => {
        if (!shouldLog(LogLevel.INFO))
            return;
        const { getEnvReport, isDevelopment, isProduction, getAppName, getAppVersion } = require('./env');
        const envInfo = getEnvReport();
        this.info(`应用启动: ${getAppName()} v${getAppVersion()}`);
        this.info(`运行环境: ${isDevelopment() ? '开发' : isProduction() ? '生产' : '未知'}`);
        this.info('环境变量:', envInfo);
    }
};
//# sourceMappingURL=logger.js.map