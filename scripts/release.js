const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// 项目根目录（基于脚本位置计算）
const ROOT_DIR = path.resolve(__dirname, '..');
// 安装包输出目录（与package.json的build.directories.output保持一致）
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
// 读取版本号
const packageJson = require(path.join(ROOT_DIR, 'package.json'));
const VERSION = packageJson.version;
const TAG_NAME = `v${VERSION}`;
const COMMIT_MESSAGE = `chore(release): ${TAG_NAME}`;

// 执行命令（封装错误处理和Windows兼容性处理）
const exec = (cmd, options = {}) => {
  try {
    // 在Windows上强制使用cmd.exe执行，确保路径解析正确
    return execSync(cmd, { 
      stdio: 'inherit', 
      shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
      ...options 
    });
  } catch (error) {
    // 增强错误信息
    throw new Error(`命令执行失败: ${cmd}\n错误详情: ${error.message}`);
  }
};

// 主流程
(async () => {
  try {
    console.log(`当前项目目录: ${ROOT_DIR}`);
    console.log(`安装包目录: ${RELEASE_DIR}`);

    // 1. 检查release目录是否存在
    try {
      await fs.access(RELEASE_DIR);
    } catch {
      throw new Error(`安装包目录不存在: ${RELEASE_DIR}\n请先执行打包命令确认生成成功`);
    }

    // 2. 查找安装包文件（兼容不同命名格式）
    const files = await fs.readdir(RELEASE_DIR);
    const installers = files.filter(file => 
      (file.endsWith('.exe') || file.endsWith('.msi')) && 
      (file.includes('Setup') || file.includes('installer')) &&
      file.includes(packageJson.build.productName)
    );

    if (installers.length === 0) {
      throw new Error(`在 ${RELEASE_DIR} 中未找到安装包\n目录内容: ${files.join(', ')}`);
    }

    console.log(`📦 找到安装包: ${installers.join(', ')}`);

    // 3. 检查文件是否真的存在（防止文件名匹配但实际不存在的情况）
    for (const file of installers) {
      const filePath = path.join(RELEASE_DIR, file);
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`安装包文件不存在: ${filePath}`);
      }
    }

    // 4. 检查Git工作区状态
    try {
      exec('git diff --quiet --exit-code', { stdio: 'ignore' });
    } catch {
      throw new Error('Git工作区存在未提交的更改，请先提交或执行 git stash');
    }

    // 5. 构建要提交的文件路径（使用相对路径避免Windows绝对路径问题）
    const relativePaths = installers.map(file => 
      path.relative(ROOT_DIR, path.join(RELEASE_DIR, file))
    );
    // 处理Windows路径分隔符（替换为/，Git更兼容）
    const gitFriendlyPaths = relativePaths.map(p => p.replace(/\\/g, '/'));
    // 用单引号包裹路径（Windows cmd中双引号可能被解析问题）
    const quotedPaths = gitFriendlyPaths.map(p => `'${p}'`);

    console.log('🔄 开始同步到Git...');
    console.log('要提交的文件:', quotedPaths.join(' '));

    // 6. 执行Git操作
    exec(`git add ${quotedPaths.join(' ')}`);
    
    // 7. 提交（允许空提交，避免无变更时出错）
    try {
      exec(`git commit -m "${COMMIT_MESSAGE}" --allow-empty`);
    } catch {
      console.log('ℹ️ 没有新内容需要提交');
    }
    
    // 8. 推送代码和标签
    exec('git push origin main');
    
    try {
      exec(`git rev-parse ${TAG_NAME}`, { stdio: 'ignore' });
      console.log(`ℹ️ 标签 ${TAG_NAME} 已存在，跳过创建`);
    } catch {
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
    