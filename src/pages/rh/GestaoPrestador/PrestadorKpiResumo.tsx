import { AlertCircle, CheckCircle2, Users } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { getPageContentBoxShellStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import { corStatusPrestador, motivosPrestadorCadastroIncompleto, type FiltroStatusPrestador } from "./gestaoPrestadorHelpers";

export interface ResumoPrestadoresCards {
  total: number;
  porStatus: { ativo: number; indisponivel: number; encerrado: number };
  incompletos: RhFuncionario[];
  revisaoPendente: RhFuncionario[];
  temOrganograma: boolean;
}

export function PrestadorKpiResumo({
  resumo,
  filtroStatus,
  podeEditar,
  onEditarPrestador,
}: {
  resumo: ResumoPrestadoresCards;
  filtroStatus: FiltroStatusPrestador;
  podeEditar: boolean;
  onEditarPrestador: (row: RhFuncionario) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const kpiTileShell = getPageContentBoxShellStyle(brand, t);

  return (
    <div className="app-grid-3" style={{ gap: 16, ...getPageKpiSectionGapStyle() }}>
      <div style={{ ...kpiTileShell, padding: 20, marginBottom: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            color: brand.useBrand ? brand.secondary : t.textMuted,
            letterSpacing: "1px",
            textTransform: "uppercase",
            fontFamily: FONT.body,
            marginBottom: 6,
          }}
        >
          <Users size={13} aria-hidden style={{ color: brand.useBrand ? brand.secondary : t.textMuted }} />
          Total de Prestadores
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: t.text,
            fontFamily: FONT_TITLE,
            marginBottom: filtroStatus === "disponiveis" ? 12 : 0,
            lineHeight: 1,
          }}
        >
          {resumo.total}
        </div>
        {filtroStatus === "disponiveis" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>Ativos</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: corStatusPrestador("ativo"), fontFamily: FONT.body }}>
                {resumo.porStatus.ativo}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>Indisponíveis</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: corStatusPrestador("indisponivel"),
                  fontFamily: FONT.body,
                }}
              >
                {resumo.porStatus.indisponivel}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          ...kpiTileShell,
          border: "1px solid rgba(232, 64, 37, 0.25)",
          padding: 20,
          marginBottom: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            color: "#e84025",
            letterSpacing: "1px",
            textTransform: "uppercase",
            fontFamily: FONT.body,
            marginBottom: 6,
          }}
        >
          <AlertCircle size={13} aria-hidden />
          Cadastro incompleto
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#e84025", fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>
          {resumo.incompletos.length}
        </div>
        {resumo.incompletos.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#22c55e", fontFamily: FONT.body }}>
            <CheckCircle2 size={14} aria-hidden />
            Todos os cadastros filtrados estão completos.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
            {resumo.incompletos.map((row) => {
              const motivos = motivosPrestadorCadastroIncompleto(row, resumo.temOrganograma);
              const hint = motivos.length > 0 ? `Pendente: ${motivos.join(", ")}` : undefined;
              return podeEditar ? (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onEditarPrestador(row)}
                  title={hint}
                  aria-label={hint ? `${row.nome} — ${hint}` : row.nome}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    textAlign: "left",
                    fontSize: 13,
                    color: "var(--brand-action, #7c3aed)",
                    fontFamily: FONT.body,
                    textDecoration: "underline",
                    fontWeight: 500,
                  }}
                >
                  {row.nome}
                </button>
              ) : (
                <span key={row.id} title={hint} style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                  {row.nome}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          ...kpiTileShell,
          border: "1px solid rgba(245, 158, 11, 0.35)",
          padding: 20,
          marginBottom: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            color: "#f59e0b",
            letterSpacing: "1px",
            textTransform: "uppercase",
            fontFamily: FONT.body,
            marginBottom: 6,
          }}
        >
          <AlertCircle size={13} aria-hidden />
          Revisão cadastral pendente
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#f59e0b", fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>
          {resumo.revisaoPendente.length}
        </div>
        {resumo.revisaoPendente.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#22c55e", fontFamily: FONT.body }}>
            <CheckCircle2 size={14} aria-hidden />
            Todos os cadastros filtrados estão em dia na revisão de 6 meses.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
            {resumo.revisaoPendente.map((row) => (
              <span key={row.id} style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                {row.nome}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
