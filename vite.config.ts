import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
// NOTE: vite-plugin-pwa was removed in favour of the dedicated push
// service worker at public/sw.js. Shipping both produced two competing
// /sw.js files in dist and broke registration inside the iOS WKWebView
// shell. Push registration is handled by `usePushNotifications`.

const APP_VERSION = "2026.04.27";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: ".",
  build: {
    outDir: "dist",
  },
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    mcpPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
