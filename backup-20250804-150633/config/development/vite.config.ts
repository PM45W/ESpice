import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Path resolution
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../src"),
      "@/components": path.resolve(__dirname, "../../src/components"),
      "@/services": path.resolve(__dirname, "../../src/services"),
      "@/types": path.resolve(__dirname, "../../src/types"),
      "@/utils": path.resolve(__dirname, "../../src/utils"),
      "@/hooks": path.resolve(__dirname, "../../src/hooks"),
      "@/lib": path.resolve(__dirname, "../../src/lib"),
    },
  },

  // Optimize PDF.js dependencies
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },

  // Ensure PDF.js worker is properly handled
  assetsInclude: ['**/*.worker.js', '**/*.worker.min.js'],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, but allow fallback to avoid conflicts
  server: {
    port: 1420,
    strictPort: false, // Allow Vite to use next available port
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
