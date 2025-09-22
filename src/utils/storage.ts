import * as CryptoJS from 'crypto-js';

// 安全存储密钥（在生产环境中应该从安全的地方获取）
const STORAGE_KEY = 'binance-app-secret-key';

// 加密数据
function encryptData(data: string): string {
  return CryptoJS.AES.encrypt(data, STORAGE_KEY).toString();
}

// 解密数据
function decryptData(cipherText: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, STORAGE_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// 安全存储
export const secureStorage = {
  // 设置值
  set(key: string, value: string): void {
    const encryptedValue = encryptData(value);
    localStorage.setItem(key, encryptedValue);
  },
  
  // 获取值
  get(key: string): string | null {
    const encryptedValue = localStorage.getItem(key);
    if (!encryptedValue) return null;
    
    try {
      return decryptData(encryptedValue);
    } catch (error) {
      console.error('解密存储数据失败:', error);
      return null;
    }
  },
  
  // 移除值
  remove(key: string): void {
    localStorage.removeItem(key);
  },
  
  // 清空所有值
  clear(): void {
    localStorage.clear();
  }
};