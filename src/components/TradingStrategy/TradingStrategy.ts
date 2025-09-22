import { defineComponent, ref, onMounted, onUnmounted, computed } from 'vue';
import { useAuthStore } from '../../store/auth';
import { logger } from '../../utils/logger';

export default defineComponent({
  name: 'TradingStrategy',
  setup() {
    const authStore = useAuthStore();
    
    // 策略配置
    const symbol = ref('BTCUSDT');
    const positionSize = ref(0.1);
    const stopLoss = ref(0.02);
    const takeProfit = ref(0.05);
    const emaPeriod = ref(50);
    const rsiPeriod = ref(14);
    const checkInterval = ref(60);
    
    // 策略状态
    const isRunning = ref(false);
    const status = ref<any>(null);
    const formattedStatus = ref('');
    const message = ref('');
    const success = ref(true);
    const displayMode = ref<'formatted' | 'raw'>('formatted');
    
    // 状态检查定时器
    let statusInterval: number | null = null;
    
    // 检查是否可以操作策略
    const canToggle = ref(true);
    
    // 计算属性：API密钥和Secret
    const apiKey = computed(() => authStore.getApiKey);
    const apiSecret = computed(() => authStore.getApiSecret);
    
    // 格式化策略状态的函数
    const formatStrategyStatus = (statusData: any): string => {
      if (!statusData) return '无状态信息';
      
      return `
策略状态: ${statusData.isRunning ? '运行中' : '已停止'}
最后检查: ${new Date(statusData.lastCheck).toLocaleString()}
检查次数: ${statusData.checkCount || 0}
当前持仓: ${statusData.currentPosition}
入场价格: ${statusData.entryPrice > 0 ? statusData.entryPrice.toFixed(8) : 'N/A'}
当前价格: ${statusData.currentPrice ? statusData.currentPrice.toFixed(8) : 'N/A'}
市场趋势: ${statusData.marketTrend || 'UNKNOWN'}
价格变化: ${statusData.priceChange ? (statusData.priceChange * 100).toFixed(2) + '%' : 'N/A'}
RSI值: ${statusData.rsiValue ? statusData.rsiValue.toFixed(2) : 'N/A'}
EMA值: ${statusData.emaValue ? statusData.emaValue.toFixed(8) : 'N/A'}
止损价格: ${statusData.stopLossPrice > 0 ? statusData.stopLossPrice.toFixed(8) : 'N/A'}
止盈价格: ${statusData.takeProfitPrice > 0 ? statusData.takeProfitPrice.toFixed(8) : 'N/A'}
最后信号: ${statusData.lastSignal || 'NONE'}
未实现盈亏: ${statusData.unrealizedPnl ? statusData.unrealizedPnl.toFixed(2) + '%' : 'N/A'}
账户余额: ${statusData.accountBalance ? statusData.accountBalance.toFixed(2) + ' USDT' : 'N/A'}
持仓价值: ${statusData.positionValue ? statusData.positionValue.toFixed(2) + ' USDT' : 'N/A'}

订单历史 (最近5条):
${statusData.orderHistory && statusData.orderHistory.length > 0 
  ? statusData.orderHistory.slice(-5).map((order: any) => 
    `时间: ${new Date(order.timestamp).toLocaleString()}
  类型: ${order.type}
  价格: ${order.price.toFixed(8)}
  数量: ${order.quantity.toFixed(6)}
  状态: ${order.status}
  ${order.message ? '消息: ' + order.message : ''}`
  ).join('\n---\n')
  : '无订单历史'}
      `;
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
            logger.info('交易策略已启动', config);
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
    
    // 显示消息
    const showMessage = (msg: string, isSuccess: boolean) => {
      message.value = msg;
      success.value = isSuccess;
      
      // 3秒后清除消息
      setTimeout(() => {
        message.value = '';
      }, 3000);
    };
    
    // 开始状态更新
    const startStatusUpdates = () => {
      statusInterval = window.setInterval(updateStatus, 5000);
      updateStatus();
    };
    
    // 停止状态更新
    const stopStatusUpdates = () => {
      if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
      }
      status.value = null;
      formattedStatus.value = '';
    };
    
    // 更新策略状态
    const updateStatus = async () => {
      try {
        const result = await window.electronAPI.getStrategyStatus(symbol.value);
        if (result.success) {
          status.value = result.status;
          formattedStatus.value = formatStrategyStatus(result.status);
        } else {
          // 如果获取状态失败，可能策略已停止
          if (isRunning.value) {
            isRunning.value = false;
            stopStatusUpdates();
            showMessage('策略已停止', false);
            logger.warn('策略状态获取失败，策略可能已停止');
          }
        }
      } catch (error) {
        logger.error('获取策略状态失败:', error);
      }
    };
    
    // 强制更新状态
    const forceUpdate = () => {
      updateStatus();
    };
    
    // 导出日志
    const exportLogs = () => {
      if (!status.value) return;
      
      const logData = {
        config: {
          symbol: symbol.value,
          positionSize: positionSize.value,
          stopLoss: stopLoss.value,
          takeProfit: takeProfit.value,
          emaPeriod: emaPeriod.value,
          rsiPeriod: rsiPeriod.value,
          checkInterval: checkInterval.value
        },
        status: status.value,
        exportTime: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(logData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `trading-strategy-${symbol.value}-${new Date().getTime()}.json`;
      link.click();
      
      logger.info('策略日志已导出', logData);
    };
    
    onMounted(() => {
      // 组件挂载时检查是否有活动的策略
      if (isRunning.value) {
        startStatusUpdates();
      }
      
      logger.info('交易策略组件已加载');
    });
    
    onUnmounted(() => {
      stopStatusUpdates();
      logger.info('交易策略组件已卸载');
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
      status,
      formattedStatus,
      message,
      success,
      canToggle,
      displayMode,
      toggleStrategy,
      forceUpdate,
      exportLogs
    };
  }
});