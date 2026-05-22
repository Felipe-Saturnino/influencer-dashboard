import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Check, Clock, Loader2, Pencil } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { getTdStyle, getThStyle, zebraStripe } from "../../../lib/tableStyles";
import {
  fmtDataColunaGerenciamento,
  labelComunicadoFromSlug,
  labelPoliticaFromSlug,
  registrarHistoricoStatus,
  RH_POSTAGEM_STATUS_LABEL,
  stripHtmlText,
  type RhPostagemContentType,
  type RhPostagemStatus,
  type RhPostagemTipoUi,
} from "../../../lib/portalRhWorkflow";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { ModalCriarPostagem, type PostagemEditRef } from "./ModalCriarPostagem";
import { ModalHistoricoPostagem } from "./ModalHistoricoPostagem";
import { buildMesesCarrossel, itemNoMesCarrossel } from "./portalRhCarrossel";
import { PortalRhBlocoFiltros } from "./PortalRhBlocoFiltros";

type Categoria = { id: string; slug: string; label: string; scope: string };

export type PostagemGerenciamentoRow = {
  id: string;
  contentType: RhPostagemContentType;
  tipoUi: RhPostagemTipoUi;
  assunto: string;
  autorNome: string;
  tipoPostagemLabel: string;
  createdAt: string;
  status: RhPostagemStatus;
  approvedAt: string | null;
  aprovadorNome: string;
  publishedAt: string | null;
  textoBusca: string;
};

type PostagemSortCol =
  | "assunto"
  | "autor"
  | "tipo"
  | "createdAt"
  | "status"
  | "approvedAt"
  | "aprovador"
  | "publishedAt";

const STATUS_ORDEM: Record<RhPostagemStatus, number> = {
  rascunho: 0,
  aprovacao: 1,
  publicado: 2,
  arquivado: 3,
};

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

const ERRO_CARREGAR_GERENCIAMENTO =
  "Não foi possível carregar as postagens. Se o problema persistir, contate o suporte.";
const ERRO_APROVAR =
  "Não foi possível aprovar a postagem. Se o problema persistir, contate o suporte.";
const ERRO_ARQUIVAR =
  "Não foi possível arquivar a postagem. Se o problema persistir, contate o suporte.";

function acoesPorStatus(status: RhPostagemStatus): ("editar" | "aprovar" | "arquivar" | "historico")[] {
  switch (status) {
    case "publicado":
      return ["arquivar", "historico"];
    case "rascunho":
      return ["editar", "historico"];
    case "aprovacao":
      return ["editar", "aprovar", "historico"];
    case "arquivado":
      return ["historico"];
    default:
      return ["historico"];
  }
}

