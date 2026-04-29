import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL ?? "";

  return {
    plugins: [
      react(),
      mode === "analyze" &&
        visualizer({
          filename: "dist/stats.html",
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),
    build: {
      // Vite 8 (Rolldown): objeto `manualChunks` não é suportado — ver codeSplitting.groups
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: "vendor-react", test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/ },
              { name: "vendor-supabase", test: /[\\/]node_modules[\\/]@supabase[\\/]supabase-js[\\/]/ },
              { name: "vendor-charts", test: /[\\/]node_modules[\\/]recharts[\\/]/ },
              {
                name: "vendor-icons",
                test: /[\\/]node_modules[\\/](react-icons|lucide-react)[\\/]/,
              },
              /** PDF / etiquetas RH — isolado para não diluir o chunk principal ao navegar noutras áreas */
              { name: "vendor-jspdf", test: /[\\/]node_modules[\\/]jspdf[\\/]/ },
              /** QR em Links & Materiais e exports */
              {
                name: "vendor-qrcode",
                test: /[\\/]node_modules[\\/](qrcode|qrcode\.react)[\\/]/,
              },
            ],
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
        "/api/sync-rh-prestador-auth-user": {
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
