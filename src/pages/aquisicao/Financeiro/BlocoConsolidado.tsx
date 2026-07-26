import { useMemo, useState, Fragment } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { fmtBRL, fmtHorasTotal } from "../../../lib/dashboardHelpers"
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles"
import { useDataTableBlock } from "../../../hooks/useDataTableBlock"
import { supabase } from "../../../lib/supabase"
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard"
import { compareInfluencerPerfilStatus, compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort"
import { textoContemBuscaEmAlgum } from "../../../lib/searchText"
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles"
import { ChevronRight, Loader2 } from "lucide-react"
import { STATUS_INFLUENCER, STATUS_PAG } from "./financeiroConstants"
import type { FinanceiroHistoricoPagRow } from "./financeiroTypes"
import type { FinanceiroMesData } from "./financeiroMesData"
import { Badge } from "./financeiroUi"

/** Drilldown do consolidado: ciclos do mais novo → mais antigo (`data_inicio`). */
function ordenarHistoricoPorCicloDesc(rows: FinanceiroHistoricoPagRow[]): FinanceiroHistoricoPagRow[] {
  return [...rows].sort((a, b) => {
    const ai = a.ciclos_pagamento?.data_inicio ?? "";
    const bi = b.ciclos_pagamento?.data_inicio ?? "";
    const byInicio = bi.localeCompare(ai);
    if (byInicio !== 0) return byInicio;
    const af = a.ciclos_pagamento?.data_fim ?? "";
    const bf = b.ciclos_pagamento?.data_fim ?? "";
    const byFim = bf.localeCompare(af);
    if (byFim !== 0) return byFim;
    return (b.pago_em ?? "").localeCompare(a.pago_em ?? "");
  });
}

export function BlocoConsolidado({
  mesData,
  loadingMes,
}: {
  mesData: FinanceiroMesData | null;
  loadingMes: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();

  const rows = useMemo(
    () => mesData?.consolidadoRows ?? [],
    [mesData],
  );
  const agentesRow = mesData?.agentesRow ?? null;

  const [busca, setBusca] = useState("");
  type ConsolidSortCol = "influencer" | "totalPago" | "totalHoras" | "pendente" | "ultimoPag" | "status";
  const [sortCons, setSortCons] = useState<{ col: ConsolidSortCol; dir: SortDir }>({ col: "status", dir: "asc" });
  const [expandido, setExpandido] = useState<string | null>(null);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<Record<string, FinanceiroHistoricoPagRow[]>>({});
  const [loadingHist, setLoadingHist] = useState<string | null>(null);

  async function toggleExpand(id: string) {
    if (expandido === id) { setExpandido(null); return; }
    setExpandido(id);
    if (historicoPagamentos[id]) return;
    setLoadingHist(id);
    const { data } = await supabase
      .from("pagamentos")
      .select("*, ciclos_pagamento(data_inicio, data_fim)")
      .eq("influencer_id", id)
      .order("criado_em", { ascending: false })
      .limit(12);
    if (data) {
      setHistoricoPagamentos((prev) => ({
        ...prev,
        [id]: ordenarHistoricoPorCicloDesc(data as FinanceiroHistoricoPagRow[]),
      }));
    }
    setLoadingHist(null);
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!busca) return true;
      return textoContemBuscaEmAlgum(busca, r.nome_artistico, r.email);
    });
  }, [rows, busca]);

  const ordenados = useMemo(() => {
    const arr = [...filtered];
    const { col, dir } = sortCons;
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "influencer":
          c = compareLocaleTexto(a.nome_artistico, b.nome_artistico, dir);
          break;
        case "totalPago":
          c = compareNumber(a.totalPago, b.totalPago, dir);
          break;
        case "totalHoras":
          c = compareNumber(a.totalHoras, b.totalHoras, dir);
          break;
        case "pendente":
          c = compareNumber(a.pendente, b.pendente, dir);
          break;
        case "ultimoPag":
          c = compareLocaleTexto(a.ultimoPagamento ?? "", b.ultimoPagamento ?? "", dir);
          break;
        case "status":
          c = compareInfluencerPerfilStatus(
            { statusInfluencer: a.statusInfluencer },
            { statusInfluencer: b.statusInfluencer },
            dir,
          );
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto(a.nome_artistico, b.nome_artistico, "asc");
    });
    return arr;
  }, [filtered, sortCons]);

  const pageBox = getPageContentBoxStyle(brand, t);

  return (
    <div style={pageBox}>
      <SectionTitle>Consolidado de influencers</SectionTitle>
      <div style={{ marginBottom: 16 }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          aria-label="Buscar influencer por nome ou e-mail"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 14px", borderRadius: "10px",
            border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.inputText,
            fontSize: "13px", fontFamily: FONT.body, outline: "none",
          }}
        />
      </div>

      {loadingMes ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          Carregando…
        </div>
      ) : (
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle()}>
              <caption style={{ display: "none" }}>
                Consolidado de pagamentos por influencer
              </caption>
            <thead>
              <tr>
                <th scope="col" style={{ ...dataTable.thHeader, width: "32px" }} aria-label="Expandir" />
                <SortTableTh<ConsolidSortCol>
                  label="Influencer"
                  col="influencer"
                  sortCol={sortCons.col}
                  sortDir={sortCons.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortCons((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<ConsolidSortCol>
                  label="Total pago"
                  col="totalPago"
                  sortCol={sortCons.col}
                  sortDir={sortCons.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortCons((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<ConsolidSortCol>
                  label="Total horas"
                  col="totalHoras"
                  sortCol={sortCons.col}
                  sortDir={sortCons.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortCons((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<ConsolidSortCol>
                  label="Pendente"
                  col="pendente"
                  sortCol={sortCons.col}
                  sortDir={sortCons.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortCons((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<ConsolidSortCol>
                  label="Último pagamento"
                  col="ultimoPag"
                  sortCol={sortCons.col}
                  sortDir={sortCons.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortCons((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<ConsolidSortCol>
                  label="Status"
                  col="status"
                  sortCol={sortCons.col}
                  sortDir={sortCons.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortCons((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !agentesRow ? (
                <tr>
                  <td colSpan={7} style={{ ...dataTable.tdCenter, color: t.textMuted, padding: "40px" }}>
                    Nenhum influencer encontrado.
                  </td>
                </tr>
              ) : ordenados.map((row, i) => {
                const isOpen = expandido === row.influencer_id;
                const hist = ordenarHistoricoPorCicloDesc(historicoPagamentos[row.influencer_id] ?? []);
                const sl = STATUS_INFLUENCER[row.statusInfluencer] ?? { label: row.statusInfluencer, color: "#94a3b8" };
                const zebraBg = dataTable.zebraRow(i);

                const histPanelId = `hist-${row.influencer_id}`;
                return (
                  <Fragment key={row.influencer_id}>
                    <tr
                      style={{ cursor: "pointer", borderBottom: `1px solid ${t.cardBorder}`, background: zebraBg }}
                      tabIndex={0}
                      role="row"
                      aria-expanded={isOpen}
                      aria-controls={histPanelId}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebraBg;
                      }}
                      onClick={() => toggleExpand(row.influencer_id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpand(row.influencer_id);
                        }
                      }}
                    >
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <ChevronRight
                            size={14}
                            color={t.textMuted}
                            style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
                            aria-hidden
                          />
                        </div>
                      </td>
                      <td
                        style={{ ...dataTable.tdCenter, fontWeight: 600 }}
                        title={row.nome_artistico}
                      >
                        {row.nome_artistico}
                      </td>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 700, color: "#22c55e" }}>{fmtBRL(row.totalPago)}</td>
                      <td style={dataTable.tdCenter}>{fmtHorasTotal(row.totalHoras)}</td>
                      <td style={{ ...dataTable.tdCenter, color: row.pendente > 0 ? "#f59e0b" : t.textMuted, fontWeight: row.pendente > 0 ? 600 : 400 }}>
                        {fmtBRL(row.pendente)}
                      </td>
                      <td style={{ ...dataTable.tdCenter, color: t.textMuted }}>
                        {row.ultimoPagamento ? new Date(row.ultimoPagamento).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: `${sl.color}22`, color: sl.color, border: `1px solid ${sl.color}44` }}>
                          {sl.label}
                        </span>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr
                        key={`exp-${row.influencer_id}`}
                        id={histPanelId}
                        role="region"
                        aria-label={`Histórico de ${row.nome_artistico}`}
                        style={{ background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}
                      >
                        <td colSpan={7} style={{ padding: "16px 20px", borderBottom: `1px solid ${t.cardBorder}` }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted, marginBottom: "10px", fontFamily: FONT.body }}>
                            Histórico — {row.nome_artistico}
                          </div>
                          {loadingHist === row.influencer_id ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.textMuted, fontSize: "12px" }}>
                              <Loader2 size={14} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
                              Carregando…
                            </div>
                          ) : hist.length === 0 ? (
                            <div style={{ color: t.textMuted, fontSize: "12px" }}>Nenhum ciclo encontrado.</div>
                          ) : (
                            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
                              <table style={getDataTableStyle()}>
                                <caption style={{ display: "none" }}>
                                  Histórico de pagamentos do influencer
                                </caption>
                              <thead>
                                <tr>
                                  {["Ciclo", "Horas", "Total", "Status", "Pago em"].map(h => (
                                    <th key={h} scope="col" style={{ ...dataTable.thHeaderSub, fontSize: 11 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {hist.map((h, hi) => {
                                  const histZebra = dataTable.zebraRow(hi);
                                  return (
                                  <tr
                                    key={h.id}
                                    style={{ borderBottom: `1px solid ${t.divider}`, background: histZebra }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = histZebra;
                                    }}
                                  >
                                    <td style={dataTable.tdCenter}>
                                      {h.ciclos_pagamento?.data_inicio} – {h.ciclos_pagamento?.data_fim}
                                    </td>
                                    <td style={dataTable.tdCenter}>{fmtHorasTotal(h.horas_realizadas)}</td>
                                    <td style={dataTable.tdCenter}>{fmtBRL(h.total)}</td>
                                    <td style={dataTable.tdCenter}>
                                      <div style={{ display: "flex", justifyContent: "center" }}>
                                        <Badge status={h.status} config={STATUS_PAG} />
                                      </div>
                                    </td>
                                    <td style={{ ...dataTable.tdCenter, color: t.textMuted }}>
                                      {h.pago_em ? new Date(h.pago_em).toLocaleDateString("pt-BR") : "—"}
                                    </td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {/* Linha de Agentes — sempre no fim */}
              {agentesRow && (
                <tr
                  style={{ borderBottom: `1px solid ${t.cardBorder}`, background: t.isDark ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.03)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = t.isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = t.isDark ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.03)";
                  }}
                >
                  <td style={dataTable.tdCenter}>
                    <span style={{ fontSize: "10px", color: t.textMuted }}>—</span>
                  </td>
                  <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>
                    Agentes
                  </td>
                  <td style={{ ...dataTable.tdCenter, fontWeight: 700, color: "#22c55e" }}>{fmtBRL(agentesRow.totalPago)}</td>
                  <td style={{ ...dataTable.tdCenter, color: t.textMuted }}>—</td>
                  <td style={{ ...dataTable.tdCenter, color: agentesRow.pendente > 0 ? "#f59e0b" : t.textMuted, fontWeight: agentesRow.pendente > 0 ? 700 : 400 }}>
                    {fmtBRL(agentesRow.pendente)}
                  </td>
                  <td style={{ ...dataTable.tdCenter, color: t.textMuted }}>
                    {agentesRow.ultimoPagamento ? new Date(agentesRow.ultimoPagamento).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td style={dataTable.tdCenter}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                      Agência
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}