import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tauri 期望固定端口，前端构建产物到 dist
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },
  build: {
    target: 'es2021',
    outDir: 'dist'
  }
})
