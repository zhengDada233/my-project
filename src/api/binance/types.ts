// Binance API 基础响应类型
export interface BinanceResponse<T = any> {
  code?: number;
  msg?: string;
  data?: T;
}

// 交易对信息
export interface SymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  baseAssetPrecision: number;
  quoteAsset: string;
  quotePrecision: number;
  filters: any[];
}

// 订单类型
export interface Order {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice: string;
  icebergQty: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
  origQuoteOrderQty: string;
}

// 创建订单参数
export interface CreateOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'LIMIT_MAKER';
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  quantity: number;
  price?: number;
  timestamp: number;
}

// 交易所信息
export interface ExchangeInfo {
  timezone: string;
  serverTime: number;
  symbols: SymbolInfo[];
}

// 错误处理类 - 确保正确定义和导出
export class BinanceApiError extends Error {
  public code: number;
  public msg: string;

  constructor(code: number, msg: string) {
    super(`Binance API Error: ${msg} (Code: ${code})`);
    this.code = code;
    this.msg = msg;
    this.name = 'BinanceApiError';
  }
}