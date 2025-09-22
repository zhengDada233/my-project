// scripts/run-app.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('正在启动应用程序...');

// 检查应用是否存在
const appPath = path.join(__dirname, '..', 'release', 'win-unpacked', 'BinanceTradingApp.exe');

if (!fs.existsSync(appPath)) {
  console.error('错误: 应用程序未找到。请先运行 npm run dist:win 构建应用。');
  console.log('应用路径:', appPath);
  process.exit(1);
}

console.log('找到应用程序:', appPath);

// 运行应用程序
const child = exec(`"${appPath}" --enable-logging`, (error, stdout, stderr) => {
  if (error) {
    console.error('执行错误:', error);
    return;
  }
  
  if (stdout) {
    console.log('输出:', stdout);
  }
  
  if (stderr) {
    console.error('错误输出:', stderr);
  }
});

child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`应用程序退出，代码: ${code}`);
});