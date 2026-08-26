import type { CSSProperties } from "react";
import { Eye } from "lucide-react";
import { SectionTitle } from "../../../components/dashboard";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { fmtJogosManualColuna } from "../../../lib/academyPortalCiencia";
import { normalizarJogosMesa } from "../../../lib/academyPortalJogosMesa";
import { ctaGradientPortalAcademy } from "../../../lib/academyPortalUi";
import { fmtDataPt } from "../../../lib/portalRhWorkflow";

export type AcademyPortalManualRow = {
  id: string;
  codigo: string | null;
  versao: string | null;
  titulo: string;
  introducao: string | null;
  categoriaLabel: string | null;
  categoriaAccent: string | null;
  jogosMesa: string[] | null;
  published_at: string | null;
  updated_at: string;
  requires_acknowledgment: boolean;
};

function ctaOutline(t: { text: string }): CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 35%, transparent)",
    background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)",
    color: t.text,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: FONT.body,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

function btnVisualizar(brand: ReturnType<typeof useDashboardBrand>): CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: ctaGradientPortalAcademy(brand),
    color: "#fff",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: FONT.body,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

function borderLeftCiencia(
  mostrarStatusCiencia: boolean,
  exigeCiencia: boolean,
  pendente: boolean,
  cardBorder: string,
): string {
  if (!mostrarStatusCiencia || !exigeCiencia) return `3px solid ${cardBorder}`;
  if (pendente) return "3px solid #f59e0b";
  return "3px solid #22c55e";
}

/** Cards em lista (padrão Portal RH Políticas) — Introdução + Visualizar + Ver ciência (Editar + exige ciência). */
export function AcademyPortalManuaisCards({
  rows,
  cienciaPendenteIds,
  cienciaExigidaIds,
  cienciaRegistradaEm,
  mostrarStatusCiencia,
  podeVerCiencia,
  onAbrir,
  onVerCiencia,
}: {
  rows: AcademyPortalManualRow[];
  cienciaPendenteIds: Set<string>;
  cienciaExigidaIds: Set<string>;
  cienciaRegistradaEm: Map<string, string>;
  mostrarStatusCiencia: boolean;
  /** Editar = Sim — botão Ver ciência (somente quando `requires_acknowledgment`). */
  podeVerCiencia: boolean;
  onAbrir: (id: string) => void;
  onVerCiencia?: (row: AcademyPortalManualRow) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const sorted = [...rows].sort((a, b) => {
    if (mostrarStatusCiencia) {
      const pendA = cienciaPendenteIds.has(a.id) ? 0 : 1;
      const pendB = cienciaPendenteIds.has(b.id) ? 0 : 1;
      if (pendA !== pendB) return pendA - pendB;
    }
    return compareLocaleTexto(a.codigo ?? a.titulo, b.codigo ?? b.titulo, "asc");
  });

  return (
    <div>
      <SectionTitle sub="Publicados para leitura e aceite">Manuais de treinamento</SectionTitle>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((row) => {
          const tagCor = row.categoriaAccent ?? "#7c3aed";
          const pendente = cienciaPendenteIds.has(row.id);
          const exigeCiencia = cienciaExigidaIds.has(row.id);
          const cienteEm = cienciaRegistradaEm.get(row.id);
          const dataPub = row.published_at ?? row.updated_at;
          const intro = (row.introducao ?? "").trim();
          const jogos = fmtJogosManualColuna(normalizarJogosMesa(row.jogosMesa));

          return (
            <li
              key={row.id}
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                border: `1px solid ${t.cardBorder}`,
                borderLeft: borderLeftCiencia(mostrarStatusCiencia, exigeCiencia, pendente, t.cardBorder),
                background: t.cardBg,
                fontFamily: FONT.body,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--brand-primary, #7c3aed)",
                  }}
                >
                  {row.codigo ?? "—"}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    padding: "3px 9px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    background: `${tagCor}22`,
                    color: tagCor,
                    border: `1px solid ${tagCor}44`,
                  }}
                >
                  {row.categoriaLabel ?? "—"}
                </span>
                <span style={{ flex: 1, minWidth: 8 }} aria-hidden />
                {mostrarStatusCiencia ? (
                  !exigeCiencia ? (
                    <span style={{ color: t.textMuted, fontSize: 12 }}>Ciência não exigida</span>
                  ) : pendente ? (
                    <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 12 }}>Ciência pendente</span>
                  ) : (
                    <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 12 }}>
                      Ciente{cienteEm ? ` · ${fmtDataPt(cienteEm)}` : ""}
                    </span>
                  )
                ) : null}
              </div>

              <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE, lineHeight: 1.3 }}>
                {row.titulo}
              </div>

              {intro ? (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: t.textMuted,
                      margin: "10px 0 4px",
                    }}
                  >
                    Introdução
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>{intro}</p>
                </>
              ) : null}

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px", marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => onAbrir(row.id)}
                  aria-label={tooltipAcao("Visualizar manual")}
                  title={tooltipAcao("Visualizar manual")}
                  style={btnVisualizar(brand)}
                >
                  <Eye size={14} aria-hidden />
                  Visualizar
                </button>
                {podeVerCiencia && onVerCiencia && row.requires_acknowledgment ? (
                  <button
                    type="button"
                    onClick={() => onVerCiencia(row)}
                    aria-label={tooltipAcao("Ver ciência")}
                    title={tooltipAcao("Ver ciência")}
                    style={ctaOutline(t)}
                  >
                    Ver ciência
                  </button>
                ) : null}
                <span style={{ fontSize: 12, color: t.textMuted }}>
                  {row.versao ? `v${row.versao}` : "—"} · {fmtDataPt(dataPub)}
                </span>
                <span style={{ fontSize: 12, color: t.textMuted }}>Jogos: {jogos}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
