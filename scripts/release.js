const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// 项目根目录
const ROOT_DIR = path.resolve(__dirname, '..');
// 安装包输出目录
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
// 读取版本信息
const packageJson = require(path.join(ROOT_DIR, 'package.json'));
const VERSION = packageJson.version;
const TAG_NAME = `v${VERSION}`;
const COMMIT_MESSAGE = `chore(release): ${TAG_NAME}`;

// 执行命令（针对Windows环境优化）
const exec = (cmd, options = {}) => {
  try {
    // Windows强制使用cmd.exe，确保路径解析规则一致
    const shellOptions = process.platform === 'win32' 
      ? { shell: 'cmd.exe' } 
      : {};
      
    return execSync(cmd, { 
      stdio: 'inherit',
      cwd: ROOT_DIR, // 强制在项目根目录执行命令
      ...shellOptions,
      ...options
    });
  } catch (error) {
    throw new Error(`命令执行失败: ${cmd}\n错误详情: ${error.message}`);
  }
};

// 主流程
(async () => {
  try {
    console.log(`🔍 项目根目录: ${ROOT_DIR}`);
    console.log(`🔍 安装包目录: ${RELEASE_DIR}`);

    // 1. 检查release目录是否存在
    try {
      await fs.access(RELEASE_DIR);
    } catch {
      throw new Error(`安装包目录不存在，请先执行打包命令\n目录: ${RELEASE_DIR}`);
    }

    // 2. 查找安装包文件
    const files = await fs.readdir(RELEASE_DIR);
    const installers = files.filter(file => 
      (file.endsWith('.exe') || file.endsWith('.msi')) && 
      file.includes('Setup') &&
      file.includes(packageJson.build.productName)
    );

    if (installers.length === 0) {
      throw new Error(`未找到安装包文件\n目录内容: ${files.join(', ')}\n查找规则: 包含"Setup"和"${packageJson.build.productName}"`);
    }

    console.log(`📦 找到安装包: ${installers.join(', ')}`);

    // 3. 验证文件实际存在
    const installerPaths = installers.map(file => path.join(RELEASE_DIR, file));
    for (const filePath of installerPaths) {
      try {
        await fs.access(filePath);
        console.log(`✅ 确认文件存在: ${filePath}`);
      } catch {
        throw new Error(`文件不存在: ${filePath}`);
      }
    }

    // 4. 检查Git工作区
    try {
      exec('git status --porcelain', { stdio: 'ignore' });
    } catch {
      throw new Error('Git工作区有未提交的更改，请先提交或执行 git stash');
    }

    // 5. 构建Git兼容的路径（Windows关键修复）
    const gitPaths = installerPaths
      // 转换为相对于项目根目录的路径
      .map(filePath => path.relative(ROOT_DIR, filePath))
      // Windows路径分隔符转换为/
      .map(relPath => relPath.replace(/\\/g, '/'))
      // 关键修复：Windows cmd必须用双引号包裹路径
      .map(relPath => `"${relPath}"`);

    console.log('🔄 开始Git操作...');
    console.log('要提交的文件路径:', gitPaths.join(' '));

    // 6. 执行Git命令（分步执行，便于排查）
    console.log('执行: git add ...');
    exec(`git add ${gitPaths.join(' ')}`);

    console.log('执行: git commit ...');
    try {
      exec(`git commit -m "${COMMIT_MESSAGE}" --allow-empty`);
    } catch {
      console.log('ℹ️ 没有新内容需要提交');
    }

    console.log('执行: git push ...');
    exec('git push origin main');

    // 7. 处理标签
    try {
      exec(`git rev-parse ${TAG_NAME}`, { stdio: 'ignore' });
      console.log(`ℹ️ 标签 ${TAG_NAME} 已存在`);
    } catch {
      exec(`git tag -a ${TAG_NAME} -m "${COMMIT_MESSAGE}"`);
      exec(`git push origin ${TAG_NAME}`);
      console.log(`🏷️ 已推送标签: ${TAG_NAME}`);
    }

    console.log('✅ 发布成功！');

  } catch (error) {
    console.error(`❌ 发布失败: ${error.message}`);
    process.exit(1);
  }
})();
    