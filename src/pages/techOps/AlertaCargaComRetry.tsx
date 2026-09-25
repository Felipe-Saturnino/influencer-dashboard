import type { CSSProperties } from "react";
import { FONT } from "../../constants/theme";

const caixa: CSSProperties = {
  margin: "16px 0",
  padding: "14px 16px",
  borderRadius: 10,
  background: "rgba(232,64,37,0.12)",
  border: "1px solid rgba(232,64,37,0.35)",
  color: "#e84025",
  fontSize: 13,
  fontFamily: FONT.body,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
  justifyContent: "space-between",
};

const botao: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid rgba(232,64,37,0.35)",
  background: "rgba(232,64,37,0.08)",
  color: "#e84025",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT.body,
};

export function AlertaCargaComRetry({
  mensagem,
  onRetry,
}: {
  mensagem: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" aria-live="polite" style={caixa}>
      <span>{mensagem}</span>
      <button type="button" onClick={onRetry} style={botao}>
        Tentar de novo
      </button>
    </div>
  );
}
