/**
 * App config from env. Use VITE_ prefix for client-exposed values.
 */
export const config = {
  api: {
    url: import.meta.env.VITE_API_URL || 'http://localhost:4001',
    graphqlEndpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4001/graphql',
    uploadEndpoint: import.meta.env.VITE_UPLOAD_URL || 'http://localhost:4001/api/upload',
    authLoginEndpoint: import.meta.env.VITE_AUTH_LOGIN_ENDPOINT || 'http://localhost:4001/api/auth/login',
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || '5Rivers Command Center',
  },
} as const;
