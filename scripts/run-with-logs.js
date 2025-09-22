// scripts/run-with-logs.js
import * as log from 'electron-log';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

log.info('开始构建并运行带日志的应用...');

try {
  // 1. 清理
  log.info('1. 清理构建目录...');
  execSync('npm run clean', { stdio: 'inherit' });
  
  // 2. 构建前端
  log.info('2. 构建前端...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 3. 构建 Electron
  log.info('3. 构建 Electron...');
  execSync('npm run build:electron', { stdio: 'inherit' });
  
  // 4. 重命名文件
  log.info('4. 重命名文件...');
  execSync('npm run rename-main', { stdio: 'inherit' });
  
  // 5. 打包应用
  log.info('5. 打包应用...');
  execSync('npm run dist:win', { stdio: 'inherit' });
  
  // 6. 查找生成的 exe 文件
  const releaseDir = path.join(__dirname, '..', 'release');
  const exeFiles = fs.readdirSync(releaseDir).filter(file => file.endsWith('.exe'));
  
  if (exeFiles.length === 0) {
    throw new Error('未找到生成的 exe 文件');
  }
  
  const exePath = path.join(releaseDir, exeFiles[0]);
  log.info(`找到应用: ${exePath}`);
  
  // 7. 运行应用并启用日志
  log.info('6. 运行应用并启用日志...');
  log.info('应用日志将输出到控制台和 logs/app.log 文件');
  
  // 在 Windows 上运行 exe 并启用日志
  execSync(`"${exePath}" --enable-logging`, { stdio: 'inherit' });
  
} catch (error) {
  console.error('运行失败:', error.message);
  process.exit(1);
}