export interface StrategyConfig {
  symbol: string;
  apiKey: string;
  apiSecret: string;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  emaPeriod: number;
  rsiPeriod: number;
  checkInterval: number;
}

export interface Kline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export interface OrderExecution {
  timestamp: number;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  status: 'FILLED' | 'REJECTED' | 'PENDING';
  message?: string;
}

export interface StrategyState {
  isRunning: boolean;
  lastCheck: number;
  currentPosition: 'LONG' | 'SHORT' | 'NONE';
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  currentPrice: number;
  marketTrend: string;
  priceChange: number;
  rsiValue: number;
  emaValue: number;
  lastSignal: string;
  checkCount: number;
  orderHistory: OrderExecution[];
  accountBalance?: number;
  positionValue?: number;
  unrealizedPnl?: number;
}