import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  // 设置默认值
  const appName = env.VITE_APP_NAME || 'BinanceTradingApp';
  const appVersion = env.VITE_APP_VERSION || '1.0.0';
  const apiBaseUrl = env.VITE_API_BASE_URL || 'https://api.binance.com';
  const wsBaseUrl = env.VITE_WS_BASE_URL || 'wss://stream.binance.com:9443';
  const isDebug = env.VITE_DEBUG === 'true';
  const logLevel = env.VITE_LOG_LEVEL || 'info';
  
  return {
    plugins: [vue()],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
          additionalData: `
            @use "src/styles/variables" as *;
            @use "src/styles/mixins" as *;
            @use "src/styles/main" as *;
          `
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@api': resolve(__dirname, 'src/api'),
        '@components': resolve(__dirname, 'src/components'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@styles': resolve(__dirname, 'src/styles'),
        '@store': resolve(__dirname, 'src/store'),
        '@router': resolve(__dirname, 'src/router')
      }
    },
    server: {
      port: 3000
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        external: [],
      }
    },
    // 根据环境设置base
    base: env.VITE_APP_ENV === 'production' ? './' : '/',
    // 定义全局常量
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_NAME__: JSON.stringify(appName),
      __API_BASE_URL__: JSON.stringify(apiBaseUrl),
      __WS_BASE_URL__: JSON.stringify(wsBaseUrl),
      __DEBUG__: JSON.stringify(isDebug),
      __LOG_LEVEL__: JSON.stringify(logLevel)
    }
  };
});