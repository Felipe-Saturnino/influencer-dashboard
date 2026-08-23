import { useCallback, useMemo, useState, type MouseEvent } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { useMediaQuery } from "../../../hooks/useMediaQuery"
import { FONT } from "../../../constants/theme"
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles"
import { useDataTableBlock } from "../../../hooks/useDataTableBlock"
import { supabase } from "../../../lib/supabase"
import { CtaCriarButton } from "../../../components/CtaCriarButton"
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard"
import { compareInfluencerPerfilStatus, compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort"
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles"
import { Eye, EyeOff } from "lucide-react"
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate"
import { roleParidadeInfluencer } from "../../../lib/staffRoles"
import { ModalConfirmDelete, ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal"
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha"
import { descricaoModalExcluirItem } from "../../../lib/excluirItemUi"
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y"
import { type BancaPerfilMapRow, type BancaRowDb } from "./bancaJogoTypes"
import { STATUS_BANCA } from "./bancaJogoTypes"
import { fmtMoeda, formatarCPFVisivel, mascaraCPF, periodoDoMes, rowNoMesSolicitacao } from "./bancaJogoHelpers"
import type { BlocoFiltros } from "./bancaJogoFiltros"
import { ModalAprovarBanca } from "./ModalAprovarBanca"
import { ModalBloqueioSolicitacaoCampanha } from "./ModalBloqueioSolicitacaoCampanha"
import { ModalConfirmLiberar } from "./ModalConfirmLiberar"
import { ModalSolicitar } from "./ModalSolicitar"

export function BlocoSolicitacoes({
  filtros,
  rowsDb,
  perfilMap,
  staffPodeAcao,
  staffPodeAprovar,
  podeExcluirLinha,
  onRecarregar,
  onPerfisAtualizados,
  influencerListAgencia,
  nomeUsuario,
}: {
  filtros: BlocoFiltros;
  rowsDb: BancaRowDb[];
  perfilMap: Record<string, Pick<BancaPerfilMapRow, "nome" | "cpf" | "perfil_status">>;
  staffPodeAcao: boolean;
  /** Operador não aprova solicitações; só libera após aprovação interna. */
  staffPodeAprovar: boolean;
  /** Gestão de Usuários: can_excluir sim ou proprios + escopo da linha. */
  podeExcluirLinha: (row: BancaRowDb) => boolean;
  onRecarregar: () => void;
  onPerfisAtualizados: () => void;
  influencerListAgencia: { id: string; name: string }[];
  nomeUsuario: string;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const narrowMobile = useMediaQuery("(max-width: 479px)");
  const {
    podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp,
    mesFiltro, historico,
  } = filtros;
  const periodo = historico ? null : periodoDoMes(mesFiltro);

  const [modalOpen, setModalOpen] = useState(false);
  const [bloqueioSolicitacao, setBloqueioSolicitacao] = useState<"perfil" | "playbook" | null>(null);
  const [modalAprovar, setModalAprovar] = useState<BancaRowDb | null>(null);
  const [confirmRecusar, setConfirmRecusar] = useState<BancaRowDb | null>(null);
  const [recusandoId, setRecusandoId] = useState<string | null>(null);
  const [recusarErr, setRecusarErr] = useState("");
  const [modalLiberar, setModalLiberar] = useState<BancaRowDb | null>(null);
  const [liberando, setLiberando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<BancaRowDb | null>(null);
  const [cpfRevelados, setCpfRevelados] = useState<Set<string>>(() => new Set());
  type SolicSortCol = "influencer" | "classificacao" | "id_op" | "cpf" | "valor" | "status" | "data";
  const [sortSolic, setSortSolic] = useState<{ col: SolicSortCol; dir: SortDir }>({ col: "data", dir: "desc" });

  const toggleCpfRevelado = useCallback((id: string) => {
    setCpfRevelados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onBloqueioGate = useCallback((tipo: "perfil" | "playbook") => {
    setBloqueioSolicitacao(tipo);
  }, []);

  async function aoClicarSolicitar() {
    if (!user?.id) return;
    if (roleParidadeInfluencer(user.role)) {
      const check = await verificarElegibilidadeAgendaLive(user.id);
      if (check.erroVerificacao) return;
      if (check.perfilIncompleto) {
        setBloqueioSolicitacao("perfil");
        return;
      }
      if (check.faltaPlaybook) {
        setBloqueioSolicitacao("playbook");
        return;
      }
    }
    setModalOpen(true);
  }

  const lista = useMemo(() => {
    return rowsDb.filter((r) => {
      if (!["solicitado", "aprovado"].includes(r.status)) return false;
      if (!podeVerInfluencer(r.influencer_id)) return false;
      if (filterInfluencers.length > 0 && !filterInfluencers.includes(r.influencer_id)) return false;
      if (filtroOp?.length) {
        if (!r.operadora_slug || !filtroOp.includes(r.operadora_slug)) return false;
      } else if (filterOperadora && filterOperadora !== "todas") {
        if (r.operadora_slug !== filterOperadora) return false;
      }
      return rowNoMesSolicitacao(r, periodo, historico);
    });
  }, [rowsDb, podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, periodo, historico]);

  const listaOrdenada = useMemo(() => {
    const arr = [...lista];
    const { col, dir } = sortSolic;
    const cpfNorm = (id: string) => (perfilMap[id]?.cpf ?? "").replace(/\D/g, "");
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "influencer":
          c = compareLocaleTexto(perfilMap[a.influencer_id]?.nome ?? a.influencer_id, perfilMap[b.influencer_id]?.nome ?? b.influencer_id, dir);
          break;
        case "classificacao":
          c = compareInfluencerPerfilStatus(
            { statusInfluencer: perfilMap[a.influencer_id]?.perfil_status ?? null },
            { statusInfluencer: perfilMap[b.influencer_id]?.perfil_status ?? null },
            dir,
          );
          break;
        case "id_op":
          c = compareLocaleTexto((a.id_operadora_exibicao ?? "").trim(), (b.id_operadora_exibicao ?? "").trim(), dir);
          break;
        case "cpf":
          c = compareLocaleTexto(cpfNorm(a.influencer_id), cpfNorm(b.influencer_id), dir);
          break;
        case "valor":
          c = compareNumber(Number(a.valor), Number(b.valor), dir);
          break;
        case "status":
          c = compareLocaleTexto(a.status, b.status, dir);
          break;
        case "data":
          c = compareLocaleTexto(a.solicitado_em ?? "", b.solicitado_em ?? "", dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return (b.solicitado_em ?? "").localeCompare(a.solicitado_em ?? "");
    });
    return arr;
  }, [lista, perfilMap, sortSolic]);

  async function executarLiberar(row: BancaRowDb) {
    if (!user?.id) return;
    setLiberando(true);
    try {
      const { error } = await supabase.from("banca_jogo_solicitacoes").update({
        status: "liberado",
        liberado_em: new Date().toISOString(),
        liberado_por: user.id,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id).eq("status", "aprovado");
      if (!error) {
        onRecarregar();
        setModalLiberar(null);
      }
    } finally {
      setLiberando(false);
    }
  }

  async function excluirSolicitacao(r: BancaRowDb) {
    if (!podeExcluirLinha(r)) return;
    setExcluindoId(r.id);
    const { error } = await supabase.from("banca_jogo_solicitacoes").delete().eq("id", r.id);
    setExcluindoId(null);
    setConfirmExcluir(null);
    if (!error) onRecarregar();
  }

  async function recusarSolicitacao(r: BancaRowDb) {
    if (!staffPodeAprovar || r.status !== "solicitado") return;
    setRecusarErr("");
    setRecusandoId(r.id);
    const { error } = await supabase.from("banca_jogo_solicitacoes").delete().eq("id", r.id).eq("status", "solicitado");
    setRecusandoId(null);
    if (error) {
      setRecusarErr(error.message ?? "Não foi possível recusar.");
      return;
    }
    setConfirmRecusar(null);
    onRecarregar();
    onPerfisAtualizados();
  }

  const podeSolicitar = user && (roleParidadeInfluencer(user.role) || user.role === "agencia");

  const pageBox = getPageContentBoxStyle(brand, t);

  return (
    <div style={pageBox}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <SectionTitle compact>Solicitações</SectionTitle>
        {podeSolicitar ? (
          <CtaCriarButton type="button" onClick={() => void aoClicarSolicitar()}>
            Solicitar Banca
          </CtaCriarButton>
        ) : null}
      </div>

      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>
            Solicitações de banca em aberto
          </caption>
          <thead>
            <tr>
              <SortTableTh<SolicSortCol>
                label="Influencer"
                col="influencer"
                sortCol={sortSolic.col}
                sortDir={sortSolic.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortSolic((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<SolicSortCol>
                label="Perfil"
                col="classificacao"
                sortCol={sortSolic.col}
                sortDir={sortSolic.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortSolic((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<SolicSortCol>
                label="ID operadora"
                col="id_op"
                sortCol={sortSolic.col}
                sortDir={sortSolic.dir}
                thStyle={{ ...dataTable.thHeader, ...(narrowMobile ? { display: "none" } : {}) }}
                align="center"
                onSort={(c) =>
                  setSortSolic((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<SolicSortCol>
                label="CPF"
                col="cpf"
                sortCol={sortSolic.col}
                sortDir={sortSolic.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortSolic((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<SolicSortCol>
                label="Valor"
                col="valor"
                sortCol={sortSolic.col}
                sortDir={sortSolic.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortSolic((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<SolicSortCol>
                label="Status"
                col="status"
                sortCol={sortSolic.col}
                sortDir={sortSolic.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={(c) =>
                  setSortSolic((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <SortTableTh<SolicSortCol>
                label="Data"
                col="data"
                sortCol={sortSolic.col}
                sortDir={sortSolic.dir}
                thStyle={{ ...dataTable.thHeader, ...(narrowMobile ? { display: "none" } : {}) }}
                align="center"
                onSort={(c) =>
                  setSortSolic((s) => ({
                    col: c,
                    dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                  }))
                }
              />
              <th scope="col" style={dataTable.thHeader}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={narrowMobile ? 7 : 8} style={{ ...dataTable.tdCenter, color: t.textMuted, padding: 36 }}>
                  Nenhuma solicitação em aberto neste filtro.
                </td>
              </tr>
            ) : (
              listaOrdenada.map((r, i) => {
                const perf = perfilMap[r.influencer_id];
                const st = STATUS_BANCA[r.status];
                const sk = (perf?.perfil_status ?? "ativo").toLowerCase();
                const slInf =
                  sk === "inativo"
                    ? { label: "Inativo", color: "#94a3b8" }
                    : sk === "cancelado"
                      ? { label: "Cancelado", color: "#ef4444" }
                      : { label: "Ativo", color: "#10b981" };
                const dataStr = new Date(r.solicitado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
                const showAprovar = staffPodeAprovar && r.status === "solicitado";
                const showLiberar = staffPodeAcao && r.status === "aprovado";
                const showExcluir = podeExcluirLinha(r);
                const semAcao = !showAprovar && !showLiberar && !showExcluir;
                const cpfDigits = (perf?.cpf ?? "").replace(/\D/g, "");
                const cpfMascaravel = cpfDigits.length >= 11;
                const cpfVisivel = cpfRevelados.has(r.id);
                const zebraBg = dataTable.zebraRow(i);
                const nomeInf = perf?.nome ?? r.influencer_id;
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: `1px solid ${t.cardBorder}`, background: zebraBg }}
                    onMouseEnter={(e: MouseEvent<HTMLTableRowElement>) => {
                      e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={(e: MouseEvent<HTMLTableRowElement>) => {
                      e.currentTarget.style.background = zebraBg;
                    }}
                  >
                    <td style={{ ...dataTable.tdCenter, fontWeight: 600 }} title={nomeInf}>{nomeInf}</td>
                    <td style={dataTable.tdCenter}>
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
                    <td style={{ ...dataTable.tdCenter, fontFamily: "monospace", fontSize: 12, ...(narrowMobile ? { display: "none" } : {}) }}>{(r.id_operadora_exibicao ?? "").trim() || "—"}</td>
                    <td style={{ ...dataTable.tdCenter, fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <span>
                          {cpfMascaravel
                            ? cpfVisivel
                              ? formatarCPFVisivel(perf?.cpf ?? "")
                              : mascaraCPF(perf?.cpf ?? "")
                            : mascaraCPF(perf?.cpf ?? "")}
                        </span>
                        {cpfMascaravel ? (
                          <button
                            type="button"
                            onClick={() => toggleCpfRevelado(r.id)}
                            aria-label={cpfVisivel ? "Ocultar CPF" : "Mostrar CPF"}
                            aria-pressed={cpfVisivel}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 4,
                              borderRadius: 6,
                              border: `1px solid ${t.cardBorder}`,
                              background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                              color: t.textMuted,
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            {cpfVisivel ? <EyeOff size={15} strokeWidth={2} aria-hidden /> : <Eye size={15} strokeWidth={2} aria-hidden />}
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{fmtMoeda(Number(r.valor))}</td>
                    <td style={dataTable.tdCenter}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: `${st.color}22`, color: st.color, border: `1px solid ${st.color}44` }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ ...dataTable.tdCenter, color: t.textMuted, fontSize: 12, ...(narrowMobile ? { display: "none" } : {}) }}>{dataStr}</td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "center" }}>
                        {showAprovar ? (
                          <>
                            <button type="button" onClick={() => setModalAprovar(r)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #6b7fff44", background: "#6b7fff15", color: "#6b7fff", fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                              Aprovar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRecusarErr("");
                                setConfirmRecusar(r);
                              }}
                              style={{
                                padding: "5px 12px", borderRadius: 8, border: "1px solid #ef444444", background: "#ef444415",
                                color: "#ef4444", fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
                              }}
                            >
                              Recusar
                            </button>
                          </>
                        ) : null}
                        {showLiberar ? (
                          <button type="button" onClick={() => setModalLiberar(r)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #10b98144", background: "#10b98115", color: "#10b981", fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                            Liberar
                          </button>
                        ) : null}
                        {(showAprovar || showLiberar) && showExcluir ? (
                          <div style={{ width: 1, height: 20, background: t.cardBorder, margin: "0 4px", flexShrink: 0 }} />
                        ) : null}
                        {showExcluir ? (
                          <BtnExcluirLinha
                            labelAcao={tooltipAcao("Excluir solicitação")}
                            disabled={excluindoId === r.id}
                            onClick={() => setConfirmExcluir(r)}
                          />
                        ) : null}
                        {semAcao ? <span style={{ color: t.textMuted, fontSize: 11 }}>—</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {bloqueioSolicitacao ? (
        <ModalBloqueioSolicitacaoCampanha
          tipo={bloqueioSolicitacao}
          onClose={() => setBloqueioSolicitacao(null)}
        />
      ) : null}
      {modalOpen && user && (
        <ModalSolicitar
          onClose={() => setModalOpen(false)}
          onSalvo={onRecarregar}
          userRole={user.role}
          userId={user.id}
          influencerListAgencia={influencerListAgencia}
          nomeInfluencerLocked={nomeUsuario}
          onBloqueioGate={onBloqueioGate}
        />
      )}
      {modalAprovar && user ? (
        <ModalAprovarBanca
          row={modalAprovar}
          userId={user.id}
          onClose={() => setModalAprovar(null)}
          onSucesso={() => { onRecarregar(); onPerfisAtualizados(); }}
        />
      ) : null}
      {confirmRecusar ? (
        <ModalConfirmDelete
          title="Confirmar recusa"
          texto={`Recusar a solicitação de ${perfilMap[confirmRecusar.influencer_id]?.nome ?? "influencer"} no valor de ${fmtMoeda(Number(confirmRecusar.valor))}? A solicitação será removida e não poderá ser recuperada.`}
          confirmLabel="Recusar"
          loading={recusandoId === confirmRecusar.id}
          loadingLabel="Recusando..."
          error={recusarErr || null}
          onCancel={() => {
            setConfirmRecusar(null);
            setRecusarErr("");
          }}
          onConfirm={() => void recusarSolicitacao(confirmRecusar)}
        />
      ) : null}
      {modalLiberar ? (
        <ModalConfirmLiberar
          idOperadora={(modalLiberar.id_operadora_exibicao ?? "").trim()}
          onCancel={() => { if (!liberando) setModalLiberar(null); }}
          onSeguir={() => void executarLiberar(modalLiberar)}
          loading={liberando}
        />
      ) : null}
      {confirmExcluir ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem(
            "a solicitação de",
            perfilMap[confirmExcluir.influencer_id]?.nome ?? "influencer",
            `no valor de ${fmtMoeda(Number(confirmExcluir.valor))}`,
          )}
          onCancel={() => setConfirmExcluir(null)}
          onConfirm={() => void excluirSolicitacao(confirmExcluir)}
          loading={excluindoId === confirmExcluir.id}
        />
      ) : null}
    </div>
  );
}
