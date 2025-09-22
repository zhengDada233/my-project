const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// 项目根目录
const ROOT_DIR = path.resolve(__dirname, '..');
// 安装包目录
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
// 版本信息
const packageJson = require(path.join(ROOT_DIR, 'package.json'));
const VERSION = packageJson.version;
const TAG_NAME = `v${VERSION}`;
const COMMIT_MESSAGE = `chore(release): ${TAG_NAME}`;

// 执行命令并输出详细日志
const exec = (cmd) => {
  console.log(`📝 执行命令: ${cmd}`); // 输出实际执行的命令（关键排查依据）
  try {
    return execSync(cmd, {
      stdio: 'inherit',
      cwd: ROOT_DIR,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'
    });
  } catch (error) {
    throw new Error(`命令执行失败: ${error.message}\n执行的命令: ${cmd}`);
  }
};

// 检查.gitignore规则
const checkGitIgnore = async () => {
  try {
    const gitIgnorePath = path.join(ROOT_DIR, '.gitignore');
    const content = await fs.readFile(gitIgnorePath, 'utf8');
    const hasReleaseIgnore = content.includes('release/') || content.includes('release/*');
    const hasInstallerAllow = 
      content.includes('!release/*.exe') && 
      content.includes('!release/*.msi');

    console.log('\n🔍 .gitignore检查:');
    console.log(`- 是否忽略release目录: ${hasReleaseIgnore}`);
    console.log(`- 是否允许安装包: ${hasInstallerAllow}`);

    if (hasReleaseIgnore && !hasInstallerAllow) {
      console.warn('⚠️ .gitignore可能阻止安装包提交，请确认规则是否正确');
    }
  } catch (error) {
    console.log('⚠️ 未找到.gitignore文件，跳过检查');
  }
};

// 主流程
(async () => {
  try {
    console.log('=== 开始发布流程 ===');
    console.log(`项目根目录: ${ROOT_DIR}`);
    console.log(`安装包目录: ${RELEASE_DIR}`);

    // 1. 检查.gitignore
    await checkGitIgnore();

    // 2. 检查安装包目录
    try {
      await fs.access(RELEASE_DIR);
    } catch {
      throw new Error(`安装包目录不存在: ${RELEASE_DIR}\n请先执行 npm run dist:win`);
    }

    // 3. 查找安装包
    const files = await fs.readdir(RELEASE_DIR);
    const installers = files.filter(file => 
      (file.endsWith('.exe') || file.endsWith('.msi')) && 
      file.includes('Setup') &&
      file.includes(packageJson.build.productName)
    );

    if (installers.length === 0) {
      throw new Error(`未找到安装包\n目录内容: ${files.join(', ')}`);
    }
    console.log(`\n📦 找到安装包: ${installers.join(', ')}`);

    // 4. 构建文件路径（带强制参数）
    const filePaths = installers
      .map(file => path.join(RELEASE_DIR, file))
      .map(absPath => path.relative(ROOT_DIR, absPath).replace(/\\/g, '/'))
      .map(relPath => `"${relPath}"`); // Windows双引号包裹

    // 5. 强制添加（核心修复：确保-f参数生效）
    console.log('\n🔄 强制添加被忽略的文件...');
    const addCommand = `git add -f ${filePaths.join(' ')}`; // 明确添加-f
    exec(addCommand);

    // 6. 提交
    console.log('\n🔄 提交变更...');
    try {
      exec(`git commit -m "${COMMIT_MESSAGE}" --allow-empty`);
    } catch {
      console.log('ℹ️ 没有新内容需要提交');
    }

    // 7. 推送代码和标签
    console.log('\n🔄 推送至远程仓库...');
    exec('git push origin main');

    try {
      exec(`git rev-parse ${TAG_NAME}`, { stdio: 'ignore' });
      console.log(`ℹ️ 标签 ${TAG_NAME} 已存在`);
    } catch {
      exec(`git tag -a ${TAG_NAME} -m "${COMMIT_MESSAGE}"`);
      exec(`git push origin ${TAG_NAME}`);
      console.log(`🏷️ 已推送标签: ${TAG_NAME}`);
    }

    console.log('\n✅ 发布成功！');

  } catch (error) {
    console.error(`\n❌ 发布失败: ${error.message}`);
    process.exit(1);
  }
})();
    