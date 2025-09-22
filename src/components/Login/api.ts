import { BinanceApiError } from '../../api/binance/types';

// Login 专用的 API 封装
export class LoginApi {
  // 验证 API Key 和 Secret
  static async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      // 检查 Electron API 是否可用
      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }
      
      // 使用 Electron API 验证凭证
      const result = await window.electronAPI.validateApiCredentials(apiKey, apiSecret);
      
      if (!result.valid) {
        throw new Error(result.message || 'API 凭证无效');
      }
      
      return true;
    } catch (error) {
      console.error('API 验证失败:', error);
      
      if (error instanceof BinanceApiError) {
        // 处理特定的 Binance API 错误
        switch (error.code) {
          case -2014: // Invalid API-key, IP, or permissions for action
            throw new Error('API Key 无效或权限不足');
          case -2015: // Invalid API-key, IP, or permissions for action
            throw new Error('API Secret 无效');
          default:
            throw new Error(`API 验证失败: ${error.msg} (代码: ${error.code})`);
        }
      }
      
      throw new Error(`API 验证失败: ${error.message}`);
    }
  }
}