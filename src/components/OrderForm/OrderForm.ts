import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth';
import { OrderFormApi } from './api';
import { logger } from '../../utils/logger';

export default defineComponent({
  name: 'OrderForm',
  setup() {
    // 表单数据
    const symbol = ref('BTCUSDT');
    const side = ref('BUY');
    const type = ref('LIMIT');
    const timeInForce = ref('GTC');
    const quantity = ref('0.001');
    const price = ref('0.00');
    const isCreating = ref(false);
    const orderResult = ref<string | null>(null);

    // 账户信息
    const accountInfo = ref<any>(null);
    const isLoadingAccount = ref(false);

    // 网络诊断相关变量
    const isDiagnosing = ref(false);
    const diagnosticResults = ref<string | null>(null);

    // 交易对信息
    const symbolInfo = ref<any>(null);

    const router = useRouter();
    const authStore = useAuthStore();

    // 计算属性：API密钥和Secret
    const apiKey = computed(() => authStore.getApiKey);
    const apiSecret = computed(() => authStore.getApiSecret);

    // 如果没有认证，重定向到登录页面
    if (!authStore.isAuthenticated) {
      router.push('/login');
    }

    // 创建订单
    const createOrder = async () => {
      if (!apiKey.value || !apiSecret.value) {
        alert('请先登录');
        router.push('/login');
        return;
      }

      isCreating.value = true;
      orderResult.value = null;

      try {
        // 创建请求参数
        const params = {
          symbol: symbol.value,
          side: side.value,
          type: type.value,
          timeInForce: timeInForce.value,
          quantity: quantity.value,
          price: price.value,
          timestamp: Date.now()
        };
        
        // 发送请求
        const response = await OrderFormApi.createOrder(params, apiKey.value, apiSecret.value);
        
        orderResult.value = JSON.stringify(response, null, 2);
        logger.info('订单创建成功', response);
      } catch (error) {
        logger.error('创建订单失败:', error);
        orderResult.value = `错误: ${error instanceof Error ? error.message : String(error)}`;
      } finally {
        isCreating.value = false;
      }
    };

    // 获取账户信息
    const fetchAccountInfo = async () => {
      if (!apiKey.value || !apiSecret.value) return;
      
      isLoadingAccount.value = true;
      try {
        const info = await OrderFormApi.getAccountInfo(apiKey.value, apiSecret.value);
        accountInfo.value = info;
        logger.info('账户信息获取成功');
      } catch (error) {
        logger.error('获取账户信息失败:', error);
      } finally {
        isLoadingAccount.value = false;
      }
    };

    // 添加网络诊断函数
    const runNetworkDiagnostics = async () => {
      if (!window.electronAPI) {
        alert('Electron API 不可用，请确保在 Electron 环境中运行');
        return;
      }
      
      isDiagnosing.value = true;
      diagnosticResults.value = null;
      
      try {
        const results = await window.electronAPI.diagnoseNetwork();
        diagnosticResults.value = JSON.stringify(results, null, 2);
        logger.info('网络诊断完成');
      } catch (error) {
        logger.error('网络诊断失败:', error);
        diagnosticResults.value = `错误: ${error instanceof Error ? error.message : String(error)}`;
      } finally {
        isDiagnosing.value = false;
      }
    };

    // 获取交易对信息
    const fetchSymbolInfo = async () => {
      try {
        const info = await OrderFormApi.getSymbolInfo(symbol.value);
        symbolInfo.value = info || null;
        
        if (info) {
          logger.info('交易对信息获取成功:', info);
        }
      } catch (error) {
        logger.error('获取交易对信息失败:', error);
      }
    };

    // 登出
    const logout = () => {
      authStore.logout();
      router.push('/login');
    };

    onMounted(() => {
      // 获取初始交易对信息
      fetchSymbolInfo();
      // 获取账户信息
      fetchAccountInfo();
    });

    return {
      symbol,
      side,
      type,
      timeInForce,
      quantity,
      price,
      isCreating,
      orderResult,
      accountInfo,
      isLoadingAccount,
      createOrder,
      isDiagnosing,
      diagnosticResults,
      runNetworkDiagnostics,
      logout,
      userInfo: authStore.getUserInfo,
      fetchAccountInfo
    };
  }
});