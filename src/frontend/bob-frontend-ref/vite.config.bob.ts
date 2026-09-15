import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "./",
  publicDir: "public",
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy all /app requests to the React dashboard dev server
      "/app": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // Rewrite: /app → / so TanStack Start sees its own root routes
        rewrite: (path) => path.replace(/^\/app/, ""),
      },
      // Proxy backend API calls from the landing page context if needed
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
