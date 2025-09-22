// scripts/build-test.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始详细构建测试...');

try {
  // 1. 清理
  console.log('1. 清理构建目录...');
  execSync('npm run clean', { stdio: 'inherit' });
  
  // 2. 构建前端
  console.log('2. 构建前端...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 3. 检查 dist 目录
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error('dist 目录不存在');
  }
  
  const distFiles = fs.readdirSync(distDir);
  console.log('dist 目录中的文件:', distFiles);
  
  // 4. 构建 Electron
  console.log('3. 构建 Electron...');
  execSync('npm run build:electron', { stdio: 'inherit' });
  
  // 5. 检查 dist-electron 目录
  const distElectronDir = path.join(__dirname, '..', 'dist-electron');
  if (!fs.existsSync(distElectronDir)) {
    throw new Error('dist-electron 目录不存在');
  }
  
  const electronFiles = fs.readdirSync(distElectronDir);
  console.log('dist-electron 目录中的文件:', electronFiles);
  
  // 6. 重命名文件
  console.log('4. 重命名文件...');
  execSync('npm run rename-main', { stdio: 'inherit' });
  
  // 7. 检查重命名后的文件
  const renamedFiles = fs.readdirSync(distElectronDir);
  console.log('重命名后的文件:', renamedFiles);
  
  // 验证必要的文件存在
  const requiredFiles = ['main.cjs', 'preload.cjs'];
  requiredFiles.forEach(file => {
    const filePath = path.join(distElectronDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${file} 文件不存在`);
    }
    console.log(`验证成功: ${file} 文件存在`);
  });
  
  console.log('构建测试成功完成!');
} catch (error) {
  console.error('构建测试失败:', error.message);
  process.exit(1);
}