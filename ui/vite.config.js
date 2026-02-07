import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  base: './',
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5175'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
