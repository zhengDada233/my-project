const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const packageJson = require(path.join(ROOT_DIR, 'package.json'));
const VERSION = packageJson.version;
const TAG_NAME = `v${VERSION}`;
const COMMIT_MESSAGE = `chore(release): ${TAG_NAME}`;

// 执行命令并输出日志
const exec = (cmd, options = {}) => {
  console.log(`📝 执行命令: ${cmd}`);
  try {
    return execSync(cmd, {
      stdio: 'inherit',
      cwd: ROOT_DIR,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
      ...options
    });
  } catch (error) {
    throw new Error(`命令执行失败: ${error.message}\n执行的命令: ${cmd}`);
  }
};

// 获取本地当前分支名称
const getCurrentBranch = () => {
  try {
    // 执行git命令获取当前分支（trim移除空格）
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    }).trim();
  } catch (error) {
    throw new Error(`获取当前分支失败: ${error.message}`);
  }
};

// 主流程
(async () => {
  try {
    console.log('=== 开始发布流程 ===');
    console.log(`项目根目录: ${ROOT_DIR}`);

    // 1. 检查Git仓库是否初始化
    try {
      exec('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    } catch {
      throw new Error('当前目录不是Git仓库，请先执行 git init 并关联远程仓库');
    }

    // 2. 获取本地当前分支名称（关键修复）
    const currentBranch = getCurrentBranch();
    console.log(`当前本地分支: ${currentBranch}`);

    // 3. 检查远程仓库是否关联
    try {
      exec('git remote get-url origin', { stdio: 'ignore' });
    } catch {
      throw new Error('未关联远程仓库，请先执行 git remote add origin <仓库地址>');
    }

    // 4. 检查安装包目录和文件（省略部分重复逻辑，与之前保持一致）
    try {
      await fs.access(RELEASE_DIR);
    } catch {
      throw new Error(`安装包目录不存在: ${RELEASE_DIR}`);
    }
    const files = await fs.readdir(RELEASE_DIR);
    const installers = files.filter(file => 
      (file.endsWith('.exe') || file.endsWith('.msi')) && 
      file.includes('Setup') && file.includes(packageJson.build.productName)
    );
    if (installers.length === 0) {
      throw new Error(`未找到安装包: ${files.join(', ')}`);
    }

    // 5. 强制添加安装包
    const filePaths = installers
      .map(file => path.join(RELEASE_DIR, file))
      .map(absPath => path.relative(ROOT_DIR, absPath).replace(/\\/g, '/'))
      .map(relPath => `"${relPath}"`);
    exec(`git add -f ${filePaths.join(' ')}`);

    // 6. 提交（确保至少有一次提交）
    try {
      exec(`git commit -m "${COMMIT_MESSAGE}"`);
    } catch (error) {
      if (!error.message.includes('nothing to commit')) {
        throw error; // 非空提交错误才抛出
      }
      console.log('ℹ️ 没有新内容需要提交');
    }

    // 7. 推送代码（使用当前分支名称，而非固定main）
    console.log('\n🔄 推送至远程仓库...');
    const pushCommand = `git push origin ${currentBranch}`; // 关键修复：用当前分支
    exec(pushCommand);

    // 8. 处理标签
    try {
      exec(`git rev-parse ${TAG_NAME}`, { stdio: 'ignore' });
      console.log(`ℹ️ 标签 ${TAG_NAME} 已存在`);
    } catch {
      exec(`git tag -a ${TAG_NAME} -m "${COMMIT_MESSAGE}"`);
      exec(`git push origin ${TAG_NAME}`);
    }

    console.log('\n✅ 发布成功！');

  } catch (error) {
    console.error(`\n❌ 发布失败: ${error.message}`);
    process.exit(1);
  }
})();
    