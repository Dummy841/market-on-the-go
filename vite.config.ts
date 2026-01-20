import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure only one copy of React is used (prevents issues with Capacitor plugins)
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Pre-bundle these dependencies to avoid React duplication
    include: ['react', 'react-dom', '@capacitor/core', '@capacitor/local-notifications'],
  },
}));
