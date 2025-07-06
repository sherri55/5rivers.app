/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string
  readonly VITE_GRAPHQL_ENDPOINT: string
  
  // Application Configuration
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_DESCRIPTION: string
  
  // Development Configuration
  readonly VITE_DEV_PORT: string
  readonly VITE_DEV_HOST: string
  
  // Feature Flags
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_DEBUG_MODE: string
  readonly VITE_ENABLE_OFFLINE_MODE: string
  
  // UI Configuration
  readonly VITE_DEFAULT_THEME: string
  readonly VITE_PAGINATION_PAGE_SIZE: string
  readonly VITE_SEARCH_DEBOUNCE_MS: string
  
  // File Upload Configuration
  readonly VITE_MAX_FILE_SIZE: string
  readonly VITE_ALLOWED_FILE_TYPES: string
  
  // Toast/Notification Configuration
  readonly VITE_TOAST_DURATION: string
  readonly VITE_TOAST_POSITION: string
  
  // Cache Configuration
  readonly VITE_CACHE_DURATION_MS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
