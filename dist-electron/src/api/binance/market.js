"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketApi = exports.MarketApi = void 0;
// 市场数据 API
const base_1 = require("./base");
class MarketApi extends base_1.BinanceApiBase {
    // 获取交易所信息
    async getExchangeInfo(symbol) {
        const params = {};
        if (symbol) {
            params.symbol = symbol;
        }
        return this.publicRequest('exchangeInfo', params);
    }
    // 获取所有交易对信息
    async getAllSymbols() {
        const info = await this.getExchangeInfo();
        return info.symbols;
    }
    // 获取特定交易对信息
    async getSymbolInfo(symbol) {
        const info = await this.getExchangeInfo();
        return info.symbols.find(s => s.symbol === symbol);
    }
    // 获取服务器时间
    async getServerTime() {
        const response = await this.publicRequest('time');
        return response.serverTime;
    }
    // Ping 测试
    async ping() {
        return this.publicRequest('ping');
    }
}
exports.MarketApi = MarketApi;
// 创建市场 API 实例
exports.marketApi = new MarketApi();
//# sourceMappingURL=market.js.map