import { defineStore } from 'pinia';
import { AuthState, UserInfo } from './types';
import { LoginApi } from '../components/Login/api';
import { secureStorage } from '../utils/storage';
import { logger } from '../utils/logger';

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    apiKey: null,
    apiSecret: null,
    userInfo: null
  }),

  actions: {
    // 登录
    async login(apiKey: string, apiSecret: string): Promise<void> {
      try {
        logger.info('开始验证 API 凭证');
        
        // 验证 API Key 和 Secret
        const isValid = await LoginApi.validateCredentials(apiKey, apiSecret);
        
        if (!isValid) {
          throw new Error('API 验证失败');
        }
        
        // 保存认证信息
        this.isAuthenticated = true;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        
        // 保存到安全存储
        secureStorage.set('apiKey', apiKey);
        secureStorage.set('apiSecret', apiSecret);
        
        // 获取用户信息
        await this.fetchUserInfo();
        
        logger.info('API 验证成功');
      } catch (error) {
        logger.error('登录失败:', error);
        
        // 提供更详细的错误信息
        let errorMsg = error instanceof Error ? error.message : String(error);
        
        if (errorMsg.includes('Invalid API-key')) {
          throw new Error('API Key 无效。请检查您的 API Key 是否正确，并确保它在 Binance 账户中已启用。');
        } else if (errorMsg.includes('permissions')) {
          throw new Error('API Key 权限不足。请确保您的 API Key 具有交易权限。');
        } else if (errorMsg.includes('IP')) {
          throw new Error('IP 地址不在白名单中。请将当前 IP 地址添加到您的 API Key 白名单中。');
        }
        
        throw new Error(`登录失败: ${errorMsg}`);
      }
    },
    
    // 获取用户信息
    async fetchUserInfo(): Promise<void> {
      // 这里可以添加获取用户信息的逻辑
      // 例如调用 Binance API 获取账户信息
      this.userInfo = {
        accountType: 'SPOT',
        canTrade: true,
        canWithdraw: false,
        canDeposit: false,
        updateTime: Date.now()
      };
    },
    
    // 登出
    logout(): void {
      this.isAuthenticated = false;
      this.apiKey = null;
      this.apiSecret = null;
      this.userInfo = null;
      
      // 清除存储
      secureStorage.remove('apiKey');
      secureStorage.remove('apiSecret');
    },
    
    // 初始化认证状态
    initializeAuth(): void {
      const apiKey = secureStorage.get('apiKey');
      const apiSecret = secureStorage.get('apiSecret');
      
      if (apiKey && apiSecret) {
        this.isAuthenticated = true;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.fetchUserInfo();
      }
    }
  },

  getters: {
    // 获取认证状态
    isLoggedIn: (state): boolean => state.isAuthenticated,
    
    // 获取 API Key
    getApiKey: (state): string | null => state.apiKey,
    
    // 获取 API Secret
    getApiSecret: (state): string | null => state.apiSecret,
    
    // 获取用户信息
    getUserInfo: (state): any | null => state.userInfo
  }
});