import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
    ],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@ru/ui": path.resolve(__dirname, "packages/ui/src"),
      "@ru/db": path.resolve(__dirname, "packages/db/src"),
      "@ru/config": path.resolve(__dirname, "packages/config/src"),
      "@ru/ghost-client": path.resolve(__dirname, "packages/ghost-client/src"),
      "@ru/listmonk-client": path.resolve(__dirname, "packages/listmonk-client/src"),
      "@ru/notifications": path.resolve(__dirname, "packages/notifications/src"),
    },
  },
});
