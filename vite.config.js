import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ mode }) => {
  const certPath = path.resolve(__dirname, 'backend/cert.pem')
  const keyPath  = path.resolve(__dirname, 'backend/key.pem')
  const hasCert  = fs.existsSync(certPath) && fs.existsSync(keyPath)

  return {
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: hasCert ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) } : undefined,
    proxy: {
      '/api': { target: 'https://localhost:8000', ws: true, changeOrigin: true, secure: false },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    include: ['src/tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/tests/**', 'src/main.jsx'],
    },
  },
  }
})
