import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["locationValidator.test.ts"],
  },
  define: {
    // Stub import.meta.env.DEV so transformerLocations.ts does not crash at test time
    "import.meta.env.DEV": "false",
  },
});
