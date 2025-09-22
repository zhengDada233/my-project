<template>
  <div class="websocket-connector">
    <h3>WebSocket连接器</h3>
    
    <div class="connection-controls">
      <input 
        v-model="wsUrl" 
        placeholder="输入WebSocket URL" 
        type="text" 
      />
      <button @click="isConnected ? disconnect() : connect()">
        {{ isConnected ? '断开连接' : '连接' }}
      </button>
      <button @click="clearMessages" :disabled="messages.length === 0">
        清空消息
      </button>
    </div>
    
    <div class="connection-status">
      状态: {{ connectionStatus }} ({{ messageCount }} 条消息)
    </div>
    
    <div class="messages">
      <h4>接收到的消息:</h4>
      <div v-for="(message, index) in messages" :key="index" class="message">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script src="./WebsocketConnector.ts" lang="ts"></script>
<style src="./WebsocketConnector.scss" lang="scss" scoped></style>