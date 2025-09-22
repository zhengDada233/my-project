interface ImportMetaEnv {
  [key: string]: string | boolean | undefined;
  VITE_APP_NAME?: string;
  VITE_API_URL?: string;
  VITE_ENV?: 'development' | 'production' | 'test';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 扩展全局Window类型
interface Window {
  electronAPI?: any;
}
    