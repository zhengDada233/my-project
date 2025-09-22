"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceApiError = void 0;
// 错误处理类 - 确保正确定义和导出
class BinanceApiError extends Error {
    constructor(code, msg) {
        super(`Binance API Error: ${msg} (Code: ${code})`);
        this.code = code;
        this.msg = msg;
        this.name = 'BinanceApiError';
    }
}
exports.BinanceApiError = BinanceApiError;
//# sourceMappingURL=types.js.map