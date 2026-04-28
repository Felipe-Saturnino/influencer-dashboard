import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    env: {
      /** Evita `createClient` sem URL ao importar páginas que puxam `AppContext` / `supabase`. */
      VITE_SUPABASE_URL: "https://vitest-placeholder.supabase.co",
      VITE_SUPABASE_ANON_KEY: "vitest-placeholder-anon-key",
    },
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/main.tsx",
        "src/types/**",
      ],
    },
  },
});
