import type { CSSProperties } from "react";
import { UserPlus } from "lucide-react";
import { FONT } from "../constants/theme";

const labelStyleBase: CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "1.1px",
  textTransform: "uppercase",
  color: "var(--prospecto-registro-label, inherit)",
  marginBottom: 5,
  fontFamily: FONT.body,
};

export type ProspectoRegistroMetaProps = {
  registradoPorNome: string | null;
  dataRegistroFmt: string;
  /** Modal editar: permite botão Atribuir a mim quando created_by vazio. */
  editMode?: boolean;
  podeAtribuir?: boolean;
  /** Usuário clicou em Atribuir a mim (pendente de Salvar). */
  atribuirPendente?: boolean;
  atribuirNomePreview?: string | null;
  onAtribuirAMim?: () => void;
  textColor: string;
  textMuted: string;
  cardBorder: string;
  inputBg: string;
};

export function ProspectoRegistroMeta({
  registradoPorNome,
  dataRegistroFmt,
  editMode = false,
  podeAtribuir = false,
  atribuirPendente = false,
  atribuirNomePreview,
  onAtribuirAMim,
  textColor,
  textMuted,
  cardBorder,
  inputBg,
}: ProspectoRegistroMetaProps) {
  const labelStyle: CSSProperties = { ...labelStyleBase, color: textMuted };
  const valorStyle: CSSProperties = { fontSize: 13, color: textColor, fontFamily: FONT.body };
  const nomeExibido =
    registradoPorNome ?? (atribuirPendente ? (atribuirNomePreview ?? "—") : null);

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${cardBorder}`,
        background: inputBg,
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <span style={labelStyle}>Registrado por</span>
        {nomeExibido ? (
          <div style={valorStyle}>
            {nomeExibido}
            {atribuirPendente && editMode ? (
              <span style={{ fontSize: 11, color: textMuted, marginLeft: 6 }}>(pendente de salvar)</span>
            ) : null}
          </div>
        ) : (
          <div style={{ ...valorStyle, color: textMuted }}>—</div>
        )}
        {editMode && podeAtribuir && !registradoPorNome && !atribuirPendente && onAtribuirAMim ? (
          <button
            type="button"
            onClick={onAtribuirAMim}
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: `1px solid ${cardBorder}`,
              background: "transparent",
              color: textColor,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            <UserPlus size={14} aria-hidden="true" />
            Atribuir a mim
          </button>
        ) : null}
      </div>
      <div>
        <span style={labelStyle}>Data de Registro</span>
        <div style={valorStyle}>{dataRegistroFmt}</div>
      </div>
    </div>
  );
}
