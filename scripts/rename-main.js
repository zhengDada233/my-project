// scripts/rename-main.js
const fs = require('fs');
const path = require('path');

const distElectronDir = path.join(__dirname, '..', 'dist-electron');

console.log('开始重命名文件...');
console.log('目标目录:', distElectronDir);

// 检查 dist-electron 目录是否存在
if (!fs.existsSync(distElectronDir)) {
  console.error('错误: dist-electron 目录不存在');
  process.exit(1);
}

// 获取所有文件
const files = fs.readdirSync(distElectronDir);
console.log('找到的文件:', files);

// 重命名所有 .js 文件为 .cjs
let renamedCount = 0;
files.forEach(file => {
  if (file.endsWith('.js')) {
    const oldPath = path.join(distElectronDir, file);
    const newName = file.replace('.js', '.cjs');
    const newPath = path.join(distElectronDir, newName);
    
    try {
      fs.renameSync(oldPath, newPath);
      console.log(`重命名 ${file} 为 ${newName}`);
      renamedCount++;
    } catch (error) {
      console.error(`重命名 ${file} 失败:`, error.message);
    }
  }
});

console.log(`重命名完成，共重命名了 ${renamedCount} 个文件`);

// 验证必要的文件存在
const requiredFiles = ['main.cjs', 'preload.cjs', 'strategy.cjs', 'strategy-types.cjs'];
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(distElectronDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`错误: ${file} 文件不存在`);
    allFilesExist = false;
  } else {
    console.log(`验证成功: ${file} 文件存在`);
  }
});

if (!allFilesExist) {
  console.error('错误: 缺少必要的文件');
  process.exit(1);
}

console.log('所有必要文件都存在，重命名过程完成');