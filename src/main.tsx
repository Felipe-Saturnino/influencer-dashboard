import "./styles/global.css";
import "./styles/responsive.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { limparParamCacheBustDaUrl, registerChunkReloadListeners } from "./lib/chunkReloadGuard";
import { initObservability } from "./lib/observability";
import { queryClient } from "./lib/queryClient";

limparParamCacheBustDaUrl();
initObservability();
registerChunkReloadListeners();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
