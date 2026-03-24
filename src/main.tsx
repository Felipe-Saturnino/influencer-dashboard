import "./styles/global.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Detecta falha de carregamento de chunks (ex.: app atualizado, cache antigo) e recarrega
function isChunkLoadError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("loading chunk") ||
    msg.includes("chunkloaderror") ||
    msg.includes("importing a module script failed")
  );
}
window.addEventListener("unhandledrejection", (ev) => {
  if (isChunkLoadError(ev.reason)) {
    ev.preventDefault();
    console.warn("[App] ChunkLoadError — recarregando para aplicar nova versão.");
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
