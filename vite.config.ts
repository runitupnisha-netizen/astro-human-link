import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["stellara-app-icon.png", "stellara-app-icon-192.png", "stellara-app-icon-512.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff2}"],
      },
      manifest: {
        name: "Stellara — Where Love Aligns With the Stars",
        short_name: "Stellara",
        description: "Discover meaningful connections through the ancient wisdom of Astrology, Human Design & Gene Keys.",
        theme_color: "#0a0a1a",
        background_color: "#0a0a1a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["lifestyle", "social"],
        icons: [
          {
            src: "/stellara-app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/stellara-app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/stellara-app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
