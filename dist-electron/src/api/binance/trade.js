"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeApi = exports.TradeApi = void 0;
const types_1 = require("./types");
const logger_1 = require("../../utils/logger");
class TradeApi {
    // 创建订单
    async createOrder(params, apiKey, apiSecret) {
        if (!window.electronAPI) {
            throw new Error('Electron API is not available');
        }
        try {
            logger_1.logger.info('创建订单:', { ...params, apiKey: '***' });
            const response = await window.electronAPI.createOrder({
                ...params,
                timestamp: Date.now()
            }, apiKey, apiSecret);
            if (response.code) {
                throw new types_1.BinanceApiError(response.code, response.msg);
            }
            logger_1.logger.info('订单创建成功:', response);
            return response;
        }
        catch (error) {
            logger_1.logger.error('创建订单失败:', error);
            if (error instanceof types_1.BinanceApiError) {
                // 处理Binance特定错误
                if (error.code === -2010) {
                    throw new Error(`余额不足: ${error.msg}`);
                }
                else if (error.code === -1013) {
                    throw new Error(`无效数量: ${error.msg}`);
                }
            }
            throw error;
        }
    }
    // 撤销订单
    async cancelOrder(symbol, orderId, apiKey, apiSecret) {
        const params = {
            symbol,
            orderId,
            timestamp: Date.now()
        };
        if (!window.electronAPI) {
            throw new Error('Electron API is not available');
        }
        try {
            logger_1.logger.info(`撤销订单: ${symbol} #${orderId}`);
            const response = await window.electronAPI.cancelOrder(params, apiKey, apiSecret);
            if (response.code) {
                throw new types_1.BinanceApiError(response.code, response.msg);
            }
            return response;
        }
        catch (error) {
            logger_1.logger.error(`撤销订单失败: ${symbol} #${orderId}`, error);
            throw error;
        }
    }
    // 获取账户信息
    async getAccountInfo(apiKey, apiSecret) {
        if (!window.electronAPI) {
            throw new Error('Electron API is not available');
        }
        try {
            logger_1.logger.info('获取账户信息');
            const params = { timestamp: Date.now() };
            const response = await window.electronAPI.getAccountInfo(params, apiKey, apiSecret);
            if (response.code) {
                throw new types_1.BinanceApiError(response.code, response.msg);
            }
            return response;
        }
        catch (error) {
            logger_1.logger.error('获取账户信息失败:', error);
            throw error;
        }
    }
}
exports.TradeApi = TradeApi;
exports.tradeApi = new TradeApi();
//# sourceMappingURL=trade.js.map