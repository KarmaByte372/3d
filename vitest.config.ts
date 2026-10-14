import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" yalnızca Next sunucu derlemesinde çalışır; testlerde boş modül
      "server-only": path.resolve(__dirname, "tests/empty.ts"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: "file:./test.db", SESSION_SECRET: "test-secret-test-secret-test-secret-123", SMS_PROVIDER: "log" },
    fileParallelism: false,
  },
});
