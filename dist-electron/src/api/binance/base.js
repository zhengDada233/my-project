"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceApiBase = exports.BinanceApiError = void 0;
// src/api/binance/base.ts
const electron_js_1 = require("../electron.js");
const logger_js_1 = require("../../utils/logger.js");
// Binance API错误类
class BinanceApiError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'BinanceApiError';
        this.code = code;
    }
}
exports.BinanceApiError = BinanceApiError;
// Binance API基础类
class BinanceApiBase {
    constructor() {
        this.baseUrl = 'https://api.binance.com/api/v3';
    }
    /**
     * 发送带签名的请求（需要API密钥）
     */
    async signedRequest(endpoint, params, apiKey, apiSecret) {
        if (!(0, electron_js_1.isElectronAPIAvailable)()) {
            throw new Error('Electron API is not available');
        }
        try {
            logger_js_1.logger.debug(`发送签名请求: ${endpoint}`, params);
            const response = await (0, electron_js_1.getElectronAPI)().sendSignedRequest({ ...params, url: `${this.baseUrl}/${endpoint}` }, apiKey, apiSecret);
            if (response.code) {
                throw new BinanceApiError(response.code, response.msg);
            }
            return response;
        }
        catch (error) {
            logger_js_1.logger.error(`签名请求失败: ${endpoint}`, error);
            if (error instanceof BinanceApiError) {
                throw error;
            }
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            throw new BinanceApiError(-1, errorMsg);
        }
    }
    /**
     * 发送公开请求（不需要API密钥）
     */
    async publicRequest(endpoint, params = {}) {
        if (!(0, electron_js_1.isElectronAPIAvailable)()) {
            throw new Error('Electron API is not available');
        }
        try {
            logger_js_1.logger.debug(`发送公开请求: ${endpoint}`, params);
            const response = await (0, electron_js_1.getElectronAPI)().sendPublicRequest(`${this.baseUrl}/${endpoint}`, params);
            if (response.code) {
                throw new BinanceApiError(response.code, response.msg);
            }
            return response;
        }
        catch (error) {
            logger_js_1.logger.error(`公开请求失败: ${endpoint}`, error);
            if (error instanceof BinanceApiError) {
                throw error;
            }
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            throw new BinanceApiError(-1, errorMsg);
        }
    }
}
exports.BinanceApiBase = BinanceApiBase;
//# sourceMappingURL=base.js.map