/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_WORKER_APP_URL?: string;
  readonly VITE_APK_URL?: string;
  readonly VITE_PORTFOLIO_URL?: string;
  readonly VITE_UPWORK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
