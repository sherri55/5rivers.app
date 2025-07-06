export const config = {
  api: {
    url: import.meta.env.VITE_API_URL || 'http://localhost:4001',
    graphqlEndpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4001/graphql',
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || '5Rivers Trucking Management',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    description: import.meta.env.VITE_APP_DESCRIPTION || 'Professional trucking and logistics management system',
  },
  dev: {
    port: parseInt(import.meta.env.VITE_DEV_PORT || '3000', 10),
    host: import.meta.env.VITE_DEV_HOST || 'localhost',
  },
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    debugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
    offlineMode: import.meta.env.VITE_ENABLE_OFFLINE_MODE === 'true',
  },
  ui: {
    defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'light',
    paginationPageSize: parseInt(import.meta.env.VITE_PAGINATION_PAGE_SIZE || '20', 10),
    searchDebounceMs: parseInt(import.meta.env.VITE_SEARCH_DEBOUNCE_MS || '300', 10),
  },
  upload: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedFileTypes: import.meta.env.VITE_ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'pdf'],
  },
  toast: {
    duration: parseInt(import.meta.env.VITE_TOAST_DURATION || '5000', 10),
    position: import.meta.env.VITE_TOAST_POSITION || 'top-right',
  },
  cache: {
    durationMs: parseInt(import.meta.env.VITE_CACHE_DURATION_MS || '300000', 10), // 5 minutes
  },
} as const;

// Type definitions for better TypeScript support
export type Config = typeof config;
export type ThemeType = 'light' | 'dark' | 'system';
export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
