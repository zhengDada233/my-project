import { defineComponent, ref, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth';
import { logger } from '../../utils/logger';

export default defineComponent({
  name: 'TradingStrategy',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    
    // 策略配置
    const symbol = ref('AVNTUSDT');
    const positionSize = ref(0.9); // 90%仓位
    const stopLoss = ref(0.015); // 1.5%止损
    const takeProfit = ref(0.03); // 3%止盈
    const emaPeriod = ref(20);
    const rsiPeriod = ref(14);
    const checkInterval = ref(30); // 检查间隔（秒）
    
    // 状态变量
    const isRunning = ref(false);
    const canToggle = ref(true);
    const strategyStatus = ref<any>(null);
    const statusUpdateInterval = ref<NodeJS.Timeout | null>(null);
    
    // API密钥相关
    const apiKey = computed(() => authStore.getApiKey);
    const apiSecret = computed(() => authStore.getApiSecret);
    
    // 显示消息
    const showMessage = (message: string, success: boolean) => {
      // 实际实现可使用UI组件显示消息
      console.log(`${success ? '成功' : '失败'}: ${message}`);
    };
    
    // 切换策略状态
    const toggleStrategy = async () => {
      if (!authStore.isAuthenticated) {
        showMessage('请先登录', false);
        return;
      }
      
      if (!apiKey.value || !apiSecret.value) {
        showMessage('API密钥不可用', false);
        return;
      }
      
      canToggle.value = false;
      
      try {
        if (isRunning.value) {
          // 停止策略
          const result = await window.electronAPI.stopTradingStrategy(symbol.value);
          if (result.success) {
            isRunning.value = false;
            showMessage('策略已停止', true);
            stopStatusUpdates();
            logger.info('交易策略已停止', symbol.value);
          } else {
            showMessage(result.message, false);
            logger.error('停止策略失败', result.message);
          }
        } else {
          // 验证参数
          if (positionSize.value <= 0 || positionSize.value > 1) {
            showMessage('仓位比例必须在0-1之间', false);
            return;
          }
          
          if (stopLoss.value <= 0) {
            showMessage('止损比例必须大于0', false);
            return;
          }
          
          if (takeProfit.value <= stopLoss.value) {
            showMessage('止盈比例必须大于止损比例', false);
            return;
          }
          
          // 启动策略
          const config = {
            symbol: symbol.value,
            apiKey: apiKey.value,
            apiSecret: apiSecret.value,
            positionSize: positionSize.value,
            stopLoss: stopLoss.value,
            takeProfit: takeProfit.value,
            emaPeriod: emaPeriod.value,
            rsiPeriod: rsiPeriod.value,
            checkInterval: checkInterval.value * 1000
          };
          
          const result = await window.electronAPI.startTradingStrategy(config);

          if (result.success) {
            isRunning.value = true;
            showMessage('策略已启动', true);
            startStatusUpdates();
            logger.info('交易策略已启动', { ...config, apiKey: '***', apiSecret: '***' });
          } else {
            showMessage(result.message, false);
            logger.error('启动策略失败', result.message);
          }
        }
      } catch (error) {
        const errorMsg = `操作失败: ${error instanceof Error ? error.message : String(error)}`;
        showMessage(errorMsg, false);
        logger.error('策略操作失败', error);
      } finally {
        canToggle.value = true;
      }
    };
    
    // 启动状态更新
    const startStatusUpdates = () => {
      if (statusUpdateInterval.value) {
        clearInterval(statusUpdateInterval.value);
      }
      
      // 立即获取一次状态
      fetchStrategyStatus();
      
      // 定时更新状态
      statusUpdateInterval.value = setInterval(fetchStrategyStatus, 5000);
    };
    
    // 停止状态更新
    const stopStatusUpdates = () => {
      if (statusUpdateInterval.value) {
        clearInterval(statusUpdateInterval.value);
        statusUpdateInterval.value = null;
      }
    };
    
    // 获取策略状态
    const fetchStrategyStatus = async () => {
      try {
        const status = await window.electronAPI.getTradingStrategyStatus(symbol.value);
        strategyStatus.value = status;
      } catch (error) {
        logger.error('获取策略状态失败', error);
      }
    };
    
    // 登出
    const logout = () => {
      if (isRunning.value) {
        showMessage('请先停止策略再登出', false);
        return;
      }
      authStore.logout();
      router.push('/login');
    };
    
    // 组件卸载时停止更新
    onUnmounted(() => {
      stopStatusUpdates();
    });
    
    return {
      symbol,
      positionSize,
      stopLoss,
      takeProfit,
      emaPeriod,
      rsiPeriod,
      checkInterval,
      isRunning,
      canToggle,
      strategyStatus,
      toggleStrategy,
      logout,
      userInfo: authStore.getUserInfo
    };
  }
});