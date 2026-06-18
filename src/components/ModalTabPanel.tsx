import type { CSSProperties, ReactNode } from "react";
import { getModalTabPanelProps } from "../lib/modalTabPanelStyles";

type ModalTabPanelProps = {
  active: boolean;
  id: string;
  labelledBy: string;
  children: ReactNode;
  style?: CSSProperties;
};

/** Painel de aba em modal — montado sempre; oculto com `hidden` quando inativo (pré-save entre abas). */
export function ModalTabPanel({ active, id, labelledBy, children, style }: ModalTabPanelProps) {
  const panel = getModalTabPanelProps(active);
  return (
    <div role="tabpanel" id={id} aria-labelledby={labelledBy} hidden={panel.hidden} tabIndex={panel.tabIndex} style={style}>
      {children}
    </div>
  );
}
