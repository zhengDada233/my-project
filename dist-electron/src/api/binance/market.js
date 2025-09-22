"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketApi = exports.MarketApi = void 0;
// src/api/binance/market.ts
const base_js_1 = require("./base.js");
const logger_js_1 = require("../../utils/logger.js");
// 市场API类
class MarketApi extends base_js_1.BinanceApiBase {
    /**
     * 获取K线数据
     */
    async getKlines(symbol, interval, limit = 500) {
        logger_js_1.logger.debug(`获取K线数据: ${symbol} ${interval} ${limit}`);
        return this.publicRequest(`klines`, {
            symbol,
            interval,
            limit
        });
    }
    /**
     * 获取交易对信息
     */
    async getSymbolInfo(symbol) {
        logger_js_1.logger.debug(`获取交易对信息: ${symbol}`);
        const symbols = await this.publicRequest(`exchangeInfo`, {});
        // 修复：直接从数组中查找，而非访问symbols.symbols
        return symbols.find((s) => s.symbol === symbol) || null;
    }
    /**
     * 获取最新价格
     */
    async getLatestPrice(symbol) {
        logger_js_1.logger.debug(`获取最新价格: ${symbol}`);
        const prices = await this.publicRequest(`ticker/price`, { symbol });
        return parseFloat(prices[0]?.price || '0');
    }
}
exports.MarketApi = MarketApi;
// 导出市场API实例
exports.marketApi = new MarketApi();
//# sourceMappingURL=market.js.map