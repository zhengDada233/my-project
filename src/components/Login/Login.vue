<template>
  <div class="login-container">
    <div class="login-form">
      <h2>Binance 交易终端登录</h2>
      
      <div class="form-group">
        <label>API Key:</label>
        <input 
          v-model="apiKey" 
          type="password" 
          placeholder="请输入 Binance API Key" 
          @keyup.enter="login"
        />
      </div>
      
      <div class="form-group">
        <label>API Secret:</label>
        <input 
          v-model="apiSecret" 
          type="password" 
          placeholder="请输入 Binance API Secret" 
          @keyup.enter="login"
        />
      </div>
      
      <button @click="login" :disabled="isLoggingIn">
        {{ isLoggingIn ? '登录中...' : '登录' }}
      </button>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      
      <div class="debug-section">
        <button @click="showDebug = !showDebug" class="debug-toggle">
          {{ showDebug ? '隐藏调试信息' : '显示调试信息' }}
        </button>
        
        <div v-if="showDebug" class="debug-info">
          <h4>调试信息</h4>
          <button @click="checkLogs">查看日志</button>
          <button @click="pingBinance">测试连接</button>
          <div v-if="logContent" class="log-content">
            <pre>{{ logContent }}</pre>
          </div>
        </div>
      </div>
      
      <div class="login-tips">
        <h3>使用说明:</h3>
        <ul>
          <li>请确保您的 API Key 具有交易权限</li>
          <li>建议启用 IP 白名单功能以提高安全性</li>
          <li>您的 API 密钥仅存储在本地，不会发送到任何其他服务器</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script src="./Login.ts" lang="ts"></script>
<style src="./Login.scss" lang="scss" scoped></style>