export function GerenciamentoPostagens({
  categoriasCom,
  categoriasPol,
  onDadosAlterados,
}: {
  categoriasCom: Categoria[];
  categoriasPol: Categoria[];
  onDadosAlterados: () => void;
}) {
  const { theme: t, user } = useApp();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PostagemGerenciamentoRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState<"todos" | RhPostagemTipoUi>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | RhPostagemStatus>("todos");
  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");
  const [idxMes, setIdxMes] = useState(0);
  const [modoHistorico, setModoHistorico] = useState(false);

  const [modalCriar, setModalCriar] = useState(false);
  const [editRef, setEditRef] = useState<PostagemEditRef | null>(null);
  const [histRef, setHistRef] = useState<{ contentType: RhPostagemContentType; id: string; assunto: string } | null>(null);
  const [acaoLoading, setAcaoLoading] = useState<string | null>(null);
  const [confirmandoArquivarId, setConfirmandoArquivarId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<PostagemSortCol>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSortColuna = useCallback((col: PostagemSortCol) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return prev;
      }
      setSortDir("desc");
      return col;
    });
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setBuscaDeb(busca.trim().toLowerCase()), 300);
    return () => window.clearTimeout(id);
  }, [busca]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);

    const [comRes, docRes, talkRes] = await Promise.all([
      supabase
        .from("rh_portal_comunicado")
        .select("id, titulo, corpo, status, created_at, published_at, approved_at, approved_by, created_by, published_by, categoria:rh_portal_categoria(slug)")
        .order("created_at", { ascending: false }),
      supabase
        .from("rh_portal_documento")
        .select("id, titulo, corpo, introducao, status, created_at, published_at, approved_at, approved_by, created_by, categoria:rh_portal_categoria(slug)")
        .order("created_at", { ascending: false }),
      supabase
        .from("rh_portal_rh_talk")
        .select("id, titulo, corpo, resumo, introducao, status, created_at, published_at, approved_at, approved_by, created_by")
        .order("created_at", { ascending: false }),
    ]);

    if (comRes.error || docRes.error || talkRes.error) {
      const err = comRes.error ?? docRes.error ?? talkRes.error;
      console.error("[GerenciamentoPostagens] carregar:", err);
      setErro(ERRO_CARREGAR_GERENCIAMENTO);
      setRows([]);
      setLoading(false);
      return;
    }

    const userIds = new Set<string>();
    const built: PostagemGerenciamentoRow[] = [];

    for (const c of comRes.data ?? []) {
      const row = c as unknown as {
        id: string;
        titulo: string;
        corpo: string;
        status: RhPostagemStatus;
        created_at: string;
        published_at: string | null;
        approved_at: string | null;
        approved_by: string | null;
        created_by: string | null;
        published_by: string | null;
        categoria?: { slug: string } | { slug: string }[] | null;
      };
      const catSlugCom = Array.isArray(row.categoria) ? row.categoria[0]?.slug : row.categoria?.slug;
      const autorId = row.created_by ?? row.published_by;
      if (autorId) userIds.add(autorId);
      if (row.approved_by) userIds.add(row.approved_by);
      built.push({
        id: row.id,
        contentType: "comunicado",
        tipoUi: "comunicado",
        assunto: row.titulo,
        autorNome: "",
        tipoPostagemLabel: labelComunicadoFromSlug(catSlugCom ?? ""),
        createdAt: row.created_at,
        status: row.status ?? "publicado",
        approvedAt: row.approved_at,
        aprovadorNome: "",
        publishedAt: row.published_at,
        textoBusca: `${row.titulo} ${stripHtmlText(row.corpo)}`.toLowerCase(),
        _autorId: autorId,
        _aprovadorId: row.approved_by,
      } as PostagemGerenciamentoRow & { _autorId?: string | null; _aprovadorId?: string | null });
    }

    for (const d of docRes.data ?? []) {
      const row = d as unknown as {
        id: string;
        titulo: string;
        corpo: string | null;
        introducao: string | null;
        status: RhPostagemStatus;
        created_at: string;
        published_at: string | null;
        approved_at: string | null;
        approved_by: string | null;
        created_by: string | null;
        categoria?: { slug: string } | { slug: string }[] | null;
      };
      const catSlug = Array.isArray(row.categoria) ? row.categoria[0]?.slug : row.categoria?.slug;
      if (row.created_by) userIds.add(row.created_by);
      if (row.approved_by) userIds.add(row.approved_by);
      built.push({
        id: row.id,
        contentType: "documento",
        tipoUi: "politica",
        assunto: row.titulo,
        autorNome: "",
        tipoPostagemLabel: labelPoliticaFromSlug(catSlug ?? ""),
        createdAt: row.created_at,
        status: row.status ?? "publicado",
        approvedAt: row.approved_at,
        aprovadorNome: "",
        publishedAt: row.published_at,
        textoBusca: `${row.titulo} ${row.introducao ?? ""} ${stripHtmlText(row.corpo ?? "")}`.toLowerCase(),
        _autorId: row.created_by,
        _aprovadorId: row.approved_by,
      } as PostagemGerenciamentoRow & { _autorId?: string | null; _aprovadorId?: string | null });
    }

    for (const tk of talkRes.data ?? []) {
      const row = tk as {
        id: string;
        titulo: string;
        corpo: string | null;
        resumo: string | null;
        introducao: string | null;
        status: RhPostagemStatus;
        created_at: string;
        published_at: string | null;
        approved_at: string | null;
        approved_by: string | null;
        created_by: string | null;
      };
      if (row.created_by) userIds.add(row.created_by);
      if (row.approved_by) userIds.add(row.approved_by);
      built.push({
        id: row.id,
        contentType: "rh_talk",
        tipoUi: "rh_talk",
        assunto: row.titulo,
        autorNome: "",
        tipoPostagemLabel: "RH Talks",
        createdAt: row.created_at,
        status: row.status ?? "publicado",
        approvedAt: row.approved_at,
        aprovadorNome: "",
        publishedAt: row.published_at,
        textoBusca: `${row.titulo} ${row.introducao ?? ""} ${stripHtmlText(row.corpo ?? row.resumo ?? "")}`.toLowerCase(),
        _autorId: row.created_by,
        _aprovadorId: row.approved_by,
      } as PostagemGerenciamentoRow & { _autorId?: string | null; _aprovadorId?: string | null });
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
        const ext = r as PostagemGerenciamentoRow & { _autorId?: string | null; _aprovadorId?: string | null };
        return {
          ...r,
          autorNome: (ext._autorId && nomes[ext._autorId]) || "—",
          aprovadorNome: (ext._aprovadorId && nomes[ext._aprovadorId]) || "—",
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const mesesDisponiveis = useMemo(
    () => buildMesesCarrossel(rows.map((r) => ({ iso: r.publishedAt }))),
    [rows],
  );

  useEffect(() => {
    if (mesesDisponiveis.length === 0) return;
    setIdxMes((i) => Math.min(i, mesesDisponiveis.length - 1));
  }, [mesesDisponiveis]);

  useEffect(() => {
    if (rows.length > 0 && mesesDisponiveis.length > 0) {
      setIdxMes(mesesDisponiveis.length - 1);
    }
  }, [rows.length, mesesDisponiveis.length]);

  const rowsFiltradas = useMemo(() => {
    let list = rows;
    if (!modoHistorico) {
      const mesSel = mesesDisponiveis[idxMes];
      list = list.filter((r) => itemNoMesCarrossel(r.publishedAt, mesSel));
    }
    if (filtroTipo !== "todos") {
      list = list.filter((r) => r.tipoUi === filtroTipo);
    }
    if (filtroStatus !== "todos") {
      list = list.filter((r) => r.status === filtroStatus);
    }
    if (buscaDeb) {
      list = list.filter((r) => r.textoBusca.includes(buscaDeb));
    }
    return list;
  }, [rows, mesesDisponiveis, idxMes, modoHistorico, filtroTipo, filtroStatus, buscaDeb]);

  const rowsOrdenadas = useMemo(() => {
    const list = [...rowsFiltradas];
    const dir = sortDir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "assunto":
          cmp = compareTexto(a.assunto, b.assunto, dir);
          break;
        case "autor":
          cmp = compareTexto(a.autorNome, b.autorNome, dir);
          break;
        case "tipo":
          cmp = compareTexto(a.tipoPostagemLabel, b.tipoPostagemLabel, dir);
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
          cmp = compareTexto(a.aprovadorNome ?? "", b.aprovadorNome ?? "", dir);
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

  const selectFiltroStyle = {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 12,
    fontFamily: FONT.body,
    cursor: "pointer",
    minWidth: 0,
  } as const;

  async function aprovarPostagem(row: PostagemGerenciamentoRow) {
    if (!user?.id) return;
    setAcaoLoading(row.id);
    const now = new Date().toISOString();
    const table =
      row.contentType === "comunicado"
        ? "rh_portal_comunicado"
        : row.contentType === "documento"
          ? "rh_portal_documento"
          : "rh_portal_rh_talk";
    const payload: Record<string, unknown> = {
      status: "publicado",
      approved_at: now,
      approved_by: user.id,
      published_at: now,
    };
    if (row.contentType === "comunicado") {
      payload.published_by = user.id;
    }
    if (row.contentType === "documento") {
      payload.updated_by = user.id;
    }
    if (row.contentType === "rh_talk") {
      payload.data_reuniao = now.slice(0, 10);
      const { data: cur } = await supabase.from("rh_portal_rh_talk").select("numero").eq("id", row.id).single();
      if ((cur as { numero: number | null } | null)?.numero == null) {
        const { data: maxRow } = await supabase.from("rh_portal_rh_talk").select("numero").order("numero", { ascending: false }).limit(1);
        payload.numero = ((maxRow?.[0] as { numero: number } | undefined)?.numero ?? 0) + 1;
      }
    }
    const { error } = await supabase.from(table).update(payload).eq("id", row.id);
    if (!error) {
      await registrarHistoricoStatus(supabase, row.contentType, row.id, "aprovacao", "publicado", user.id);
      await carregar();
      onDadosAlterados();
    } else {
      console.error("[GerenciamentoPostagens] aprovar:", error);
      setErro(ERRO_APROVAR);
    }
    setAcaoLoading(null);
  }

  async function arquivarPostagem(row: PostagemGerenciamentoRow) {
    if (!user?.id) return;
    setAcaoLoading(row.id);
    const table =
      row.contentType === "comunicado"
        ? "rh_portal_comunicado"
        : row.contentType === "documento"
          ? "rh_portal_documento"
          : "rh_portal_rh_talk";
    const { error } = await supabase.from(table).update({ status: "arquivado" }).eq("id", row.id);
    if (!error) {
      await registrarHistoricoStatus(supabase, row.contentType, row.id, row.status, "arquivado", user.id);
      await carregar();
      onDadosAlterados();
    } else {
      console.error("[GerenciamentoPostagens] arquivar:", error);
      setErro(ERRO_ARQUIVAR);
    }
    setAcaoLoading(null);
  }

  return (
    <div role="tabpanel" id="panel-rh-portal-gerenciamento" aria-labelledby="tab-rh-portal-gerenciamento" tabIndex={0}>
      <PortalRhBlocoFiltros
        meses={mesesDisponiveis}
        idxMes={idxMes}
        onIdxMesChange={setIdxMes}
        modoHistorico={modoHistorico}
        onModoHistoricoChange={setModoHistorico}
        busca={busca}
        onBuscaChange={setBusca}
        buscaPlaceholder="Palavras-chave no assunto ou descrição"
        buscaAriaLabel="Pesquisar postagens por assunto ou descrição"
        linhaSubabas={
          <>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
              aria-label="Filtrar por tipo de postagem"
              style={selectFiltroStyle}
            >
              <option value="todos">Todos</option>
              <option value="comunicado">Comunicados</option>
              <option value="politica">Políticas e Normativas</option>
              <option value="rh_talk">RH Talks</option>
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
              aria-label="Filtrar por status da postagem"
              style={selectFiltroStyle}
            >
              <option value="todos">Todos</option>
              <option value="publicado">Publicado</option>
              <option value="rascunho">Rascunho</option>
              <option value="aprovacao">Aprovação</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </>
        }
        linhaAposSubabas={
          <CtaCriarButton
            type="button"
            onClick={() => {
              setEditRef(null);
              setModalCriar(true);
            }}
          >
            Criar
          </CtaCriarButton>
        }
      />

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
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <caption style={{ display: "none" }}>Gerenciamento de postagens do Portal de RH</caption>
            <thead>
              <tr>
                <SortTableTh
                  label="Assunto"
                  col="assunto"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={getThStyle(t)}
                  align="left"
                />
                <SortTableTh
                  label="Autor"
                  col="autor"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={getThStyle(t)}
                  align="left"
                />
                <SortTableTh
                  label="Tipo de Postagem"
                  col="tipo"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={getThStyle(t)}
                  align="left"
                />
                <SortTableTh
                  label="Data da Criação"
                  col="createdAt"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={getThStyle(t)}
                  align="right"
                />
                <SortTableTh
                  label="Status"
                  col="status"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={getThStyle(t)}
                  align="left"
                />
                <SortTableTh
                  label="Data de Aprovação"
                  col="approvedAt"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={getThStyle(t)}
                  align="right"
                />
                <SortTableTh
                  label="Aprovador"
                  col="aprovador"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={getThStyle(t)}
                  align="left"
                />
                <SortTableTh
                  label="Data de Postagem"
                  col="publishedAt"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={getThStyle(t)}
                  align="right"
                />
                <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsOrdenadas.map((row, i) => {
                const acoes = acoesPorStatus(row.status);
                const busy = acaoLoading === row.id;
                const zebraBg = zebraStripe(i);
                return (
                  <tr
                    key={`${row.contentType}-${row.id}`}
                    style={{ background: zebraBg }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = zebraBg;
                    }}
                  >
                    <td
                      style={{
                        ...getTdStyle(t),
                        textAlign: "left",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.assunto}
                    >
                      {row.assunto}
                    </td>
                    <td style={{ ...getTdStyle(t), textAlign: "left" }}>{row.autorNome}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "left" }}>{row.tipoPostagemLabel}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtDataColunaGerenciamento(row.createdAt)}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "left" }}>{RH_POSTAGEM_STATUS_LABEL[row.status]}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtDataColunaGerenciamento(row.approvedAt)}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "left" }}>{row.aprovadorNome}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtDataColunaGerenciamento(row.publishedAt)}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {acoes.includes("editar") ? (
                          <button
                            type="button"
                            aria-label={`Editar ${row.assunto}`}
                            disabled={busy}
                            onClick={() => {
                              setEditRef({ contentType: row.contentType, id: row.id });
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
                            disabled={busy}
                            onClick={() => void aprovarPostagem(row)}
                            style={btnAcao(t)}
                          >
                            <Check size={13} aria-hidden />
                          </button>
                        ) : null}
                        {acoes.includes("arquivar") ? (
                          <button
                            type="button"
                            aria-label={`${confirmandoArquivarId === row.id ? "Confirmar arquivamento:" : "Arquivar:"} ${row.assunto}`}
                            disabled={busy}
                            onClick={() => {
                              if (confirmandoArquivarId !== row.id) {
                                setConfirmandoArquivarId(row.id);
                                return;
                              }
                              void arquivarPostagem(row);
                              setConfirmandoArquivarId(null);
                            }}
                            onBlur={() => setConfirmandoArquivarId(null)}
                            style={{
                              ...btnAcao(t),
                              ...(confirmandoArquivarId === row.id
                                ? {
                                    border: "1px solid rgba(232,64,37,0.6)",
                                    background: "rgba(232,64,37,0.15)",
                                    color: "#e84025",
                                  }
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
                            disabled={busy}
                            onClick={() =>
                              setHistRef({ contentType: row.contentType, id: row.id, assunto: row.assunto })
                            }
                            style={btnAcao(t)}
                          >
                            <Clock size={13} aria-hidden />
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

      <ModalCriarPostagem
        open={modalCriar}
        modo={editRef ? "editar" : "criar"}
        editRef={editRef}
        categoriasCom={categoriasCom}
        categoriasPol={categoriasPol}
        onClose={() => {
          setModalCriar(false);
          setEditRef(null);
        }}
        onSalvo={() => {
          void carregar();
          onDadosAlterados();
        }}
      />

      <ModalHistoricoPostagem
        open={!!histRef}
        assunto={histRef?.assunto ?? ""}
        contentType={histRef?.contentType ?? null}
        contentId={histRef?.id ?? null}
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
