import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const apiTarget = `http://127.0.0.1:${Number(process.env.API_PORT || 3001)}`

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: Number(process.env.WEB_PORT || 5173),
    strictPort: true,
    proxy: { '/api': { target: apiTarget, rewrite: (path) => path.replace(/^\/api/, '') } },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: { '/api': { target: apiTarget, rewrite: (path) => path.replace(/^\/api/, '') } },
  },
  build: { chunkSizeWarningLimit: 650 },
})
