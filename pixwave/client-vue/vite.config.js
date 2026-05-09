import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      includeAssets: ["icon-192.svg", "icon-512.svg"],
      manifest: {
        name: "PixWave FM — AI 音乐电台",
        short_name: "PixWave FM",
        description: "你的个性化 AI 音乐电台 DJ · 像素风复古终端",
        theme_color: "#0A0A0A",
        background_color: "#0A0A0A",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
          { src: "icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/localhost:3000\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 120 },
            },
          },
          {
            urlPattern: /^https?:\/\/localhost:3000\/audio\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "audio-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/ws": { target: "ws://localhost:3000", ws: true },
      "/audio": "http://localhost:3000",
    },
  },
});
