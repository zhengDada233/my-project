// src/env.d.ts
/**
 * 环境变量类型定义
 */
interface ImportMetaEnv {
  [key: string]: string | boolean | undefined;
  VITE_APP_NAME: string;
  VITE_APP_VERSION: string;
  VITE_DEV: boolean;
  VITE_PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 注意：已删除Window接口声明，统一由src/api/electron.ts管理
