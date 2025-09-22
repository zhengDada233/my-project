# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

确认打包成功生成了安装包：
bash
# 先单独执行打包命令，确认文件生成
npm run dist:win
# 检查release目录
dir release
确保路径中没有特殊字符（如&、(等），仅包含空格是安全的
执行最终发布命令：
bash
npm run release:win

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