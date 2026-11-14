import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '')
  const proxy = {
    '/api': {
      target: `http://127.0.0.1:${env.PORT || '5000'}`,
      changeOrigin: true,
    },
  }
  return {
    envDir: '..',
    plugins: [react()],
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    server: { proxy },
    preview: { proxy },
  }
})
