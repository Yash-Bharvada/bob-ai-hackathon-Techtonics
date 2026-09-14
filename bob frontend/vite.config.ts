import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "./",
  publicDir: "public",
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
