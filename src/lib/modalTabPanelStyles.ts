import type { CSSProperties } from "react";

/** Painéis de aba em modal de edição permanecem montados; inativos usam `hidden`. */
export function getModalTabPanelProps(active: boolean): {
  hidden: boolean;
  tabIndex: 0 | -1;
  style?: CSSProperties;
} {
  return {
    hidden: !active,
    tabIndex: active ? 0 : -1,
  };
}
