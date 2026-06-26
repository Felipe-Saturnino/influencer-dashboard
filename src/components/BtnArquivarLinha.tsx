import { Archive } from "lucide-react";

import { useApp } from "../context/AppContext";
import {
  BTN_ARQUIVAR_LINHA_BORDER_RADIUS,
  BTN_ARQUIVAR_LINHA_ICON_SIZE,
  BTN_ARQUIVAR_LINHA_SIZE,
  labelTooltipArquivar,
} from "../lib/arquivarItemUi";
import { propsBotaoIcone } from "../lib/iconOnlyButtonA11y";

export interface BtnArquivarLinhaProps {
  /** Fragmento após «Arquivar» no tooltip — ex.: «informativo Black Friday». Ver `descricaoBotaoArquivar`. */
  descricaoItem: string;
  onClick: () => void;
  disabled?: boolean;
  iconSize?: number;
  /** Largura/altura do botão (px). */
  size?: number;
}

/** Botão só ícone (`Archive`) para arquivamento em linha de tabela — estilo neutro de ação de linha. */
export function BtnArquivarLinha({
  descricaoItem,
  onClick,
  disabled = false,
  iconSize = BTN_ARQUIVAR_LINHA_ICON_SIZE,
  size = BTN_ARQUIVAR_LINHA_SIZE,
}: BtnArquivarLinhaProps) {
  const { theme: t } = useApp();
  const label = labelTooltipArquivar(descricaoItem);

  return (
    <button
      type="button"
      {...propsBotaoIcone(label)}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        background: t.inputBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: BTN_ARQUIVAR_LINHA_BORDER_RADIUS,
        cursor: disabled ? "not-allowed" : "pointer",
        color: t.textMuted,
        opacity: disabled ? 0.65 : 1,
        flexShrink: 0,
      }}
    >
      <Archive size={iconSize} aria-hidden="true" />
    </button>
  );
}
