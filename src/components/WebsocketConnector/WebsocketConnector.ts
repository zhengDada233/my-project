import { defineComponent, ref, onUnmounted } from 'vue';
import { logger } from '../../utils/logger';

export default defineComponent({
  name: 'WebsocketConnector',
  setup() {
    const wsUrl = ref('wss://stream.binance.com:9443/ws/btcusdt@trade');
    const isConnected = ref(false);
    const messages = ref<string[]>([]);
    const connectionStatus = ref('未连接');
    const messageCount = ref(0);

    let websocket: WebSocket | null = null;

    const connect = () => {
      try {
        logger.info('尝试连接WebSocket:', wsUrl.value);
        websocket = new WebSocket(wsUrl.value);
        
        websocket.onopen = () => {
          isConnected.value = true;
          connectionStatus.value = '已连接';
          logger.info('WebSocket连接已建立');
        };
        
        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            messages.value.push(JSON.stringify(data, null, 2));
            messageCount.value++;
            
            // 保持消息列表不超过100条
            if (messages.value.length > 100) {
              messages.value.shift();
            }
          } catch (error) {
            logger.error('解析WebSocket消息失败:', error, event.data);
          }
        };
        
        websocket.onerror = (error) => {
          logger.error('WebSocket错误:', error);
          connectionStatus.value = '连接错误';
        };
        
        websocket.onclose = () => {
          isConnected.value = false;
          connectionStatus.value = '已断开';
          logger.info('WebSocket连接已关闭');
        };
      } catch (error) {
        logger.error('创建WebSocket连接失败:', error);
      }
    };

    const disconnect = () => {
      if (websocket) {
        websocket.close();
        websocket = null;
      }
      isConnected.value = false;
      connectionStatus.value = '未连接';
    };

    const clearMessages = () => {
      messages.value = [];
      messageCount.value = 0;
    };

    onUnmounted(() => {
      disconnect();
      logger.info('WebSocket连接器组件已卸载');
    });

    return {
      wsUrl,
      isConnected,
      messages,
      connectionStatus,
      messageCount,
      connect,
      disconnect,
      clearMessages
    };
  }
});