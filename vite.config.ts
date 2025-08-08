import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Path resolution
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/desktop/src"),
      "@/components": path.resolve(__dirname, "./apps/desktop/src/components"),
      "@/services": path.resolve(__dirname, "./apps/desktop/src/services"),
      "@/types": path.resolve(__dirname, "./apps/desktop/src/types"),
      "@/utils": path.resolve(__dirname, "./apps/desktop/src/utils"),
      "@/hooks": path.resolve(__dirname, "./apps/desktop/src/hooks"),
      "@/lib": path.resolve(__dirname, "./apps/desktop/src/lib"),
      "@espice/ui": path.resolve(__dirname, "./packages/ui/src"),
    },
  },

  // Optimize PDF.js dependencies
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },

  // Ensure PDF.js worker is properly handled
  assetsInclude: ['**/*.worker.js', '**/*.worker.min.js'],

  // Server configuration
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}); 