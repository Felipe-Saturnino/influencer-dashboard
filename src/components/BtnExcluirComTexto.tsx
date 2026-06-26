import { Trash2 } from "lucide-react";
import { FONT } from "../constants/theme";
import {
  BTN_EXCLUIR_COM_TEXTO_GAP,
  BTN_EXCLUIR_COM_TEXTO_LABEL,
  BTN_EXCLUIR_COM_TEXTO_PADDING,
  BTN_EXCLUIR_LINHA_BORDER,
  BTN_EXCLUIR_LINHA_BORDER_RADIUS,
  BTN_EXCLUIR_LINHA_COLOR,
  BTN_EXCLUIR_LINHA_ICON_SIZE,
  labelTooltipExcluir,
} from "../lib/excluirItemUi";
import { propsBotaoIcone } from "../lib/iconOnlyButtonA11y";

export interface BtnExcluirComTextoProps {
  /** Fragmento após «Excluir» no tooltip — ex.: «vaga Analista», «denúncia PROTO-123». */
  descricaoItem: string;
  onClick: () => void;
  disabled?: boolean;
  iconSize?: number;
}

/** Botão Trash2 + texto «Excluir» — mesmo visual/função de `BtnExcluirLinha`, com rótulo visível. */
export function BtnExcluirComTexto({
  descricaoItem,
  onClick,
  disabled = false,
  iconSize = BTN_EXCLUIR_LINHA_ICON_SIZE,
}: BtnExcluirComTextoProps) {
  const label = labelTooltipExcluir(descricaoItem);

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
        gap: BTN_EXCLUIR_COM_TEXTO_GAP,
        padding: BTN_EXCLUIR_COM_TEXTO_PADDING,
        background: "transparent",
        border: BTN_EXCLUIR_LINHA_BORDER,
        borderRadius: BTN_EXCLUIR_LINHA_BORDER_RADIUS,
        cursor: disabled ? "not-allowed" : "pointer",
        color: BTN_EXCLUIR_LINHA_COLOR,
        opacity: disabled ? 0.65 : 1,
        flexShrink: 0,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: FONT.body,
      }}
    >
      <Trash2 size={iconSize} aria-hidden="true" />
      {BTN_EXCLUIR_COM_TEXTO_LABEL}
    </button>
  );
}
