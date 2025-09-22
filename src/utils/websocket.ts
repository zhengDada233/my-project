
import * as log from 'electron-log';

interface WebSocketOptions {
  url: string;
  onMessage: (data: any) => void;
  onError: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private options: WebSocketOptions | null = null;

  connect(options: WebSocketOptions): void {
    this.options = options;
    
    try {
      this.socket = new WebSocket(options.url);
      
      this.socket.onopen = () => {
        log.info('WebSocket连接已建立');
        this.reconnectAttempts = 0;
        if (options.onOpen) options.onOpen();
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onMessage(data);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket错误:', error);
        options.onError(error);
      };
      
      this.socket.onclose = () => {
        log.info('WebSocket连接已关闭');
        if (options.onClose) options.onClose();
        
        // 尝试重新连接
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(options), 3000);
        }
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      options.onError(error as Event);
    }
  }

  send(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('WebSocket连接未就绪');
    }
  }

  close(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // 停止重连
  }

  getState(): number {
    return this.socket ? this.socket.readyState : WebSocket.CLOSED;
  }
}