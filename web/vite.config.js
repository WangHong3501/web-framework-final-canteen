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
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        // 把变动频率低的第三方库拆成独立 chunk，业务代码更新时浏览器还能用旧缓存
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('element-plus')) return 'vendor-element'
          if (id.includes('/vant/')) return 'vendor-vant'
          if (
            id.includes('/vue/') ||
            id.includes('@vue/') ||
            id.includes('vue-router') ||
            id.includes('/pinia/') ||
            id.includes('pinia-plugin')
          )
            return 'vendor-vue'
          if (id.includes('/axios/')) return 'vendor-axios'
          if (id.includes('/gsap/')) return 'vendor-gsap'
          if (id.includes('lucide-vue-next')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
})
