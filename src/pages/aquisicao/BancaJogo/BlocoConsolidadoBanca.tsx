import { Fragment, useMemo, useState } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { useMediaQuery } from "../../../hooks/useMediaQuery"
import { FONT } from "../../../constants/theme"
import { MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants"
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles"
import { useDataTableBlock } from "../../../hooks/useDataTableBlock"
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard"
import { compareAtivoBoolean, compareInfluencerPerfilStatus, compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort"
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles"
import { ChevronRight } from "lucide-react"
import { type BancaPerfilMapRow, type BancaRowDb, type BancaStatusConta } from "./bancaJogoTypes"
import { STATUS_BANCA } from "./bancaJogoTypes"
import { fmtMoeda, periodoDoMes, rowInteressaConsolidado } from "./bancaJogoHelpers"
import type { BlocoFiltros } from "./bancaJogoFiltros"
import { ModalAlterarStatusConta } from "./ModalAlterarStatusConta"

export function BlocoConsolidadoBanca({
  filtros,
  rowsDb,
  perfilMap,
  podeEditarStatusConta,
  onPerfisAtualizados,
}: {
  filtros: BlocoFiltros;
  rowsDb: BancaRowDb[];
  perfilMap: Record<string, BancaPerfilMapRow>;
  podeEditarStatusConta: boolean;
  onPerfisAtualizados: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const narrowTablet = useMediaQuery("(max-width: 639px)");
  const {
    podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp,
    mesFiltro, historico,
  } = filtros;
  const periodo = historico ? null : periodoDoMes(mesFiltro);

  const [busca, setBusca] = useState("");
  type BancaConsSortCol =
    | "influencer"
    | "classificacao"
    | "total_lib"
    | "total_sol"
    | "bloq"
    | "desbloq"
    | "conta";
  const [sortBancaCons, setSortBancaCons] = useState<{ col: BancaConsSortCol; dir: SortDir }>({ col: "classificacao", dir: "asc" });
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState<{ id: string; nome: string; statusConta: BancaStatusConta } | null>(null);

  const fmtData = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" }) : "—";

  const rowsFiltradas = useMemo(() => {
    return rowsDb.filter((r) => {
      if (!podeVerInfluencer(r.influencer_id)) return false;
      if (filterInfluencers.length > 0 && !filterInfluencers.includes(r.influencer_id)) return false;
      if (filtroOp?.length) {
        if (!r.operadora_slug || !filtroOp.includes(r.operadora_slug)) return false;
      } else if (filterOperadora && filterOperadora !== "todas") {
        if (r.operadora_slug !== filterOperadora) return false;
      }
      return rowInteressaConsolidado(r, periodo, historico);
    });
  }, [rowsDb, podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, periodo, historico]);

  interface AgRow {
    influencer_id: string;
    nome: string;
    email: string;
    totalLiberado: number;
    totalSolicitado: number;
    dataBloqueio: string | null;
    dataDesbloqueio: string | null;
    statusContaBanca: BancaStatusConta;
    perfil_status: string | null;
  }

  const agregados = useMemo(() => {
    const byInf = new Map<string, BancaRowDb[]>();
    for (const r of rowsFiltradas) {
      const arr = byInf.get(r.influencer_id) ?? [];
      arr.push(r);
      byInf.set(r.influencer_id, arr);
    }
    const out: AgRow[] = [];
    for (const [infId, list] of byInf) {
      const perf = perfilMap[infId];
      const totalLiberado = list.filter((x) => x.status === "liberado").reduce((a, x) => a + Number(x.valor), 0);
      const totalSolicitado = list.filter((x) => x.status === "solicitado" || x.status === "aprovado").reduce((a, x) => a + Number(x.valor), 0);
      const stConta: BancaStatusConta =
        perf?.banca_status_conta === "bloqueada" ? "bloqueada" : "liberada";
      out.push({
        influencer_id: infId,
        nome: perf?.nome ?? infId,
        email: perf?.email ?? "",
        totalLiberado,
        totalSolicitado,
        dataBloqueio: perf?.banca_data_bloqueio ?? null,
        dataDesbloqueio: perf?.banca_data_desbloqueio ?? null,
        statusContaBanca: stConta,
        perfil_status: perf?.perfil_status ?? null,
      });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [rowsFiltradas, perfilMap]);

  const filtradaBusca = useMemo(() => {
    return agregados.filter((r) => {
      if (!busca) return true;
      return r.nome.toLowerCase().includes(busca.toLowerCase()) || r.email.toLowerCase().includes(busca.toLowerCase());
    });
  }, [agregados, busca]);

  const filtradaOrdenada = useMemo(() => {
    const arr = [...filtradaBusca];
    const { col, dir } = sortBancaCons;
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "influencer":
          c = compareLocaleTexto(a.nome, b.nome, dir);
          break;
        case "classificacao":
          c = compareInfluencerPerfilStatus(
            { statusInfluencer: a.perfil_status },
            { statusInfluencer: b.perfil_status },
            dir,
          );
          break;
        case "total_lib":
          c = compareNumber(a.totalLiberado, b.totalLiberado, dir);
          break;
        case "total_sol":
          c = compareNumber(a.totalSolicitado, b.totalSolicitado, dir);
          break;
        case "bloq":
          c = compareLocaleTexto(a.dataBloqueio ?? "", b.dataBloqueio ?? "", dir);
          break;
        case "desbloq":
          c = compareLocaleTexto(a.dataDesbloqueio ?? "", b.dataDesbloqueio ?? "", dir);
          break;
        case "conta":
          c = compareAtivoBoolean(a.statusContaBanca === "liberada", b.statusContaBanca === "liberada", dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto(a.nome, b.nome, "asc");
    });
    return arr;
  }, [filtradaBusca, sortBancaCons]);

  const contaLabel = (st: BancaStatusConta) => {
    if (st === "liberada") return { label: "Liberada", color: "#10b981" };
    return { label: "Bloqueada", color: "#ef4444" };
  };

  const pageBox = getPageContentBoxStyle(brand, t);

  return (
    <div style={pageBox}>
      <SectionTitle>Consolidado de bancas</SectionTitle>
      <div style={{ marginBottom: 16 }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          aria-label="Buscar influencer por nome ou e-mail"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 14px", borderRadius: 10,
            border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.inputText,
            fontSize: 13, fontFamily: FONT.body, outline: "none",
          }}
        />
      </div>

      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>
            Consolidado de bancas por influencer
          </caption>
          <thead>
            <tr>
              <th style={{ ...dataTable.thHeader, width: 32 }} scope="col" aria-label="Expandir" />
              <SortTableTh<BancaConsSortCol>
                label="Influencer"
                col="influencer"
                sortCol={sortBancaCons.col}
                sortDir={sortBancaCons.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortBancaCons((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<BancaConsSortCol>
                label="Perfil"
                col="classificacao"
                sortCol={sortBancaCons.col}
                sortDir={sortBancaCons.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortBancaCons((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<BancaConsSortCol>
                label="Total liberado"
                col="total_lib"
                sortCol={sortBancaCons.col}
                sortDir={sortBancaCons.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortBancaCons((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<BancaConsSortCol>
                label="Total solicitado"
                col="total_sol"
                sortCol={sortBancaCons.col}
                sortDir={sortBancaCons.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortBancaCons((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<BancaConsSortCol>
                label="Data de bloqueio"
                col="bloq"
                sortCol={sortBancaCons.col}
                sortDir={sortBancaCons.dir}
                thStyle={{ ...dataTable.thHeader, ...(narrowTablet ? { display: "none" } : {}) }}
                align="center"
                onSort={(c) =>
                  setSortBancaCons((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<BancaConsSortCol>
                label="Data de desbloqueio"
                col="desbloq"
                sortCol={sortBancaCons.col}
                sortDir={sortBancaCons.dir}
                thStyle={{ ...dataTable.thHeader, ...(narrowTablet ? { display: "none" } : {}) }}
                align="center"
                onSort={(c) =>
                  setSortBancaCons((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<BancaConsSortCol>
                label="Status da conta"
                col="conta"
                sortCol={sortBancaCons.col}
                sortDir={sortBancaCons.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortBancaCons((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
            </tr>
          </thead>
          <tbody>
            {filtradaOrdenada.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...dataTable.tdCenter, color: t.textMuted, padding: 40 }}>
                  {MSG_SEM_DADOS_FILTRO}
                </td>
              </tr>
            ) : (
              filtradaOrdenada.map((row, i) => {
                const open = expandido === row.influencer_id;
                const histPanelId = `banca-hist-${row.influencer_id}`;
                const sl = contaLabel(row.statusContaBanca);
                const sk = (row.perfil_status ?? "ativo").toLowerCase();
                const slInf =
                  sk === "inativo"
                    ? { label: "Inativo", color: "#94a3b8" }
                    : sk === "cancelado"
                      ? { label: "Cancelado", color: "#ef4444" }
                      : { label: "Ativo", color: "#10b981" };
                const itens = rowsFiltradas.filter((r) => r.influencer_id === row.influencer_id).sort((a, b) => (b.solicitado_em ?? "").localeCompare(a.solicitado_em ?? ""));
                const zebraBg = dataTable.zebraRow(i);
                return (
                  <Fragment key={row.influencer_id}>
                    <tr
                      style={{ borderBottom: `1px solid ${t.cardBorder}`, cursor: "pointer", background: zebraBg }}
                      tabIndex={0}
                      role="row"
                      aria-expanded={open}
                      aria-controls={histPanelId}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebraBg;
                      }}
                      onClick={() => setExpandido(open ? null : row.influencer_id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandido(open ? null : row.influencer_id);
                        }
                      }}
                    >
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <ChevronRight
                            size={14}
                            color={t.textMuted}
                            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
                            aria-hidden
                          />
                        </div>
                      </td>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 600 }} title={row.nome}>
                        {row.nome}
                      </td>
                      <td style={dataTable.tdCenter} onClick={(e) => e.stopPropagation()}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: 20,
                            background: `${slInf.color}22`,
                            color: slInf.color,
                            border: `1px solid ${slInf.color}44`,
                          }}
                        >
                          {slInf.label}
                        </span>
                      </td>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 700, color: "#10b981" }}>{fmtMoeda(row.totalLiberado)}</td>
                      <td style={{ ...dataTable.tdCenter, color: row.totalSolicitado > 0 ? "#f59e0b" : t.textMuted, fontWeight: row.totalSolicitado > 0 ? 700 : 400 }}>{fmtMoeda(row.totalSolicitado)}</td>
                      <td style={{ ...dataTable.tdCenter, color: t.textMuted, fontSize: 12, ...(narrowTablet ? { display: "none" } : {}) }}>{fmtData(row.dataBloqueio)}</td>
                      <td style={{ ...dataTable.tdCenter, color: t.textMuted, fontSize: 12, ...(narrowTablet ? { display: "none" } : {}) }}>{fmtData(row.dataDesbloqueio)}</td>
                      <td style={dataTable.tdCenter} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                        {podeEditarStatusConta ? (
                          <button
                            type="button"
                            onClick={() => setModalStatus({ id: row.influencer_id, nome: row.nome, statusConta: row.statusContaBanca })}
                            aria-label={`Alterar status da conta de ${row.nome}`}
                            style={{
                              fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                              background: `${sl.color}22`, color: sl.color, border: `1px solid ${sl.color}44`,
                              cursor: "pointer",
                            }}
                          >
                            {sl.label}
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                              background: `${sl.color}22`, color: sl.color, border: `1px solid ${sl.color}44`,
                            }}
                          >
                            {sl.label}
                          </span>
                        )}
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr
                        id={histPanelId}
                        role="region"
                        aria-label={`Histórico de bancas de ${row.nome}`}
                        style={{ background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}
                      >
                        <td colSpan={8} style={{ padding: "16px 20px", borderBottom: `1px solid ${t.cardBorder}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: t.textMuted, marginBottom: 10, fontFamily: FONT.body }}>
                            Bancas solicitadas — {row.nome}
                          </div>
                          {itens.length === 0 ? (
                            <div style={{ color: t.textMuted, fontSize: 12 }}>Nenhum registro.</div>
                          ) : (
                            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
                            <table style={getDataTableStyle()}>
                              <caption style={{ display: "none" }}>
                                Histórico de solicitações de banca do influencer
                              </caption>
                              <thead>
                                <tr>
                                  {["Data", "Operadora", "ID operadora", "Valor", "Status"].map((h) => (
                                    <th key={h} scope="col" style={{ ...dataTable.thHeaderSub, fontSize: 11 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {itens.map((h, hi) => {
                                  const innerZebra = dataTable.zebraRow(hi);
                                  return (
                                  <tr
                                    key={h.id}
                                    style={{ borderBottom: `1px solid ${t.divider}`, background: innerZebra }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = innerZebra;
                                    }}
                                  >
                                    <td style={dataTable.tdCenter}>
                                      {new Date(h.solicitado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                    </td>
                                    <td style={dataTable.tdCenter}>{h.operadora_slug}</td>
                                    <td style={{ ...dataTable.tdCenter, fontFamily: "monospace" }}>{(h.id_operadora_exibicao ?? "").trim() || "—"}</td>
                                    <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{fmtMoeda(Number(h.valor))}</td>
                                    <td style={dataTable.tdCenter}>
                                      <span style={{ display: "inline-flex", justifyContent: "center", fontSize: 10, fontWeight: 700, color: STATUS_BANCA[h.status].color }}>{STATUS_BANCA[h.status].label}</span>
                                    </td>
                                  </tr>
                                );})}
                              </tbody>
                            </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {modalStatus ? (
        <ModalAlterarStatusConta
          influencerId={modalStatus.id}
          nome={modalStatus.nome}
          statusContaAtual={modalStatus.statusConta}
          onClose={() => setModalStatus(null)}
          onSalvo={onPerfisAtualizados}
        />
      ) : null}
    </div>
  );
}
