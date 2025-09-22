// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import pinia from './store';
import { checkEnvironment } from './middleware/env-check';
import { logger } from './utils/logger';

// 检查环境配置
checkEnvironment();

// 记录环境信息
logger.info('应用启动完成');

// 创建应用
const app = createApp(App);

// 使用插件
app.use(pinia);
app.use(router);

// 挂载应用
app.mount('#app');