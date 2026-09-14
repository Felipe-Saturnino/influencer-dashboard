export type PainelPortalPos = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

export const PAINEL_PORTAL_GAP = 6;
export const PAINEL_PORTAL_PAD = 8;
export const PAINEL_PORTAL_CAP = 320;
export const PAINEL_PORTAL_Z = 1200;

/** Posição `fixed` do painel de seleção, ancorada no trigger (modais com overflow). */
export function posicaoPainelPortal(
  trigger: DOMRect,
  opts: { minWidth: number; matchTriggerWidth: boolean },
): PainelPortalPos {
  const width = opts.matchTriggerWidth ? Math.max(trigger.width, 160) : Math.max(opts.minWidth, 240);
  let left = trigger.left;
  if (left + width > window.innerWidth - PAINEL_PORTAL_PAD) {
    left = Math.max(PAINEL_PORTAL_PAD, window.innerWidth - PAINEL_PORTAL_PAD - width);
  }
  if (left < PAINEL_PORTAL_PAD) left = PAINEL_PORTAL_PAD;

  const spaceBelow = window.innerHeight - trigger.bottom - PAINEL_PORTAL_PAD;
  const spaceAbove = trigger.top - PAINEL_PORTAL_PAD;
  const placeBelow = spaceBelow >= Math.min(PAINEL_PORTAL_CAP, 180) || spaceBelow >= spaceAbove;

  if (placeBelow) {
    return {
      top: trigger.bottom + PAINEL_PORTAL_GAP,
      left,
      width,
      maxHeight: Math.min(PAINEL_PORTAL_CAP, Math.max(140, spaceBelow)),
    };
  }
  return {
    bottom: window.innerHeight - trigger.top + PAINEL_PORTAL_GAP,
    left,
    width,
    maxHeight: Math.min(PAINEL_PORTAL_CAP, Math.max(140, spaceAbove)),
  };
}
