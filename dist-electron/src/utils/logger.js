"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
// src/utils/logger.ts
const env_js_1 = require("./env.js");
const electron_js_1 = require("../api/electron.js");
class Logger {
    constructor() {
        this.initialize();
    }
    initialize() {
        // 绑定this上下文
        this.info = this.info.bind(this);
        this.error = this.error.bind(this);
        this.warn = this.warn.bind(this);
        this.debug = this.debug.bind(this);
        // 记录应用启动信息
        this.info(`应用启动: ${(0, env_js_1.getAppName)()} v${(0, env_js_1.getAppVersion)()}`);
        this.info(`运行环境: ${(0, env_js_1.isDevelopment)() ? '开发' : '生产'}`);
        this.info('环境变量:', (0, env_js_1.getEnvInfo)());
    }
    /**
     * 记录信息日志
     */
    info(message, data) {
        const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        console.log(`[INFO] ${new Date().toISOString()} ${fullMessage}`);
        // 使用统一的API访问方式
        if ((0, electron_js_1.isElectronAPIAvailable)()) {
            (0, electron_js_1.getElectronAPI)().log.info(fullMessage);
        }
    }
    /**
     * 记录错误日志
     */
    error(message, data) {
        const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        console.error(`[ERROR] ${new Date().toISOString()} ${fullMessage}`);
        if ((0, electron_js_1.isElectronAPIAvailable)()) {
            (0, electron_js_1.getElectronAPI)().log.error(fullMessage);
        }
    }
    /**
     * 记录警告日志
     */
    warn(message, data) {
        const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        console.warn(`[WARN] ${new Date().toISOString()} ${fullMessage}`);
        if ((0, electron_js_1.isElectronAPIAvailable)()) {
            (0, electron_js_1.getElectronAPI)().log.warn(fullMessage);
        }
    }
    /**
     * 记录调试日志
     */
    debug(message, data) {
        const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        console.debug(`[DEBUG] ${new Date().toISOString()} ${fullMessage}`);
        if ((0, electron_js_1.isElectronAPIAvailable)()) {
            (0, electron_js_1.getElectronAPI)().log.debug(fullMessage);
        }
    }
}
exports.Logger = Logger;
// 导出单例实例
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map