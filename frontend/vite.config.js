import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
  build: {
    rollupOptions: {
      input: {
        root: resolve(rootDir, 'index.html'),
        portal: resolve(rootDir, 'apps/portal/index.html'),
        admin: resolve(rootDir, 'apps/admin/index.html'),
        user: resolve(rootDir, 'apps/user/index.html'),
      },
    },
  },
})
