import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Check, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FiltroBarCampoSelect, SortTableTh, type SortDir } from "../../../components/dashboard";
import { getTdStyle, getThStyle, zebraStripe } from "../../../lib/tableStyles";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import {
  fmtDataColunaGerenciamento,
  INFORMATIVO_STATUS_LABEL,
  registrarHistoricoStatus,
  stripHtmlText,
  type InformativoStatus,
} from "../../../lib/informativosWorkflow";
import { labelPerfisInformativo } from "../../../lib/informativosRoles";
import { buildMesesCarrossel, itemNoMesCarrossel, type MesCarrosselEntry } from "../PortalRh/portalRhCarrossel";
import { ModalCriarInformativo } from "./ModalCriarInformativo";
import { ModalHistoricoInformativo } from "./ModalHistoricoInformativo";

export type InformativoGerenciamentoRow = {
  id: string;
  assunto: string;
  autorNome: string;
  perfisLabel: string;
  createdAt: string;
  status: InformativoStatus;
  approvedAt: string | null;
  aprovadorNome: string;
  publishedAt: string | null;
  textoBusca: string;
};

type SortCol = "assunto" | "autor" | "perfis" | "createdAt" | "status" | "approvedAt" | "aprovador" | "publishedAt";

const STATUS_ORDEM: Record<InformativoStatus, number> = {
  rascunho: 0,
  aprovacao: 1,
  publicado: 2,
  arquivado: 3,
};

const STATUS_FILTRO_OPCOES = (["publicado", "rascunho", "aprovacao", "arquivado"] as const).map((value) => ({
  value,
  label: INFORMATIVO_STATUS_LABEL[value],
}));

const ERRO_CARREGAR = "Não foi possível carregar os informativos. Se o problema persistir, contate o suporte.";
const ERRO_APROVAR = "Não foi possível aprovar o informativo. Se o problema persistir, contate o suporte.";
const ERRO_ARQUIVAR = "Não foi possível arquivar o informativo. Se o problema persistir, contate o suporte.";
const ERRO_EXCLUIR = "Não foi possível excluir o informativo. Se o problema persistir, contate o suporte.";

