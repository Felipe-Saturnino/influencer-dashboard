import { useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import type { CampanhaLink } from "../../../types";
import { Loader2 } from "lucide-react";
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { compareAtivoBoolean, compareLocaleTexto } from "../../../lib/classificacaoSort";
import { getPageContentBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";

const COR = {
  cinza: "#6b7280",
} as const;

type LinkSortCol = "utm" | "operadora" | "criado" | "usuario" | "status" | "ultima_visita";

interface GeracaoLinksTabContentProps {
  links: CampanhaLink[];
  operadoras: { slug: string; nome: string }[];
  loading: boolean;
  /** Abre o modal Novo Link. */
  onNovoLink?: () => void;
}

function fmtDataPt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const day = iso.includes("T") ? iso.split("T")[0]! : iso.slice(0, 10);
  const [y, m, d] = day.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function GeracaoLinksTabContent({
  links,
  operadoras,
  loading,
  onNovoLink,
}: GeracaoLinksTabContentProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("campanhas");
  const [sortLinks, setSortLinks] = useState<{ col: LinkSortCol; dir: SortDir }>({
    col: "criado",
    dir: "desc",
  });

  const linksOrdenados = useMemo(() => {
    const arr = [...links];
    const { col, dir } = sortLinks;
    const nomeOp = (l: CampanhaLink) =>
      (operadoras.find((o) => o.slug === l.operadora_slug)?.nome ?? l.operadora_slug).toLowerCase();
    arr.sort((a, b) => {
      let c0 = 0;
      switch (col) {
        case "utm":
          c0 = compareLocaleTexto(a.utm_source, b.utm_source, dir);
          break;
        case "operadora":
          c0 = compareLocaleTexto(nomeOp(a), nomeOp(b), dir);
          break;
        case "criado":
          c0 = compareLocaleTexto(a.created_at, b.created_at, dir);
          break;
        case "usuario":
          c0 = compareLocaleTexto(a.usuario_nome ?? "", b.usuario_nome ?? "", dir);
          break;
        case "status":
          c0 = compareAtivoBoolean(!!a.ativo_30d, !!b.ativo_30d, dir);
          break;
        case "ultima_visita":
          c0 = compareLocaleTexto(a.ultima_visita ?? "", b.ultima_visita ?? "", dir);
          break;
        default:
          c0 = 0;
      }
      if (c0 !== 0) return c0;
      return compareLocaleTexto(a.utm_source, b.utm_source, "asc");
    });
    return arr;
  }, [links, sortLinks, operadoras]);

  const ativos = links.filter((l) => l.ativo_30d).length;
  const dataTable = useDataTableBlock();
  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const contentBox = getPageContentBoxStyle(brand, t, { overflow: "hidden" });

  const toggleSort = (c: LinkSortCol) => {
    setSortLinks((s) => ({
      col: c,
      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
    }));
  };

  return (
    <>
      <div className="app-grid-kpi-3" style={{ ...getPageKpiSectionGapStyle(), width: "100%", gap: 14 }}>
        {[
          { label: "TOTAL", valor: links.length, cor: "var(--brand-primary, #7c3aed)" },
          { label: "ATIVOS", valor: ativos, cor: "#22c55e" },
          { label: "INATIVOS", valor: links.length - ativos, cor: COR.cinza },
        ].map((c) => (
          <div
            key={c.label}
            aria-label={`${c.label}: ${c.valor}`}
            style={{
              borderRadius: 14,
              border: `1px solid ${t.cardBorder}`,
              borderLeft: `3px solid ${c.cor}`,
              background: brand.blockBg,
              padding: "16px 18px",
              boxShadow: cardShadow,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.textMuted,
                fontFamily: FONT.body,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: c.cor,
                fontFamily: FONT_TITLE,
                marginTop: 6,
              }}
            >
              {c.valor}
            </div>
          </div>
        ))}
      </div>

      <div style={contentBox}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SectionTitle compact>Links cadastrados</SectionTitle>
          {perm.canCriarOk ? (
            <CtaCriarButton type="button" onClick={() => onNovoLink?.()}>
              Novo Link
            </CtaCriarButton>
          ) : null}
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "40px 0",
              color: t.textMuted,
              fontFamily: FONT.body,
            }}
          >
            <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            Carregando…
          </div>
        ) : links.length === 0 ? (
          <div
            style={{
              padding: "48px 0",
              color: t.textMuted,
              fontFamily: FONT.body,
              textAlign: "center",
            }}
          >
            Nenhum link cadastrado.
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Links cadastrados</caption>
              <thead>
                <tr>
                  <SortTableTh<LinkSortCol>
                    label="UTM"
                    col="utm"
                    sortCol={sortLinks.col}
                    sortDir={sortLinks.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={toggleSort}
                  />
                  <SortTableTh<LinkSortCol>
                    label="Operadora"
                    col="operadora"
                    sortCol={sortLinks.col}
                    sortDir={sortLinks.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={toggleSort}
                  />
                  <SortTableTh<LinkSortCol>
                    label="Criado em"
                    col="criado"
                    sortCol={sortLinks.col}
                    sortDir={sortLinks.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={toggleSort}
                  />
                  <SortTableTh<LinkSortCol>
                    label="Usuário"
                    col="usuario"
                    sortCol={sortLinks.col}
                    sortDir={sortLinks.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={toggleSort}
                  />
                  <SortTableTh<LinkSortCol>
                    label="Status"
                    col="status"
                    sortCol={sortLinks.col}
                    sortDir={sortLinks.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={toggleSort}
                  />
                  <SortTableTh<LinkSortCol>
                    label="Última Visita"
                    col="ultima_visita"
                    sortCol={sortLinks.col}
                    sortDir={sortLinks.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={toggleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {linksOrdenados.map((l, idx) => {
                  const zebraBg = dataTable.zebraRow(idx);
                  const ativo = !!l.ativo_30d;
                  return (
                    <tr
                      key={l.id}
                      style={{ background: zebraBg }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = t.isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebraBg;
                      }}
                    >
                      <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{l.utm_source}</td>
                      <td style={dataTable.tdCenter}>
                        {operadoras.find((o) => o.slug === l.operadora_slug)?.nome ??
                          l.operadora_slug}
                      </td>
                      <td style={{ ...dataTable.tdCenter, color: t.textMuted, fontSize: 12 }}>
                        {fmtDataPt(l.created_at)}
                      </td>
                      <td style={dataTable.tdCenter}>{l.usuario_nome ?? "—"}</td>
                      <td style={dataTable.tdCenter}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: ativo ? "#05966922" : "#6b728022",
                            color: ativo ? "#059669" : "#6b7280",
                            border: `1px solid ${ativo ? "#05966944" : "#6b728044"}`,
                            borderRadius: 6,
                            padding: "3px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: FONT.body,
                          }}
                        >
                          {ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td style={{ ...dataTable.tdCenter, color: t.textMuted, fontSize: 12 }}>
                        {fmtDataPt(l.ultima_visita)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
