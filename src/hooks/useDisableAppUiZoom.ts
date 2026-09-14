import { useEffect } from "react";

const CLASS_NO_UI_ZOOM = "app-no-ui-zoom";

/**
 * Desativa o zoom do `#root` enquanto telas de auth / SemAcesso / canal público estão montadas.
 * Evita desalinhamento de clique (hit-testing) com `zoom` no Chromium.
 */
export function useDisableAppUiZoom(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add(CLASS_NO_UI_ZOOM);
    return () => {
      root.classList.remove(CLASS_NO_UI_ZOOM);
    };
  }, [enabled]);
}