function compareTexto(a: string, b: string, dir: number): number {
  return dir * a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

function compareDataIso(a: string | null, b: string | null, dir: number): number {
  const ta = a ? new Date(a).getTime() : Number.NaN;
  const tb = b ? new Date(b).getTime() : Number.NaN;
  const aVazio = Number.isNaN(ta);
  const bVazio = Number.isNaN(tb);
  if (aVazio && bVazio) return 0;
  if (aVazio) return 1;
  if (bVazio) return -1;
  return dir * (ta - tb);
}

function acoesPorStatus(status: InformativoStatus): ("editar" | "aprovar" | "arquivar" | "historico" | "excluir")[] {
  switch (status) {
    case "publicado":
      return ["arquivar", "historico"];
    case "rascunho":
      return ["editar", "historico", "excluir"];
    case "aprovacao":
      return ["editar", "aprovar", "historico", "excluir"];
    case "arquivado":
      return ["historico", "excluir"];
    default:
      return ["historico"];
  }
}

export function GerenciamentoInformativosFiltroStatus({
  filtroStatus,
  onFiltroStatusChange,
}: {
  filtroStatus: "todos" | InformativoStatus;
  onFiltroStatusChange: (v: "todos" | InformativoStatus) => void;
}) {
  return (
    <FiltroBarCampoSelect
      id="filtro-status-informativo"
      value={filtroStatus}
      onChange={(v) => onFiltroStatusChange(v as typeof filtroStatus)}
      options={STATUS_FILTRO_OPCOES}
      icon={FilterBarIcons.status}
      ariaLabel="Status do informativo"
      todasValue="todos"
      todasLabel="Todos Status"
    />
  );
}

export function GerenciamentoInformativos({
  onDadosAlterados,
  buscaDeb,
  modoHistorico,
  idxMes,
  mesesDisponiveis,
  filtroStatus,
  onMesesCarrosselChange,
  onRegisterAbrirCriar,
}: {
  onDadosAlterados: () => void;
  buscaDeb: string;
  modoHistorico: boolean;
  idxMes: number;
  mesesDisponiveis: MesCarrosselEntry[];
  filtroStatus: "todos" | InformativoStatus;
  onMesesCarrosselChange: (meses: MesCarrosselEntry[]) => void;
  onRegisterAbrirCriar?: (abrir: () => void) => void;
}) {
  const { theme: t, user } = useApp();
  const perm = usePermission("informativos");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InformativoGerenciamentoRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modalCriar, setModalCriar] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [histRef, setHistRef] = useState<{ id: string; assunto: string } | null>(null);
  const [acaoLoading, setAcaoLoading] = useState<string | null>(null);
  const [confirmandoArquivarId, setConfirmandoArquivarId] = useState<string | null>(null);
  const [confirmandoExcluirId, setConfirmandoExcluirId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSortColuna = useCallback((col: SortCol) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return prev;
      }
      setSortDir("desc");
      return col;
    });
  }, []);

  const abrirCriar = useCallback(() => {
    setEditId(null);
    setModalCriar(true);
  }, []);

  useEffect(() => {
    onRegisterAbrirCriar?.(abrirCriar);
  }, [onRegisterAbrirCriar, abrirCriar]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("conteudo_informativo")
      .select(
        "id, assunto, descricao, perfis, status, created_at, published_at, approved_at, approved_by, created_by, published_by",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GerenciamentoInformativos] carregar:", error);
      setErro(ERRO_CARREGAR);
      setRows([]);
      setLoading(false);
      return;
    }

    const userIds = new Set<string>();
    const built: InformativoGerenciamentoRow[] = [];
    for (const raw of data ?? []) {
      const row = raw as {
        id: string;
        assunto: string;
        descricao: string;
        perfis: string[];
        status: InformativoStatus;
        created_at: string;
        published_at: string | null;
        approved_at: string | null;
        approved_by: string | null;
        created_by: string | null;
        published_by: string | null;
      };
      const autorId = row.created_by ?? row.published_by;
      if (autorId) userIds.add(autorId);
      if (row.approved_by) userIds.add(row.approved_by);
      built.push({
        id: row.id,
        assunto: row.assunto,
        autorNome: "",
        perfisLabel: labelPerfisInformativo(row.perfis ?? []),
        createdAt: row.created_at,
        status: row.status,
        approvedAt: row.approved_at,
        aprovadorNome: "",
        publishedAt: row.published_at,
        textoBusca: `${row.assunto} ${stripHtmlText(row.descricao)} ${(row.perfis ?? []).join(" ")}`,
      });
    }

    const nomes: Record<string, string> = {};
    if (userIds.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", [...userIds]);
      for (const p of profs ?? []) {
        const pr = p as { id: string; name: string | null };
        nomes[pr.id] = pr.name ?? "";
      }
    }

    setRows(
      built.map((r) => {
        const raw = (data ?? []).find((d) => (d as { id: string }).id === r.id) as {
          created_by?: string | null;
          published_by?: string | null;
          approved_by?: string | null;
        } | undefined;
        const autorId = raw?.created_by ?? raw?.published_by;
        return {
          ...r,
          autorNome: autorId ? (nomes[autorId] ?? "") : "",
          aprovadorNome: raw?.approved_by ? (nomes[raw.approved_by] ?? "") : "",
        };
      }),
    );
    onMesesCarrosselChange(buildMesesCarrossel(built.map((b) => ({ iso: b.publishedAt ?? b.createdAt }))));
    setLoading(false);
  }, [onMesesCarrosselChange]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const rowsFiltradas = useMemo(() => {
    const mes = mesesDisponiveis[idxMes];
    const q = buscaDeb.trim().toLowerCase();
    return rows.filter((row) => {
      if (filtroStatus !== "todos" && row.status !== filtroStatus) return false;
      if (!modoHistorico && row.publishedAt && mes && !itemNoMesCarrossel(row.publishedAt, mes)) {
        if (row.status === "publicado" || row.status === "arquivado") return false;
      }
      if (!modoHistorico && !row.publishedAt && mes && !itemNoMesCarrossel(row.createdAt, mes)) {
        if (row.status === "rascunho" || row.status === "aprovacao") return false;
      }
      if (q && !row.textoBusca.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filtroStatus, buscaDeb, modoHistorico, idxMes, mesesDisponiveis]);

  const rowsOrdenadas = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = [...rowsFiltradas];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "assunto":
          cmp = compareTexto(a.assunto, b.assunto, dir);
          break;
        case "autor":
          cmp = compareTexto(a.autorNome, b.autorNome, dir);
          break;
        case "perfis":
          cmp = compareTexto(a.perfisLabel, b.perfisLabel, dir);
          break;
        case "createdAt":
          cmp = compareDataIso(a.createdAt, b.createdAt, dir);
          break;
        case "status":
          cmp = dir * (STATUS_ORDEM[a.status] - STATUS_ORDEM[b.status]);
          break;
        case "approvedAt":
          cmp = compareDataIso(a.approvedAt, b.approvedAt, dir);
          break;
        case "aprovador":
          cmp = compareTexto(a.aprovadorNome, b.aprovadorNome, dir);
          break;
        case "publishedAt":
          cmp = compareDataIso(a.publishedAt, b.publishedAt, dir);
          break;
        default:
          cmp = 0;
      }
      if (cmp !== 0) return cmp;
      return compareDataIso(a.createdAt, b.createdAt, -1);
    });
    return list;
  }, [rowsFiltradas, sortCol, sortDir]);

  async function aprovar(row: InformativoGerenciamentoRow) {
    if (!user?.id) return;
    setAcaoLoading(row.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("conteudo_informativo")
      .update({
        status: "publicado",
        approved_at: now,
        approved_by: user.id,
        published_at: now,
        published_by: user.id,
      })
      .eq("id", row.id);
    if (!error) {
      await registrarHistoricoStatus(supabase, row.id, "aprovacao", "publicado", user.id);
      await carregar();
      onDadosAlterados();
    } else {
      console.error("[GerenciamentoInformativos] aprovar:", error);
      setErro(ERRO_APROVAR);
    }
    setAcaoLoading(null);
  }

  async function arquivar(row: InformativoGerenciamentoRow) {
    if (!user?.id) return;
    setAcaoLoading(row.id);
    const { error } = await supabase.from("conteudo_informativo").update({ status: "arquivado" }).eq("id", row.id);
    if (!error) {
      await registrarHistoricoStatus(supabase, row.id, row.status, "arquivado", user.id);
      await carregar();
      onDadosAlterados();
    } else {
      console.error("[GerenciamentoInformativos] arquivar:", error);
      setErro(ERRO_ARQUIVAR);
    }
    setAcaoLoading(null);
  }

  async function excluir(row: InformativoGerenciamentoRow) {
    if (!user?.id || perm.canExcluirOk !== true) return;
    setAcaoLoading(row.id);
    const { error } = await supabase.from("conteudo_informativo").delete().eq("id", row.id);
    if (!error) {
      await carregar();
      onDadosAlterados();
    } else {
      console.error("[GerenciamentoInformativos] excluir:", error);
      setErro(ERRO_EXCLUIR);
    }
    setAcaoLoading(null);
  }

  return (
    <div role="tabpanel" id="panel-informativos-gerenciamento" aria-labelledby="tab-informativos-gerenciamento" tabIndex={0}>
      {erro ? (
        <div role="alert" style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "rgba(232,64,37,0.12)", color: "#e84025", fontSize: 13 }}>
          {erro}
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: t.textMuted }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
          Carregando…
        </div>
      ) : rowsOrdenadas.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      ) : (
        <div className="app-table-wrap">
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden" }}>
            <caption style={{ display: "none" }}>Gerenciamento de informativos</caption>
            <thead>
              <tr>
                <SortTableTh label="Assunto" col="assunto" sortCol={sortCol} sortDir={sortDir} onSort={onSortColuna} thStyle={getThStyle(t)} align="left" />
                <SortTableTh label="Autor" col="autor" sortCol={sortCol} sortDir={sortDir} onSort={onSortColuna} thStyle={getThStyle(t)} align="left" />
                <SortTableTh label="Perfis" col="perfis" sortCol={sortCol} sortDir={sortDir} onSort={onSortColuna} thStyle={getThStyle(t)} align="left" />
                <SortTableTh label="Data da Criação" col="createdAt" sortCol={sortCol} sortDir={sortDir} onSort={onSortColuna} thStyle={getThStyle(t)} align="right" />
                <SortTableTh label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={onSortColuna} thStyle={getThStyle(t)} align="left" />
                <SortTableTh label="Data de Aprovação" col="approvedAt" sortCol={sortCol} sortDir={sortDir} onSort={onSortColuna} thStyle={getThStyle(t)} align="right" />
                <SortTableTh label="Aprovador" col="aprovador" sortCol={sortCol} sortDir={sortDir} onSort={onSortColuna} thStyle={getThStyle(t)} align="left" />
                <SortTableTh label="Data de Postagem" col="publishedAt" sortCol={sortCol} sortDir={sortDir} onSort={onSortColuna} thStyle={getThStyle(t)} align="right" />
                <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsOrdenadas.map((row, i) => {
                const acoes = acoesPorStatus(row.status).filter(
                  (a) => a !== "excluir" || perm.canExcluirOk === true,
                );
                const busy = acaoLoading === row.id;
                const zebraBg = zebraStripe(i);
                return (
                  <tr
                    key={row.id}
                    style={{ background: zebraBg }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = zebraBg;
                    }}
                  >
                    <td style={{ ...getTdStyle(t), maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.assunto}>
                      {row.assunto}
                    </td>
                    <td style={getTdStyle(t)}>{row.autorNome}</td>
                    <td style={{ ...getTdStyle(t), maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.perfisLabel}>
                      {row.perfisLabel}
                    </td>
                    <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtDataColunaGerenciamento(row.createdAt)}</td>
                    <td style={getTdStyle(t)}>{INFORMATIVO_STATUS_LABEL[row.status]}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtDataColunaGerenciamento(row.approvedAt)}</td>
                    <td style={getTdStyle(t)}>{row.aprovadorNome}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtDataColunaGerenciamento(row.publishedAt)}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {acoes.includes("editar") ? (
                          <button
                            type="button"
                            aria-label={`Editar ${row.assunto}`}
                            title={`Editar ${row.assunto}`}
                            disabled={busy}
                            onClick={() => {
                              setEditId(row.id);
                              setModalCriar(true);
                            }}
                            style={btnAcao(t)}
                          >
                            <Pencil size={13} aria-hidden />
                          </button>
                        ) : null}
                        {acoes.includes("aprovar") ? (
                          <button
                            type="button"
                            aria-label={`Aprovar ${row.assunto}`}
                            title={`Aprovar ${row.assunto}`}
                            disabled={busy}
                            onClick={() => void aprovar(row)}
                            style={btnAcao(t)}
                          >
                            <Check size={13} aria-hidden />
                          </button>
                        ) : null}
                        {acoes.includes("arquivar") ? (
                          <button
                            type="button"
                            aria-label={`${confirmandoArquivarId === row.id ? "Confirmar arquivamento:" : "Arquivar:"} ${row.assunto}`}
                            title={`${confirmandoArquivarId === row.id ? "Confirmar arquivamento" : "Arquivar"} ${row.assunto}`}
                            disabled={busy}
                            onClick={() => {
                              if (confirmandoArquivarId !== row.id) {
                                setConfirmandoArquivarId(row.id);
                                return;
                              }
                              void arquivar(row);
                              setConfirmandoArquivarId(null);
                            }}
                            onBlur={() => setConfirmandoArquivarId(null)}
                            style={{
                              ...btnAcao(t),
                              ...(confirmandoArquivarId === row.id
                                ? { border: "1px solid rgba(232,64,37,0.6)", background: "rgba(232,64,37,0.15)", color: "#e84025" }
                                : {}),
                            }}
                          >
                            <Archive size={13} aria-hidden />
                            {confirmandoArquivarId === row.id ? (
                              <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 700 }}>Confirmar?</span>
                            ) : null}
                          </button>
                        ) : null}
                        {acoes.includes("historico") ? (
                          <button
                            type="button"
                            aria-label={`Histórico de ${row.assunto}`}
                            title={`Histórico de ${row.assunto}`}
                            disabled={busy}
                            onClick={() => setHistRef({ id: row.id, assunto: row.assunto })}
                            style={btnAcao(t)}
                          >
                            <Clock size={13} aria-hidden />
                          </button>
                        ) : null}
                        {acoes.includes("excluir") ? (
                          <button
                            type="button"
                            aria-label={`${confirmandoExcluirId === row.id ? "Confirmar exclusão:" : "Excluir:"} ${row.assunto}`}
                            title={`${confirmandoExcluirId === row.id ? "Confirmar exclusão" : "Excluir"} ${row.assunto}`}
                            disabled={busy}
                            onClick={() => {
                              if (confirmandoExcluirId !== row.id) {
                                setConfirmandoExcluirId(row.id);
                                return;
                              }
                              void excluir(row);
                              setConfirmandoExcluirId(null);
                            }}
                            onBlur={() => setConfirmandoExcluirId(null)}
                            style={{
                              ...btnAcao(t),
                              ...(confirmandoExcluirId === row.id
                                ? { border: "1px solid rgba(232,64,37,0.6)", background: "rgba(232,64,37,0.15)", color: "#e84025" }
                                : {}),
                            }}
                          >
                            <Trash2 size={13} aria-hidden />
                            {confirmandoExcluirId === row.id ? (
                              <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 700 }}>Confirmar?</span>
                            ) : null}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalCriarInformativo
        open={modalCriar}
        modo={editId ? "editar" : "criar"}
        editId={editId}
        onClose={() => {
          setModalCriar(false);
          setEditId(null);
        }}
        onSalvo={() => {
          void carregar();
          onDadosAlterados();
        }}
      />

      <ModalHistoricoInformativo
        open={!!histRef}
        assunto={histRef?.assunto ?? ""}
        informativoId={histRef?.id ?? null}
        onClose={() => setHistRef(null)}
      />
    </div>
  );
}

function btnAcao(t: { cardBorder: string; inputBg?: string; textMuted: string }) {
  return {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.textMuted,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
}
