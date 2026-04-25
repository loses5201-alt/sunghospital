import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Build to ../app/ at repo root so GitHub Pages serves at
// https://loses5201-alt.github.io/sunghospital/app/
export default defineConfig({
  plugins: [vue()],
  base: process.env.NODE_ENV === 'production' ? '/sunghospital/app/' : '/',
  build: {
    outDir: '../app',
    emptyOutDir: true,
  },
})
