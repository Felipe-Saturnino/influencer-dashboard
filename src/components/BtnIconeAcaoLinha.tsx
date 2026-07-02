import type { CSSProperties, ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { getBtnIconeAcaoLinhaStyle } from "../lib/btnIconeAcaoLinhaStyles";
import { propsBotaoIcone } from "../lib/iconOnlyButtonA11y";

export interface BtnIconeAcaoLinhaProps {
  /** Rótulo do tooltip e `aria-label` — título exato do modal (`tooltipModal` / `tituloModalPerformanceHub`). */
  label: string;
  onClick: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  children: ReactNode;
}

/** Botão só ícone em linha de tabela/lista — tooltip nativo obrigatório via `label`. */
export function BtnIconeAcaoLinha({
  label,
  onClick,
  disabled = false,
  style,
  children,
}: BtnIconeAcaoLinhaProps) {
  const { theme: t } = useApp();

  return (
    <button
      type="button"
      {...propsBotaoIcone(label)}
      disabled={disabled}
      onClick={onClick}
      style={{ ...getBtnIconeAcaoLinhaStyle(t), ...style }}
    >
      {children}
    </button>
  );
}
