const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// 项目根目录（相对于当前脚本）
const ROOT_DIR = path.join(__dirname, '..');
// 打包产物目录
const DIST_DIR = path.join(ROOT_DIR, 'dist');
// 读取版本号
const packageJson = require(path.join(ROOT_DIR, 'package.json'));
const VERSION = packageJson.version;
const TAG_NAME = `v${VERSION}`;
const COMMIT_MESSAGE = `chore(release): ${TAG_NAME}`;

// 执行命令并返回输出
const exec = (cmd, options = {}) => {
  return execSync(cmd, { stdio: 'inherit', ...options });
};

// 主流程
(async () => {
  try {
    // 1. 检查dist目录是否存在
    await fs.access(DIST_DIR);

    // 2. 检查是否有Windows安装包
    const files = await fs.readdir(DIST_DIR);
    const installers = files.filter(file => 
      (file.endsWith('.exe') || file.endsWith('.msi')) && file.includes('Setup')
    );

    if (installers.length === 0) {
      throw new Error('未找到Windows安装包，请先执行打包命令');
    }

    console.log(`📦 找到安装包: ${installers.join(', ')}`);

    // 3. 检查Git工作区是否干净（避免提交意外更改）
    try {
      exec('git diff --quiet --exit-code', { stdio: 'ignore' });
    } catch {
      throw new Error('Git工作区存在未提交的更改，请先提交或 stash');
    }

    // 4. 执行Git操作
    console.log('🔄 开始同步到Git...');
    
    // 添加安装包（仅提交dist目录下的安装包）
    exec(`git add ${installers.map(file => path.join(DIST_DIR, file)).join(' ')}`);
    
    // 提交变更（如果有新内容）
    try {
      exec(`git commit -m "${COMMIT_MESSAGE}"`);
    } catch {
      console.log('ℹ️ 没有新内容需要提交');
    }
    
    // 推送代码
    exec('git push origin main');
    
    // 创建并推送标签
    try {
      // 检查标签是否已存在
      exec(`git rev-parse ${TAG_NAME}`, { stdio: 'ignore' });
      console.log(`ℹ️ 标签 ${TAG_NAME} 已存在，跳过创建`);
    } catch {
      // 创建新标签
      exec(`git tag -a ${TAG_NAME} -m "${COMMIT_MESSAGE}"`);
      exec(`git push origin ${TAG_NAME}`);
      console.log(`🏷️ 已创建并推送标签: ${TAG_NAME}`);
    }

    console.log('✅ 发布流程完成！安装包已同步到Git');
    console.log(`🔗 可在GitHub创建Release并关联标签: ${TAG_NAME}`);

  } catch (error) {
    console.error(`❌ 发布失败: ${error.message}`);
    process.exit(1);
  }
})();
    