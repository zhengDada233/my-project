// src/main/update.ts
import { autoUpdater } from "electron-updater";
import { ipcMain } from "electron";
import log from "electron-log";

// 配置自动更新日志
log.transports.file.level = "info";
autoUpdater.logger = log;

// 初始化自动更新（适配私人仓库）
export function initAutoUpdater() {
  // 私人仓库可能需要额外的请求头认证（如GitHub令牌）
  autoUpdater.requestHeaders = {
    "Authorization": `token ${process.env.GITHUB_TOKEN}` // 从环境变量获取令牌
  };

  // 检查更新（私人仓库的更新源）
  autoUpdater.checkForUpdates().catch(err => {
    log.error("检查更新失败:", err);
  });

  // 监听更新事件并通过IPC传递给渲染进程
  autoUpdater.on("update-available", () => {
    ipcMain.emit("update:available");
  });

  autoUpdater.on("update-downloaded", () => {
    ipcMain.emit("update:downloaded");
  });

  autoUpdater.on("error", (err) => {
    log.error("更新错误:", err);
    ipcMain.emit("update:error", err);
  });
}

// 暴露更新控制方法
ipcMain.handle("update:check", () => autoUpdater.checkForUpdates());
ipcMain.handle("update:download", () => autoUpdater.downloadUpdate());
ipcMain.handle("update:install", () => autoUpdater.quitAndInstall());
