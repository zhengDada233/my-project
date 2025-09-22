// 认证状态接口
export interface AuthState {
  isAuthenticated: boolean;
  apiKey: string | null;
  apiSecret: string | null;
  userInfo: any | null;
}

// 用户信息接口
export interface UserInfo {
  accountType: string;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
}