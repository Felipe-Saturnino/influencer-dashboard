import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL ?? "";

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom"],
            "vendor-supabase": ["@supabase/supabase-js"],
            "vendor-charts": ["recharts"],
            "vendor-icons": ["react-icons", "lucide-react"],
            /** PDF / etiquetas RH — isolado para não diluir o chunk principal ao navegar noutras áreas */
            "vendor-jspdf": ["jspdf"],
            /** QR em Links & Materiais e exports */
            "vendor-qrcode": ["qrcode", "qrcode.react"],
          },
        },
      },
      chunkSizeWarningLimit: 550,
    },
    server: {
      proxy: {
        "/api/criar-usuario": {
          target: supabaseUrl || "https://dzyuqibobeujzedomlsc.supabase.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/functions/v1"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, _req) => {
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
            proxy.on("proxyReq", (proxyReq, _req) => {
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
            proxy.on("proxyReq", (proxyReq, _req) => {
              const key = env.VITE_SUPABASE_ANON_KEY;
              if (key) proxyReq.setHeader("Apikey", key);
            });
          },
        },
        "/api/admin-usuario-acao": {
          target: supabaseUrl || "https://dzyuqibobeujzedomlsc.supabase.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/functions/v1"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, _req) => {
              const key = env.VITE_SUPABASE_ANON_KEY;
              if (key) proxyReq.setHeader("Apikey", key);
            });
          },
        },
      },
    },
  };
});
