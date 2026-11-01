import path from "node:path";
import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so tests do not load the dev-only plugins.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "node", include: ["src/tests/**/*.test.ts"] },
});
