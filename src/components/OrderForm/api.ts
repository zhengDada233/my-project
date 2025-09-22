import { isElectronAPIAvailable } from '../../api/electron';
import { logger } from '../../utils/logger';

// OrderForm 专用的 API 封装
export class OrderFormApi {
  // 创建订单（需要 Electron API）
  static async createOrder(
    params: any,
    apiKey: string,
    apiSecret: string
  ): Promise<any> {
    if (!isElectronAPIAvailable()) {
      throw new Error('Electron API is not available. This function requires an Electron environment.');
    }

    try {
      logger.info('创建订单:', params);
      const response = await window.electronAPI.createOrder(params, apiKey, apiSecret);
      logger.info('订单创建成功:', response);
      return response;
    } catch (error) {
      logger.error('创建订单失败:', error);
      
      if (error instanceof Error) {
        // 处理特定的错误信息
        if (error.message.includes('Invalid price')) {
          throw new Error(`价格无效: ${error.message}`);
        } else if (error.message.includes('Insufficient balance')) {
          throw new Error(`余额不足: ${error.message}`);
        } else if (error.message.includes('Unknown order')) {
          throw new Error(`未知订单: ${error.message}`);
        } else {
          throw new Error(`创建订单失败: ${error.message}`);
        }
      }
      
      throw new Error(`创建订单失败: ${String(error)}`);
    }
  }

  // 获取账户信息
  static async getAccountInfo(apiKey: string, apiSecret: string): Promise<any> {
    if (!isElectronAPIAvailable()) {
      throw new Error('Electron API is not available.');
    }

    try {
      logger.info('获取账户信息');
      const response = await window.electronAPI.getAccountInfo(apiKey, apiSecret);
      logger.info('账户信息获取成功');
      return response;
    } catch (error) {
      logger.error('获取账户信息失败:', error);
      throw new Error(`获取账户信息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 获取交易对信息
  static async getSymbolInfo(symbol: string): Promise<any> {
    if (!isElectronAPIAvailable()) {
      throw new Error('Electron API is not available.');
    }

    try {
      logger.info(`获取交易对信息: ${symbol}`);
      const response = await window.electronAPI.getExchangeInfo(symbol);
      logger.info('交易对信息获取成功');
      return response;
    } catch (error) {
      logger.error('获取交易对信息失败:', error);
      throw new Error(`获取交易对信息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 验证交易对格式
  static validateSymbol(symbol: string): boolean {
    return /^[A-Z0-9]{5,12}$/.test(symbol);
  }

  // 验证价格格式
  static validatePrice(price: number, symbolInfo?: any): boolean {
    if (!symbolInfo || !symbolInfo.filters) return price > 0;
    
    const priceFilter = symbolInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
    if (!priceFilter) return price > 0;
    
    const minPrice = parseFloat(priceFilter.minPrice);
    const maxPrice = parseFloat(priceFilter.maxPrice);
    const tickSize = parseFloat(priceFilter.tickSize);
    
    return price >= minPrice && 
           price <= maxPrice && 
           Math.abs(price % tickSize) < 1e-10;
  }

  // 验证数量格式
  static validateQuantity(quantity: number, symbolInfo?: any): boolean {
    if (!symbolInfo) return quantity > 0;
    
    const lotSizeFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    if (!lotSizeFilter) return quantity > 0;
    
    const minQty = parseFloat(lotSizeFilter.minQty);
    const maxQty = parseFloat(lotSizeFilter.maxQty);
    const stepSize = parseFloat(lotSizeFilter.stepSize);
    
    return quantity >= minQty && 
           quantity <= maxQty && 
           Math.abs(quantity % stepSize) < 1e-10;
  }

  // 格式化价格
  static formatPrice(price: number, symbolInfo?: any): string {
    if (!symbolInfo || !symbolInfo.filters) return price.toString();
    
    const priceFilter = symbolInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
    if (!priceFilter) return price.toString();
    
    const tickSize = parseFloat(priceFilter.tickSize);
    const precision = Math.max(0, Math.floor(Math.log10(1 / tickSize)));
    
    return price.toFixed(precision);
  }

  // 格式化数量
  static formatQuantity(quantity: number, symbolInfo?: any): string {
    if (!symbolInfo || !symbolInfo.filters) return quantity.toString();
    
    const lotSizeFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    if (!lotSizeFilter) return quantity.toString();
    
    const stepSize = parseFloat(lotSizeFilter.stepSize);
    const precision = Math.max(0, Math.floor(Math.log10(1 / stepSize)));
    
    return quantity.toFixed(precision);
  }
}