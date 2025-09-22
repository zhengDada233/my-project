import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth';
import { logger } from '../../utils/logger';

export default defineComponent({
  name: 'Login',
  setup() {
    const apiKey = ref('');
    const apiSecret = ref('');
    const isLoggingIn = ref(false);
    const errorMessage = ref('');
    
    const router = useRouter();
    const authStore = useAuthStore();

    const login = async () => {
      if (!apiKey.value || !apiSecret.value) {
        errorMessage.value = '请填写API Key和API Secret';
        return;
      }

      isLoggingIn.value = true;
      errorMessage.value = '';

      try {
        // 验证 API Key 和 Secret
        await authStore.login(apiKey.value, apiSecret.value);
        
        // 登录成功，跳转到交易页面
        router.push('/strategy');
      } catch (error) {
        logger.error('登录失败:', error);
        
        // 提供更详细的错误信息
        let errorMsg = `登录失败: ${error instanceof Error ? error.message : String(error)}`;
        
        if (errorMsg.includes('Invalid API-key')) {
          errorMsg = 'API Key 无效。请检查您的 API Key 是否正确，并确保它在 Binance 账户中已启用。';
        } else if (errorMsg.includes('permissions')) {
          errorMsg = 'API Key 权限不足。请确保您的 API Key 具有交易权限。';
        } else if (errorMsg.includes('IP')) {
          errorMsg = 'IP 地址不在白名单中。请将当前 IP 地址添加到您的 API Key 白名单中。';
        }
        
        errorMessage.value = errorMsg;
      } finally {
        isLoggingIn.value = false;
      }
    };

    return {
      apiKey,
      apiSecret,
      isLoggingIn,
      errorMessage,
      login
    };
  }
});