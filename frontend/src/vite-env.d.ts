/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_USD_UYU_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
