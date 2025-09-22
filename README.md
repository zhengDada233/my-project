# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

# 完整的生产环境构建流程
npm run dist:win

# 如果需要清理构建文件
npm run clean

重新构建 Electron 应用：

npm run clean
npm run build:electron
npm run rename-main

重新打包应用：

npm run dist:win

# 运行打包后的应用（带日志）
npm run run:exe

<!-- # 删除node_modules
Remove-Item -Recurse -Force node_modules

# 删除package-lock.json
Remove-Item -Force package-lock.json

# 清除缓存
npm cache clean --force

# 安装依赖
npm install -->

删除以下冗余文件：

src/api/binance/strategy.ts (使用electron/strategy.ts替代)

src/api/binance/market.ts (功能已整合到主进程)

src/api/binance/trade.ts (功能已整合到主进程)

src/api/binance/base.ts (不再需要)

src/components/WebsocketConnector/ (当前版本未使用)