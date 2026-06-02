import type { ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import type { RhFigurinoEmprestimo, RhFigurinoPeca } from "./types";
import { fmtDataSóDia, labelCondicaoPeca, labelEmprestadoParaTabela } from "./figurinosPageHelpers";

export function BlocoResumoPecaBasico({
  peca,
  operadorasTexto,
  t,
}: {
  peca: RhFigurinoPeca;
  operadorasTexto: string;
  t: ReturnType<typeof useApp>["theme"];
}) {
  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: `1px solid ${t.cardBorder}` }}>
      <span style={{ color: t.textMuted, fontSize: 12 }}>{label}</span>
      <span style={{ color: t.text, fontSize: 13, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${t.cardBorder}`,
        marginBottom: 14,
        fontFamily: FONT.body,
      }}
    >
      {row("Código", peca.code)}
      {row("Operadora", operadorasTexto)}
      {row("Categoria", peca.category)}
      {row("Tamanho", peca.size)}
      {row("Data de aquisição", fmtDataSóDia(peca.purchase_date))}
      {row("Condição", labelCondicaoPeca(peca.condition))}
    </div>
  );
}