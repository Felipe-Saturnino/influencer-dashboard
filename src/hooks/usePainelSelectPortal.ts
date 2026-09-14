import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { posicaoPainelPortal, type PainelPortalPos } from "../lib/selectPainelPortal";

/**
 * Posiciona um painel de seleção em `position:fixed` (portal) ancorado no trigger.
 * Usar em dropdowns dentro de `ModalBase` — o overflow do diálogo corta `absolute`.
 */
export function usePainelSelectPortal({
  open,
  onClose,
  minWidth = 240,
  matchTriggerWidth = true,
}: {
  open: boolean;
  onClose: () => void;
  minWidth?: number;
  matchTriggerWidth?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PainelPortalPos | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      setPos(posicaoPainelPortal(el.getBoundingClientRect(), { minWidth, matchTriggerWidth }));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, minWidth, matchTriggerWidth]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const n = e.target as Node;
      if (triggerRef.current?.contains(n) || panelRef.current?.contains(n)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  return { triggerRef, panelRef, pos };
}
