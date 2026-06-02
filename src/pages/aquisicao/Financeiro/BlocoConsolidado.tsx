import { useCallback, useEffect, useMemo, useState, Fragment, type CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { fmtBRL, fmtHorasTotal } from "../../../lib/dashboardHelpers";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { supabase } from "../../../lib/supabase";
import { enviarPagamentoEmailCiclo } from "../../../lib/financeiroEnviarPagamentoEmail";
import { buscarInvestimentoPago } from "../../../lib/investimentoPago";
import type { CicloPagamento, PagamentoStatus } from "../../../types";
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareInfluencerPerfilStatus, compareLocaleTexto, compareNumber, comparePagamentoStatus } from "../../../lib/classificacaoSort";
import { ROLES_PARIDADE_INFLUENCER } from "../../../lib/staffRoles";
import { getPageContentBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";
import { AlertTriangle, Banknote, CheckCircle2, ChevronRight, Clock, Loader2, Plus, RotateCcw } from "lucide-react";
import { STATUS_INFLUENCER, STATUS_PAG } from "./financeiroConstants";
import { cicloAberto, fmtCicloDatas, periodoDoMes, podeVerPagamentosAgenteFinanceiro } from "./financeiroCiclos";
import type {
  FinanceiroAgenteDbRow,
  FinanceiroHistoricoPagRow,
  FinanceiroLiveComResultado,
  FinanceiroLiveEscopoRow,
  FinanceiroLiveResultadoRow,
  FinanceiroPagamentoCicloEscopo,
  FinanceiroPagamentoDbRow,
  FinanceiroPagamentoParcial,
  FinanceiroPerfilCacheRow,
  FinanceiroPerfilRow,
  FinanceiroProfileRow,
  PagamentoRow,
} from "./financeiroTypes";
import type { BlocoFiltros } from "./financeiroFiltros";
import { Badge, BtnAcao, BtnPrimary, SelectInput } from "./financeiroUi";
import { ModalAgente } from "./ModalAgente";
import { ModalAnalisar } from "./ModalAnalisar";
import { ModalPagar } from "./ModalPagar";

export function BlocoConsolidado({ filtros }: { filtros: BlocoFiltros }) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const { podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, mesFiltro, historico } = filtros;
  const mes = historico ? "" : mesFiltro;

  interface ConRow {
    influencer_id: string;
    nome_artistico: string;
    email: string;
    totalPago: number;
    totalHoras: number;
    pendente: number;
    ultimoPagamento: string | null;
    statusInfluencer: string;
  }

  interface AgentesRow { totalPago: number; pendente: number; ultimoPagamento: string | null; }

  const [busca, setBusca] = useState("");
  type ConsolidSortCol = "influencer" | "totalPago" | "totalHoras" | "pendente" | "ultimoPag" | "status";
  const [sortCons, setSortCons] = useState<{ col: ConsolidSortCol; dir: SortDir }>({ col: "status", dir: "asc" });
  const [rows, setRows] = useState<ConRow[]>([]);
  const [agentesRow, setAgentesRow] = useState<AgentesRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<Record<string, FinanceiroHistoricoPagRow[]>>({});
  const [loadingHist, setLoadingHist] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);

    const { data: perfis } = await supabase
      .from("influencer_perfil")
      .select("id, nome_artistico, status")
      .order("nome_artistico");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("role", [...ROLES_PARIDADE_INFLUENCER]);

    if (!perfis) { setLoading(false); return; }

    const emailMap: Record<string, string> = {};
    for (const p of (profiles ?? []) as FinanceiroProfileRow[]) {
      emailMap[p.id] = p.email ?? "";
    }

    let perfisFiltrados = (perfis as FinanceiroPerfilRow[]).filter((p) => podeVerInfluencer(p.id));
    if (filterInfluencers.length > 0) perfisFiltrados = perfisFiltrados.filter((p) => filterInfluencers.includes(p.id));

    const periodo = periodoDoMes(mes);
    let cicloIds: string[] = [];
    if (periodo) {
      // Ciclos cujo último dia (data_fim) cai no período. Não usa fechado_em nem data de aprovação/pagamento.
      const { data: ciclos } = await supabase
        .from("ciclos_pagamento").select("id")
        .gte("data_fim", periodo.inicio)
        .lte("data_fim", periodo.fim);
      cicloIds = (ciclos ?? []).map((c: { id: string }) => c.id);
    }

    let pagamentosData: FinanceiroPagamentoDbRow[] = [];
    let agentesData: FinanceiroAgenteDbRow[] = [];
    const incluirAgentesConsolidado = podeVerPagamentosAgenteFinanceiro(user?.role);
    if (!periodo || cicloIds.length > 0) {
      const [{ data: pags }, { data: agts }] = await Promise.all([
        periodo
          ? supabase.from("pagamentos").select("*").in("ciclo_id", cicloIds)
          : supabase.from("pagamentos").select("*"),
        incluirAgentesConsolidado
          ? (periodo
              ? supabase.from("pagamentos_agentes").select("*").in("ciclo_id", cicloIds)
              : supabase.from("pagamentos_agentes").select("*"))
          : Promise.resolve({ data: [] as FinanceiroAgenteDbRow[] }),
      ]);
      pagamentosData = (pags ?? []) as FinanceiroPagamentoDbRow[];
      agentesData = (agts ?? []) as FinanceiroAgenteDbRow[];
    }
    if (filtroOp?.length) {
      pagamentosData = pagamentosData.filter((p) => p.operadora_slug && filtroOp.includes(p.operadora_slug));
      agentesData = agentesData.filter((a) => a.operadora_slug && filtroOp.includes(a.operadora_slug));
      const infIdsComPag = [...new Set(pagamentosData.map((p) => p.influencer_id))];
      perfisFiltrados = perfisFiltrados.filter((p) => infIdsComPag.includes(p.id));
    } else if (filterOperadora && filterOperadora !== "todas") {
      pagamentosData = pagamentosData.filter((p) => p.operadora_slug === filterOperadora);
      agentesData = agentesData.filter((a) => a.operadora_slug === filterOperadora);
      const infIdsComPag = [...new Set(pagamentosData.map((p) => p.influencer_id))];
      perfisFiltrados = perfisFiltrados.filter((p) => infIdsComPag.includes(p.id));
    }

    // Linha de agentes
    const agtPagos = agentesData.filter(a => a.status === "pago");
    const agtPendentes = agentesData.filter(a => a.status === "em_analise" || a.status === "a_pagar");
    const agtTotalPago = agtPagos.reduce((a, x) => a + x.total, 0);
    const agtPendente = agtPendentes.reduce((a, x) => a + x.total, 0);
    const agtUltimoPag = agtPagos.sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""))[0]?.pago_em ?? null;

    // Influencers — filtrar os que têm pelo menos algum valor
    const resultado: ConRow[] = perfisFiltrados.map((perf) => {
      const pags = pagamentosData.filter(p => p.influencer_id === perf.id);
      const pagos = pags.filter(p => p.status === "pago");
      const pendentes = pags.filter(p => p.status === "em_analise" || p.status === "a_pagar");
      const totalPago = pagos.reduce((a, p) => a + p.total, 0);
      const totalHoras = pags.reduce((a, p) => a + p.horas_realizadas, 0);
      const pendente = pendentes.reduce((a, p) => a + p.total, 0);
      const ultimoPag = pagos.sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""))[0]?.pago_em ?? null;
      return {
        influencer_id: perf.id,
        nome_artistico: perf.nome_artistico ?? emailMap[perf.id] ?? perf.id,
        email: emailMap[perf.id] ?? "",
        totalPago, totalHoras, pendente,
        ultimoPagamento: ultimoPag,
        statusInfluencer: perf.status ?? "ativo",
      };
    }).filter(r => r.totalPago > 0 || r.totalHoras > 0 || r.pendente > 0);

    // Linha especial de agentes (só operação interna; influencer e agência não veem)
    setAgentesRow(
      incluirAgentesConsolidado && (agtTotalPago > 0 || agtPendente > 0)
        ? { totalPago: agtTotalPago, pendente: agtPendente, ultimoPagamento: agtUltimoPag }
        : null
    );

    setRows(resultado);
    setLoading(false);
  }, [mes, podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, user?.role]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

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
    if (data) setHistoricoPagamentos(prev => ({ ...prev, [id]: data as FinanceiroHistoricoPagRow[] }));
    setLoadingHist(null);
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!busca) return true;
      return r.nome_artistico.toLowerCase().includes(busca.toLowerCase()) || r.email.toLowerCase().includes(busca.toLowerCase());
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

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          Carregando...
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
                const hist = historicoPagamentos[row.influencer_id] ?? [];
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
                              Carregando...
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