import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL ?? "";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/criar-usuario": {
          target: supabaseUrl || "https://dzyuqibobeujzedomlsc.supabase.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/functions/v1"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              const key = env.VITE_SUPABASE_ANON_KEY;
              if (key) proxyReq.setHeader("Apikey", key);
            });
          },
        },
        "/api/criar-usuario-scout": {
          target: supabaseUrl || "https://dzyuqibobeujzedomlsc.supabase.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/functions/v1"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              const key = env.VITE_SUPABASE_ANON_KEY;
              if (key) proxyReq.setHeader("Apikey", key);
            });
          },
        },
        "/api/atualizar-perfil": {
          target: supabaseUrl || "https://dzyuqibobeujzedomlsc.supabase.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/functions/v1"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              const key = env.VITE_SUPABASE_ANON_KEY;
              if (key) proxyReq.setHeader("Apikey", key);
            });
          },
        },
      },
    },
  };
});
