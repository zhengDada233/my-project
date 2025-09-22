<template>
  <div class="order-form">
    <div class="header">
      <h1>Binance交易终端</h1>
      <div class="user-info" v-if="userInfo">
        <span>欢迎使用交易终端</span>
        <button @click="logout" class="logout-btn">登出</button>
      </div>
    </div>
    
    <h3>账户信息</h3>
    <div class="account-info" v-if="accountInfo">
      <p>账户类型: {{ accountInfo.accountType }}</p>
      <p>可交易: {{ accountInfo.canTrade ? '是' : '否' }}</p>
      <p>可提现: {{ accountInfo.canWithdraw ? '是' : '否' }}</p>
      <p>可充值: {{ accountInfo.canDeposit ? '是' : '否' }}</p>
      <p>更新时间: {{ new Date(accountInfo.updateTime).toLocaleString() }}</p>
      <button @click="fetchAccountInfo" :disabled="isLoadingAccount">
        {{ isLoadingAccount ? '更新中...' : '更新账户信息' }}
      </button>
    </div>
    <div v-else>
      <p>加载账户信息中...</p>
    </div>
    
    <h3>创建订单</h3>
    
    <div class="form-row">
      <div class="form-group">
        <label>交易对:</label>
        <input v-model="symbol" type="text" @change="fetchSymbolInfo" />
      </div>
      
      <div class="form-group">
        <label>方向:</label>
        <select v-model="side">
          <option value="BUY">买入</option>
          <option value="SELL">卖出</option>
        </select>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>类型:</label>
        <select v-model="type">
          <option value="LIMIT">限价单</option>
          <option value="MARKET">市价单</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>时效:</label>
        <select v-model="timeInForce">
          <option value="GTC">成交为止</option>
          <option value="IOC">立即成交或取消</option>
          <option value="FOK">全部成交或取消</option>
        </select>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>数量:</label>
        <input v-model="quantity" type="number" step="0.000001" />
      </div>
      
      <div class="form-group">
        <label>价格:</label>
        <input v-model="price" type="number" step="0.000001" />
      </div>
    </div>
    
    <button @click="createOrder" :disabled="isCreating">
      {{ isCreating ? '处理中...' : '创建订单' }}
    </button>
    
    <div v-if="orderResult" class="result">
      <h4>订单结果:</h4>
      <pre>{{ orderResult }}</pre>
    </div>

    <div class="network-diagnostics">
      <h4>网络诊断</h4>
      <button @click="runNetworkDiagnostics" :disabled="isDiagnosing">
        {{ isDiagnosing ? '诊断中...' : '诊断网络连接' }}
      </button>
      
      <div v-if="diagnosticResults" class="diagnostic-results">
        <h4>网络诊断结果:</h4>
        <pre>{{ diagnosticResults }}</pre>
      </div>
    </div>
  </div>
</template>

<script src="./OrderForm.ts" lang="ts"></script>
<style src="./OrderForm.scss" lang="scss" scoped></style>