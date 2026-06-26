import { Trash2 } from "lucide-react";

import {

  BTN_EXCLUIR_LINHA_BORDER,

  BTN_EXCLUIR_LINHA_BORDER_RADIUS,

  BTN_EXCLUIR_LINHA_COLOR,

  BTN_EXCLUIR_LINHA_ICON_SIZE,

  BTN_EXCLUIR_LINHA_SIZE,

  labelTooltipExcluir,

} from "../lib/excluirItemUi";

import { propsBotaoIcone } from "../lib/iconOnlyButtonA11y";



export interface BtnExcluirLinhaProps {

  /** Fragmento após «Excluir» no tooltip — ex.: «mesa Speed Baccarat». Ver `descricaoBotaoExcluir`. */

  descricaoItem: string;

  onClick: () => void;

  disabled?: boolean;

  iconSize?: number;

  /** Largura/altura do botão (px). */

  size?: number;

}



/** Botão só ícone (Trash2 vermelho) para exclusão em linha de tabela/card/lista. */

export function BtnExcluirLinha({

  descricaoItem,

  onClick,

  disabled = false,

  iconSize = BTN_EXCLUIR_LINHA_ICON_SIZE,

  size = BTN_EXCLUIR_LINHA_SIZE,

}: BtnExcluirLinhaProps) {

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

        width: size,

        height: size,

        background: "transparent",

        border: BTN_EXCLUIR_LINHA_BORDER,

        borderRadius: BTN_EXCLUIR_LINHA_BORDER_RADIUS,

        cursor: disabled ? "not-allowed" : "pointer",

        color: BTN_EXCLUIR_LINHA_COLOR,

        opacity: disabled ? 0.65 : 1,

        flexShrink: 0,

      }}

    >

      <Trash2 size={iconSize} aria-hidden="true" />

    </button>

  );

}


