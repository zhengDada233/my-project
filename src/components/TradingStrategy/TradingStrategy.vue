<template>
  <div class="trading-strategy">
    <h2>自动交易策略 - {{ symbol }}</h2>
    
    <div class="strategy-config">
      <div class="form-group">
        <label>交易对:</label>
        <input v-model="symbol" type="text" placeholder="例如: BTCUSDT" />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>仓位比例:</label>
          <input v-model="positionSize" type="number" min="0.01" max="1" step="0.01" />
        </div>
        
        <div class="form-group">
          <label>止损比例:</label>
          <input v-model="stopLoss" type="number" min="0.001" max="0.1" step="0.001" />
        </div>
        
        <div class="form-group">
          <label>止盈比例:</label>
          <input v-model="takeProfit" type="number" min="0.005" max="0.2" step="0.001" />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>EMA周期:</label>
          <input v-model="emaPeriod" type="number" min="10" max="100" step="1" />
        </div>
        
        <div class="form-group">
          <label>RSI周期:</label>
          <input v-model="rsiPeriod" type="number" min="5" max="30" step="1" />
        </div>
        
        <div class="form-group">
          <label>检查间隔(秒):</label>
          <input v-model="checkInterval" type="number" min="10" max="300" step="10" />
        </div>
      </div>
    </div>
    
    <!-- 控制面板 -->
    <div class="control-panel">
      <h3>控制面板</h3>
      
      <div class="control-buttons">
        <button @click="toggleStrategy" :disabled="!canToggle">
          {{ isRunning ? '停止策略' : '启动策略' }}
        </button>
        
        <button @click="forceUpdate" :disabled="!isRunning">
          强制更新状态
        </button>
        
        <button @click="exportLogs" :disabled="!status">
          导出日志
        </button>
      </div>
      
      <div class="settings">
        <label>显示模式:</label>
        <select v-model="displayMode">
          <option value="formatted">格式化视图</option>
          <option value="raw">原始数据</option>
        </select>
      </div>
    </div>

    <!-- 策略状态显示 -->
    <div v-if="status" class="strategy-status">
      <h3>策略状态</h3>
      
      <!-- 根据显示模式选择显示内容 -->
      <pre v-if="displayMode === 'formatted'">{{ formattedStatus }}</pre>
      <pre v-else>{{ JSON.stringify(status, null, 2) }}</pre>
    </div>
    
    <div v-if="message" class="message" :class="{ error: !success }">
      {{ message }}
    </div>
    
  </div>
</template>

<script src="./TradingStrategy.ts" lang="ts"></script>
<style src="./TradingStrategy.scss" lang="scss" scoped></style>