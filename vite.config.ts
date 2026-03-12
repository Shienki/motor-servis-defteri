import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Motor Servis Defteri",
        short_name: "Motor Defteri",
        description: "Motosiklet servis kaydı, iş durumu ve borç takibi için saha odaklı uygulama.",
        theme_color: "#0f172a",
        background_color: "#e5e7eb",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/giris",
        lang: "tr",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png}"]
      }
    })
  ]
});
