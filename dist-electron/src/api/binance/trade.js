"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeApi = exports.TradeApi = void 0;
const base_1 = require("./base");
const types_1 = require("./types");
const electron_1 = require("../electron");
class TradeApi extends base_1.BinanceApiBase {
    // 创建订单
    async createOrder(params, apiKey, apiSecret) {
        if (!(0, electron_1.isElectronAPIAvailable)()) {
            throw new Error('Electron API is not available');
        }
        try {
            const logger = require('../../utils/logger').logger;
            logger.info('创建订单:', { ...params, apiKey: '***' });
            const response = await (0, electron_1.getElectronAPI)().createOrder({
                ...params,
                timestamp: Date.now()
            }, apiKey, apiSecret);
            if (response.code) {
                throw new types_1.BinanceApiError(response.code, response.msg);
            }
            logger.info('订单创建成功:', response);
            return response;
        }
        catch (error) {
            const logger = require('../../utils/logger').logger;
            logger.error('创建订单失败:', error);
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
        if (!(0, electron_1.isElectronAPIAvailable)()) {
            throw new Error('Electron API is not available');
        }
        try {
            const logger = require('../../utils/logger').logger;
            logger.info(`撤销订单: ${symbol} #${orderId}`);
            const response = await (0, electron_1.getElectronAPI)().cancelOrder(params, apiKey, apiSecret);
            if (response.code) {
                throw new types_1.BinanceApiError(response.code, response.msg);
            }
            return response;
        }
        catch (error) {
            const logger = require('../../utils/logger').logger;
            logger.error(`撤销订单失败: ${symbol} #${orderId}`, error);
            throw error;
        }
    }
    // 获取账户信息
    async getAccountInfo(apiKey, apiSecret) {
        if (!(0, electron_1.isElectronAPIAvailable)()) {
            throw new Error('Electron API is not available');
        }
        try {
            const logger = require('../../utils/logger').logger;
            logger.info('获取账户信息');
            const params = { timestamp: Date.now() };
            const response = await (0, electron_1.getElectronAPI)().getAccountInfo(params, apiKey, apiSecret);
            if (response.code) {
                throw new types_1.BinanceApiError(response.code, response.msg);
            }
            return response;
        }
        catch (error) {
            const logger = require('../../utils/logger').logger;
            logger.error('获取账户信息失败:', error);
            throw error;
        }
    }
}
exports.TradeApi = TradeApi;
exports.tradeApi = new TradeApi();
//# sourceMappingURL=trade.js.map