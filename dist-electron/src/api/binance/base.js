"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceApiBase = void 0;
const types_1 = require("./types");
// 基础 API 类
class BinanceApiBase {
    async signedRequest(endpoint, params, apiKey, apiSecret) {
        try {
            if (!window.electronAPI) {
                throw new Error('Electron API is not available');
            }
            const response = await window.electronAPI.sendSignedRequest(params, apiKey, apiSecret);
            if (response.code && response.code < 0) {
                throw new types_1.BinanceApiError(response.code, response.msg || 'Unknown error');
            }
            return response;
        }
        catch (error) {
            console.error('Binance API request failed:', error);
            if (error instanceof types_1.BinanceApiError) {
                throw error;
            }
            throw new types_1.BinanceApiError(-1, error.message || 'Unknown error occurred');
        }
    }
    async publicRequest(endpoint, params = {}) {
        try {
            // 公共 API 不需要 Electron 环境，直接使用 fetch
            const queryString = new URLSearchParams(params).toString();
            const url = `https://api.binance.com/api/v3/${endpoint}${queryString ? `?${queryString}` : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Binance public API request failed:', error);
            throw new types_1.BinanceApiError(-1, error.message || 'Unknown error occurred');
        }
    }
}
exports.BinanceApiBase = BinanceApiBase;
//# sourceMappingURL=base.js.map