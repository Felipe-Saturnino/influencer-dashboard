import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { getPageContentBoxShellStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import type { ResumoStaffCards } from "./gestaoStaffHelpers";

function StaffKpiCard({
  titulo,
  cor,
  borda,
  rows,
  mensagemOk,
  podeEditar,
  onEditar,
}: {
  titulo: string;
  cor: string;
  borda: string;
  rows: RhFuncionario[];
  mensagemOk: string;
  podeEditar: boolean;
  onEditar: (row: RhFuncionario) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const kpiTileShell = getPageContentBoxShellStyle(brand, t);

  return (
    <div
      style={{
        ...kpiTileShell,
        border: borda,
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
          color: cor,
          letterSpacing: "1px",
          textTransform: "uppercase",
          fontFamily: FONT.body,
          marginBottom: 6,
        }}
      >
        <AlertCircle size={13} aria-hidden />
        {titulo}
      </div>
      <div style={{ fontSize: 36, fontWeight: 900, color: cor, fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>
        {rows.length}
      </div>
      {rows.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#22c55e", fontFamily: FONT.body }}>
          <CheckCircle2 size={14} aria-hidden />
          {mensagemOk}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
          {rows.map((row) =>
            podeEditar ? (
              <button
                key={row.id}
                type="button"
                onClick={() => onEditar(row)}
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
              <span key={row.id} style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                {row.nome}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function StaffKpiResumo({
  resumo,
  podeEditar,
  onEditarStaff,
}: {
  resumo: ResumoStaffCards;
  podeEditar: boolean;
  onEditarStaff: (row: RhFuncionario) => void;
}) {
  return (
    <div className="app-grid-3" style={{ gap: 16, ...getPageKpiSectionGapStyle() }}>
      <StaffKpiCard
        titulo="Perfis sem dados operacionais"
        cor="#e84025"
        borda="1px solid rgba(232, 64, 37, 0.25)"
        rows={resumo.semDadosOperacionais}
        mensagemOk="Todos os Game Presenters filtrados têm Nickname, Turno e ID Operacional."
        podeEditar={podeEditar}
        onEditar={onEditarStaff}
      />
      <StaffKpiCard
        titulo="Perfis sem dados cadastrais"
        cor="#e84025"
        borda="1px solid rgba(232, 64, 37, 0.25)"
        rows={resumo.semDadosCadastrais}
        mensagemOk="Todos os Game Presenters filtrados têm Gênero, Bio do Dealer e Fotos."
        podeEditar={podeEditar}
        onEditar={onEditarStaff}
      />
      <StaffKpiCard
        titulo="Perfis sem dados de Jogo"
        cor="#f59e0b"
        borda="1px solid rgba(245, 158, 11, 0.35)"
        rows={resumo.semDadosJogo}
        mensagemOk="Todos os Game Presenters filtrados têm Live no Estúdio e ao menos um jogo ativo ou em treinamento."
        podeEditar={podeEditar}
        onEditar={onEditarStaff}
      />
    </div>
  );
}
