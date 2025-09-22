// scripts/generate-env.js
const fs = require('fs');
const path = require('path');

console.log('生成环境配置文件...');

const envDir = path.join(__dirname, '..');
const envFiles = {
  '.env': `# 默认环境配置 - 生产环境
NODE_ENV=production
VITE_APP_NAME=Binance Trading App
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.binance.com
VITE_WS_BASE_URL=wss://stream.binance.com:9443
VITE_DEBUG=false
VITE_LOG_LEVEL=info
`,
  '.env.development': `# 开发环境配置
NODE_ENV=development
VITE_APP_NAME=Binance Trading App (Development)
VITE_APP_VERSION=1.0.0-dev
VITE_API_BASE_URL=https://testnet.binance.vision/api
VITE_WS_BASE_URL=wss://testnet.binance.vision/ws
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
`,
  '.env.production': `# 生产环境配置
NODE_ENV=production
VITE_APP_NAME=Binance Trading App
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.binance.com
VITE_WS_BASE_URL=wss://stream.binance.com:9443
VITE_DEBUG=false
VITE_LOG_LEVEL=info
`,
  '.env.example': `# 环境变量示例文件
# 复制此文件为 .env 并根据需要修改值

NODE_ENV=production
VITE_APP_NAME=Your App Name
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.binance.com
VITE_WS_BASE_URL=wss://stream.binance.com:9443
VITE_DEBUG=false
VITE_LOG_LEVEL=info
`
};

// 创建环境文件
Object.entries(envFiles).forEach(([filename, content]) => {
  const filePath = path.join(envDir, filename);
  
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ 创建 ${filename}`);
  } else {
    console.log(`✓ ${filename} 已存在，跳过创建`);
  }
});

console.log('环境配置文件生成完成');