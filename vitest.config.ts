import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.ts: that config is async and throws
// without Contentful credentials, which unit tests have no business needing.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
