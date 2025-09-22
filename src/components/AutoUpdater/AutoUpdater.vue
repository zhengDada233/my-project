<!-- src/components/AutoUpdater/AutoUpdater.vue -->
<template>
  <div class="auto-updater" v-if="showUpdateUI">
    <div class="update-notification" :class="notificationClass">
      <div class="update-content">
        <span class="update-message">{{ updateMessage }}</span>
        <div class="update-actions" v-if="showActions">
          <button @click="checkForUpdates" :disabled="checking">
            {{ checking ? '检查中...' : '检查更新' }}
          </button>
          <button @click="downloadUpdate" v-if="updateAvailable && !downloading" class="download-btn">
            下载更新
          </button>
          <button @click="restartApp" v-if="updateDownloaded" class="restart-btn">
            重启应用
          </button>
        </div>
      </div>
      <div class="progress-bar" v-if="downloading">
        <div class="progress" :style="{ width: `${downloadProgress}%` }"></div>
        <span class="progress-text">{{ Math.round(downloadProgress) }}%</span>
      </div>
    </div>
  </div>
</template>

<script src="./AutoUpdater.ts" lang="ts"></script>
<style src="./AutoUpdater.scss" lang="scss" scoped></style>