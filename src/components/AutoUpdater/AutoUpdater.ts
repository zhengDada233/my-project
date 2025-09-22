import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { logger } from '../../utils/logger';

// 定义更新相关类型
interface UpdateInfo {
  version: string;
  releaseDate: string;
  changelog?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

// 扩展Window接口以包含electronAPI
declare global {
  interface Window {
    electronAPI: {
      checkForUpdates: () => Promise<void>;
      downloadUpdate: () => Promise<void>;
      restartAndUpdate: () => Promise<void>;
      onUpdateStatus: (callback: (event: Electron.IpcRendererEvent, message: string) => void) => void;
      onUpdateAvailable: (callback: (event: Electron.IpcRendererEvent, info: UpdateInfo) => void) => void;
      onUpdateNotAvailable: (callback: (event: Electron.IpcRendererEvent, info: UpdateInfo) => void) => void;
      onUpdateError: (callback: (event: Electron.IpcRendererEvent, message: string) => void) => void;
      onDownloadProgress: (callback: (event: Electron.IpcRendererEvent, progress: DownloadProgress) => void) => void;
      onUpdateDownloaded: (callback: (event: Electron.IpcRendererEvent, info: UpdateInfo) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export default defineComponent({
  name: 'AutoUpdater',
  setup() {
    // 状态管理
    const showUpdateUI = ref<boolean>(false);
    const updateMessage = ref<string>('正在检查更新...');
    const updateAvailable = ref<boolean>(false);
    const updateDownloaded = ref<boolean>(false);
    const downloading = ref<boolean>(false);
    const downloadProgress = ref<number>(0);
    const checking = ref<boolean>(false);
    const showActions = ref<boolean>(false);
    const notificationClass = ref<string>('info');

    // 检查更新
    const checkForUpdates = async (): Promise<void> => {
      if (!window.electronAPI) {
        logger.error('electronAPI未定义');
        return;
      }
      
      checking.value = true;
      showUpdateUI.value = true;
      updateMessage.value = '正在检查更新...';
      notificationClass.value = 'info';
      
      try {
        await window.electronAPI.checkForUpdates();
      } catch (error) {
        logger.error('检查更新失败:', error);
        updateMessage.value = '检查更新失败';
        notificationClass.value = 'error';
      } finally {
        checking.value = false;
      }
    };

    // 下载更新
    const downloadUpdate = (): void => {
      if (!window.electronAPI) {
        logger.error('electronAPI未定义');
        return;
      }
      
      // 触发主进程开始下载更新
      window.electronAPI.downloadUpdate().catch(err => {
        logger.error('开始下载更新失败:', err);
        updateMessage.value = '开始下载更新失败';
        notificationClass.value = 'error';
      });
      
      // 更新UI状态
      downloading.value = true;
      updateMessage.value = '正在准备下载更新...';
      notificationClass.value = 'info';
    };

    // 重启应用
    const restartApp = async (): Promise<void> => {
      if (!window.electronAPI) {
        logger.error('electronAPI未定义');
        return;
      }
      
      try {
        await window.electronAPI.restartAndUpdate();
      } catch (error) {
        logger.error('重启应用失败:', error);
      }
    };

    // 设置事件监听器
    const setupListeners = (): void => {
      if (!window.electronAPI) {
        logger.error('electronAPI未定义');
        return;
      }

      window.electronAPI.onUpdateStatus((_, message) => {
        updateMessage.value = message;
        notificationClass.value = 'info';
        showUpdateUI.value = true;
      });

      window.electronAPI.onUpdateAvailable((_, info) => {
        updateAvailable.value = true;
        updateMessage.value = `发现新版本: ${info.version}`;
        notificationClass.value = 'success';
        showActions.value = true;
        downloading.value = false;
      });

      window.electronAPI.onUpdateNotAvailable((_, info) => {
        updateMessage.value = '当前已是最新版本';
        notificationClass.value = 'info';
        showActions.value = true;
        updateAvailable.value = false;
        downloading.value = false;
        
        // 3秒后隐藏通知
        setTimeout(() => {
          showUpdateUI.value = false;
        }, 3000);
      });

      window.electronAPI.onUpdateError((_, message) => {
        updateMessage.value = `更新错误: ${message}`;
        notificationClass.value = 'error';
        showActions.value = true;
        downloading.value = false;
      });

      window.electronAPI.onDownloadProgress((_, progress) => {
        downloading.value = true;
        downloadProgress.value = progress.percent;
        updateMessage.value = `下载中: ${Math.round(progress.percent)}%`;
        notificationClass.value = 'info';
      });

      window.electronAPI.onUpdateDownloaded((_, info) => {
        downloading.value = false;
        updateDownloaded.value = true;
        updateMessage.value = '更新已下载完成，请重启应用';
        notificationClass.value = 'success';
        showActions.value = true;
      });
    };

    // 组件挂载时设置监听器并检查更新
    onMounted(() => {
      if (window.electronAPI) {
        setupListeners();
        
        // 应用启动时检查更新
        const timer = setTimeout(() => {
          checkForUpdates();
        }, 5000); // 延迟5秒检查，避免影响应用启动

        // 清理定时器
        onUnmounted(() => {
          clearTimeout(timer);
        });
      }
    });

    // 组件卸载时移除监听器
    onUnmounted(() => {
      if (window.electronAPI) {
        // 移除所有事件监听器
        window.electronAPI.removeAllListeners('update-status');
        window.electronAPI.removeAllListeners('update-available');
        window.electronAPI.removeAllListeners('update-not-available');
        window.electronAPI.removeAllListeners('update-error');
        window.electronAPI.removeAllListeners('download-progress');
        window.electronAPI.removeAllListeners('update-downloaded');
      }
    });

    return {
      showUpdateUI,
      updateMessage,
      updateAvailable,
      updateDownloaded,
      downloading,
      downloadProgress,
      checking,
      showActions,
      notificationClass,
      checkForUpdates,
      downloadUpdate,
      restartApp
    };
  }
});
    