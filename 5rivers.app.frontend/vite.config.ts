import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '3000', 10),
    host: process.env.VITE_DEV_HOST || 'localhost',
    allowedHosts: ['.5riverstruckinginc.ca', 'localhost'],
  },
})
