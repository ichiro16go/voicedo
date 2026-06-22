import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

// .env をテスト時にロード（存在しなければ無視）
dotenv.config({ path: path.resolve(__dirname, ".env"), quiet: true });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".expo", "dist"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
