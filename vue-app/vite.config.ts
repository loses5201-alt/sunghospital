import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const isProd = process.env.NODE_ENV === 'production'
const base = isProd ? '/sunghospital/app/' : '/'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      base,
      manifest: {
        name: '宋俊宏婦幼醫院管理系統',
        short_name: '宋俊宏婦幼',
        description: '婦幼醫院內部管理平台',
        theme_color: '#1a3c5e',
        background_color: '#1a3c5e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/sunghospital/app/',
        start_url: '/sunghospital/app/',
        icons: [
          { src: 'pwa-192.png',          sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png',          sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png',          sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/sunghospital/app/index.html',
        // Firebase RTDB 不快取，永遠走網路（避免顯示過期資料）
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  base,
  build: {
    outDir: '../app',
    emptyOutDir: true,
  },
})
