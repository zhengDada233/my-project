// src/components/AutoUpdater/AutoUpdater.ts
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { logger } from '../../utils/logger';

export default defineComponent({
  name: 'AutoUpdater',
  setup() {
    const showUpdateUI = ref(false);
    const updateMessage = ref('正在检查更新...');
    const updateAvailable = ref(false);
    const updateDownloaded = ref(false);
    const downloading = ref(false);
    const downloadProgress = ref(0);
    const checking = ref(false);
    const showActions = ref(false);
    const notificationClass = ref('info');

    const checkForUpdates = async () => {
      if (!window.electronAPI) return;
      
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

    const downloadUpdate = () => {
      // 下载由主进程自动处理，这里只是更新UI状态
      downloading.value = true;
      updateMessage.value = '正在下载更新...';
      notificationClass.value = 'info';
    };

    const restartApp = async () => {
      if (!window.electronAPI) return;
      
      try {
        await window.electronAPI.restartAndUpdate();
      } catch (error) {
        logger.error('重启应用失败:', error);
      }
    };

    // 设置事件监听器
    const setupListeners = () => {
      if (!window.electronAPI) return;

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
      });

      window.electronAPI.onUpdateNotAvailable((_, info) => {
        updateMessage.value = '当前已是最新版本';
        notificationClass.value = 'info';
        showActions.value = true;
        
        // 3秒后隐藏通知
        setTimeout(() => {
          showUpdateUI.value = false;
        }, 3000);
      });

      window.electronAPI.onUpdateError((_, message) => {
        updateMessage.value = `更新错误: ${message}`;
        notificationClass.value = 'error';
        showActions.value = true;
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

    onMounted(() => {
      if (window.electronAPI) {
        setupListeners();
        
        // 应用启动时检查更新
        setTimeout(() => {
          checkForUpdates();
        }, 5000); // 延迟5秒检查，避免影响应用启动
      }
    });

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