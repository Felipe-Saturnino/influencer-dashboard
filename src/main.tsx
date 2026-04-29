import "./styles/global.css";
import "./styles/responsive.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { reloadAfterChunkError } from "./lib/chunkReloadGuard";
import { initObservability } from "./lib/observability";

initObservability();

/** Apenas erros típicos de import dinâmico / chunk (evita falso positivo em outras promises). */
function isChunkLoadError(err: unknown): boolean {
  if (err instanceof Error && err.name === "ChunkLoadError") return true;
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("chunk load error") ||
    (msg.includes("loading css chunk") && msg.includes("failed")) ||
    (msg.includes("loading chunk") && (msg.includes("failed") || msg.includes("error")))
  );
}
window.addEventListener("unhandledrejection", (ev) => {
  if (!isChunkLoadError(ev.reason)) return;
  ev.preventDefault();
  reloadAfterChunkError("unhandledrejection");
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
