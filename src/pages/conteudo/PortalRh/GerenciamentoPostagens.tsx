import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock, Loader2, Newspaper, Pencil } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { BtnArquivarLinha } from "../../../components/BtnArquivarLinha";
import { ModalConfirmArquivarPadrao } from "../../../components/OperacoesModal";
import { descricaoModalArquivarItem, tooltipArquivar } from "../../../lib/arquivarItemUi";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { FiltroBarCampoSelect, SortTableTh, type SortDir } from "../../../components/dashboard";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import {
  fmtDataColunaGerenciamento,
  labelComunicadoFromSlug,
  labelPoliticaFromSlug,
  registrarHistoricoStatus,
  RH_POSTAGEM_STATUS_LABEL,
  RH_POSTAGEM_TIPO_UI_LABEL,
  stripHtmlText,
  type RhPostagemContentType,
  type RhPostagemStatus,
  type RhPostagemTipoUi,
} from "../../../lib/portalRhWorkflow";
import { normalizarTextoBusca } from "../../../lib/searchText";
import { labelTipoDocumentoPortal, type RhDocumentoTipo } from "../../../lib/portalRhDocumentoNormativo";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { ModalCriarPostagem, type PostagemEditRef } from "./ModalCriarPostagem";
import { ModalHistoricoPostagem } from "./ModalHistoricoPostagem";
import { buildMesesCarrossel, itemNoMesCarrossel, type MesCarrosselEntry } from "./portalRhCarrossel";
import { getPeriodoHistoricoCompetencias, isDataNoPeriodoHistoricoCompetencias } from "../../../lib/dashboardHelpers";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { TabelaPaginacaoBar } from "../../../components/TabelaPaginacaoBar";
import { clampPageIndex, slicePage, TABELA_PAGE_SIZE_PRESTADORES } from "../../../lib/tablePagination";

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
  "Não foi possível carregar as postagens. Se o problema persistir, entre em contato com o suporte.";
const ERRO_APROVAR =
  "Não foi possível aprovar a postagem. Se o problema persistir, entre em contato com o suporte.";
const ERRO_ARQUIVAR =
  "Não foi possível arquivar a postagem. Se o problema persistir, entre em contato com o suporte.";

const POSTAGEM_TIPO_FILTRO_OPCOES = (["comunicado", "politica", "rh_talk"] as const).map((value) => ({
  value,
  label: RH_POSTAGEM_TIPO_UI_LABEL[value],
}));

const POSTAGEM_STATUS_FILTRO_OPCOES = (["publicado", "rascunho", "aprovacao", "arquivado"] as const).map(
  (value) => ({
    value,
    label: RH_POSTAGEM_STATUS_LABEL[value],
  }),
);

/** Filtros de tipo e status — renderizados no bloco de filtros da página (linha 3). */
export function GerenciamentoPostagensFiltrosTipoStatus({
  filtroTipo,
  onFiltroTipoChange,
  filtroStatus,
  onFiltroStatusChange,
}: {
  filtroTipo: "todos" | RhPostagemTipoUi;
  onFiltroTipoChange: (v: "todos" | RhPostagemTipoUi) => void;
  filtroStatus: "todos" | RhPostagemStatus;
  onFiltroStatusChange: (v: "todos" | RhPostagemStatus) => void;
}) {
  return (
    <>
      <FiltroBarCampoSelect
        id="filtro-tipo-postagem-portal-rh"
        value={filtroTipo}
        onChange={(v) => onFiltroTipoChange(v as typeof filtroTipo)}
        options={POSTAGEM_TIPO_FILTRO_OPCOES}
        icon={<Newspaper size={15} strokeWidth={2} aria-hidden="true" />}
        ariaLabel="Tipos de postagem"
        todasValue="todos"
        todasLabel="Todas Postagens"
      />
      <FiltroBarCampoSelect
        id="filtro-status-postagem-portal-rh"
        value={filtroStatus}
        onChange={(v) => onFiltroStatusChange(v as typeof filtroStatus)}
        options={POSTAGEM_STATUS_FILTRO_OPCOES}
        icon={FilterBarIcons.status}
        ariaLabel="Status da postagem"
        todasValue="todos"
        todasLabel="Todos Status"
      />
    </>
  );
}

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
  buscaDeb,
  modoHistorico,
  idxMes,
  mesesDisponiveis,
  filtroTipo,
  filtroStatus,
  onMesesCarrosselChange,
  onRegisterAbrirCriar,
}: {
  categoriasCom: Categoria[];
  categoriasPol: Categoria[];
  onDadosAlterados: () => void;
  buscaDeb: string;
  modoHistorico: boolean;
  idxMes: number;
  mesesDisponiveis: MesCarrosselEntry[];
  filtroTipo: "todos" | RhPostagemTipoUi;
  filtroStatus: "todos" | RhPostagemStatus;
  onMesesCarrosselChange: (meses: MesCarrosselEntry[]) => void;
  onRegisterAbrirCriar?: (abrir: () => void) => void;
}) {
  const { theme: t, user } = useApp();
  const dataTable = useDataTableBlock();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PostagemGerenciamentoRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [modalCriar, setModalCriar] = useState(false);
  const [editRef, setEditRef] = useState<PostagemEditRef | null>(null);
  const [histRef, setHistRef] = useState<{ contentType: RhPostagemContentType; id: string; assunto: string } | null>(null);
  const [acaoLoading, setAcaoLoading] = useState<string | null>(null);
  const [alvoArquivar, setAlvoArquivar] = useState<PostagemGerenciamentoRow | null>(null);
  const [pagina, setPagina] = useState(0);
  const [erroArquivar, setErroArquivar] = useState<string | null>(null);
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

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const { inicio } = getPeriodoHistoricoCompetencias();

    let coms: unknown[] = [];
    let docs: unknown[] = [];
    let talks: unknown[] = [];
    try {
      [coms, docs, talks] = await Promise.all([
        fetchAllPages(async (from, to) => {
          const res = await supabase
            .from("rh_portal_comunicado")
            .select("id, titulo, corpo, status, created_at, published_at, approved_at, approved_by, created_by, published_by, categoria:rh_portal_categoria(slug)")
            .gte("created_at", inicio)
            .order("created_at", { ascending: false })
            .range(from, to);
          return { data: res.data as unknown as Record<string, unknown>[] | null, error: res.error };
        }),
        fetchAllPages(async (from, to) => {
          const res = await supabase
            .from("rh_portal_documento")
            .select("id, titulo, corpo, introducao, resumo, status, created_at, published_at, approved_at, approved_by, created_by, codigo, versao, tipo_documento, categoria:rh_portal_categoria(slug)")
            .gte("created_at", inicio)
            .order("created_at", { ascending: false })
            .range(from, to);
          return { data: res.data as unknown as Record<string, unknown>[] | null, error: res.error };
        }),
        fetchAllPages(async (from, to) => {
          const res = await supabase
            .from("rh_portal_rh_talk")
            .select("id, titulo, corpo, resumo, introducao, status, created_at, published_at, approved_at, approved_by, created_by")
            .gte("created_at", inicio)
            .order("created_at", { ascending: false })
            .range(from, to);
          return { data: res.data as unknown as Record<string, unknown>[] | null, error: res.error };
        }),
      ]);
    } catch (e) {
      console.error("[GerenciamentoPostagens] carregar:", e);
      setErro(ERRO_CARREGAR_GERENCIAMENTO);
      setRows([]);
      setLoading(false);
      return;
    }

    const comRes = { data: coms };
    const docRes = { data: docs };
    const talkRes = { data: talks };

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
        textoBusca: normalizarTextoBusca(`${row.titulo} ${stripHtmlText(row.corpo)}`),
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
        codigo: string | null;
        versao: string | null;
        tipo_documento: RhDocumentoTipo | null;
        resumo: string | null;
        categoria?: { slug: string } | { slug: string }[] | null;
      };
      const catSlug = Array.isArray(row.categoria) ? row.categoria[0]?.slug : row.categoria?.slug;
      if (row.created_by) userIds.add(row.created_by);
      if (row.approved_by) userIds.add(row.approved_by);
      const tipoLabel = row.codigo
        ? `${row.codigo}${row.versao ? ` v${row.versao}` : ""}`
        : row.tipo_documento
          ? labelTipoDocumentoPortal(row.tipo_documento)
          : labelPoliticaFromSlug(catSlug ?? "");
      built.push({
        id: row.id,
        contentType: "documento",
        tipoUi: "politica",
        assunto: row.titulo,
        autorNome: "",
        tipoPostagemLabel: tipoLabel,
        createdAt: row.created_at,
        status: row.status ?? "publicado",
        approvedAt: row.approved_at,
        aprovadorNome: "",
        publishedAt: row.published_at,
        textoBusca: normalizarTextoBusca(
          `${row.titulo} ${row.codigo ?? ""} ${row.resumo ?? row.introducao ?? ""} ${stripHtmlText(row.corpo ?? "")}`,
        ),
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
        textoBusca: normalizarTextoBusca(`${row.titulo} ${row.introducao ?? ""} ${stripHtmlText(row.corpo ?? row.resumo ?? "")}`),
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

  const mesesFromRows = useMemo(
    () => buildMesesCarrossel(rows.map((r) => ({ iso: r.publishedAt ?? r.createdAt }))),
    [rows],
  );

  useEffect(() => {
    onMesesCarrosselChange(mesesFromRows);
  }, [mesesFromRows, onMesesCarrosselChange]);

  useEffect(() => {
    onRegisterAbrirCriar?.(() => {
      setEditRef(null);
      setModalCriar(true);
    });
    return () => onRegisterAbrirCriar?.(() => {});
  }, [onRegisterAbrirCriar]);

  const rowsFiltradas = useMemo(() => {
    const mesSel = mesesDisponiveis[idxMes];
    let list = rows;
    if (!modoHistorico) {
      list = list.filter((row) => {
        if (row.publishedAt && mesSel && !itemNoMesCarrossel(row.publishedAt, mesSel)) {
          if (row.status === "publicado" || row.status === "arquivado") return false;
        }
        if (!row.publishedAt && mesSel && !itemNoMesCarrossel(row.createdAt, mesSel)) {
          if (row.status === "rascunho" || row.status === "aprovacao") return false;
        }
        return true;
      });
    } else {
      list = list.filter((row) =>
        isDataNoPeriodoHistoricoCompetencias(row.publishedAt ?? row.createdAt),
      );
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

  useEffect(() => {
    setPagina(0);
  }, [rowsFiltradas, sortCol, sortDir]);

  const paginaSafe = clampPageIndex(pagina, rowsOrdenadas.length, TABELA_PAGE_SIZE_PRESTADORES);
  const rowsPagina = useMemo(
    () => slicePage(rowsOrdenadas, paginaSafe, TABELA_PAGE_SIZE_PRESTADORES),
    [rowsOrdenadas, paginaSafe],
  );

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

  async function confirmarArquivar() {
    if (!user?.id || !alvoArquivar) return;
    setErroArquivar(null);
    setAcaoLoading(alvoArquivar.id);
    const row = alvoArquivar;
    const table =
      row.contentType === "comunicado"
        ? "rh_portal_comunicado"
        : row.contentType === "documento"
          ? "rh_portal_documento"
          : "rh_portal_rh_talk";
    const { error } = await supabase.from(table).update({ status: "arquivado" }).eq("id", row.id);
    if (!error) {
      await registrarHistoricoStatus(supabase, row.contentType, row.id, row.status, "arquivado", user.id);
      setAlvoArquivar(null);
      await carregar();
      onDadosAlterados();
    } else {
      console.error("[GerenciamentoPostagens] arquivar:", error);
      setErroArquivar(ERRO_ARQUIVAR);
    }
    setAcaoLoading(null);
  }

  return (
    <div role="tabpanel" id="panel-rh-portal-gerenciamento" aria-labelledby="tab-rh-portal-gerenciamento" tabIndex={0}>
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
        <>
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 960 })}>
            <caption style={{ display: "none" }}>Gerenciamento de postagens do Portal de RH</caption>
            <thead>
              <tr>
                <SortTableTh
                  label="Assunto"
                  col="assunto"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Autor"
                  col="autor"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Tipo de Postagem"
                  col="tipo"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Data da Criação"
                  col="createdAt"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Status"
                  col="status"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Data de Aprovação"
                  col="approvedAt"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Aprovador"
                  col="aprovador"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Data de Postagem"
                  col="publishedAt"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <th scope="col" style={dataTable.thHeader}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsPagina.map((row, i) => {
                const acoes = acoesPorStatus(row.status);
                const busy = acaoLoading === row.id;
                const zebraBg = dataTable.zebraRow(i);
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
                        ...dataTable.tdCenter,
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.assunto}
                    >
                      {row.assunto}
                    </td>
                    <td style={dataTable.tdCenter}>{row.autorNome}</td>
                    <td style={dataTable.tdCenter}>{row.tipoPostagemLabel}</td>
                    <td style={dataTable.tdCenter}>{fmtDataColunaGerenciamento(row.createdAt)}</td>
                    <td style={dataTable.tdCenter}>{RH_POSTAGEM_STATUS_LABEL[row.status]}</td>
                    <td style={dataTable.tdCenter}>{fmtDataColunaGerenciamento(row.approvedAt)}</td>
                    <td style={dataTable.tdCenter}>{row.aprovadorNome}</td>
                    <td style={dataTable.tdCenter}>{fmtDataColunaGerenciamento(row.publishedAt)}</td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        {acoes.includes("editar") ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Editar postagem")}
                            disabled={busy}
                            onClick={() => {
                              setEditRef({ contentType: row.contentType, id: row.id });
                              setModalCriar(true);
                            }}
                          >
                            <Pencil size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                        {acoes.includes("aprovar") ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Aprovar")}
                            disabled={busy}
                            onClick={() => void aprovarPostagem(row)}
                          >
                            <Check size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                        {acoes.includes("arquivar") ? (
                          <BtnArquivarLinha
                            labelAcao={tooltipArquivar("postagem")}
                            disabled={busy}
                            onClick={() => {
                              setErroArquivar(null);
                              setAlvoArquivar(row);
                            }}
                          />
                        ) : null}
                        {acoes.includes("historico") ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Histórico da postagem")}
                            disabled={busy}
                            onClick={() =>
                              setHistRef({ contentType: row.contentType, id: row.id, assunto: row.assunto })
                            }
                          >
                            <Clock size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && rowsOrdenadas.length > 0 ? (
          <TabelaPaginacaoBar
            t={t}
            page={paginaSafe}
            pageSize={TABELA_PAGE_SIZE_PRESTADORES}
            totalItems={rowsOrdenadas.length}
            onPageChange={setPagina}
          />
        ) : null}
        </>
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

      {alvoArquivar ? (
        <ModalConfirmArquivarPadrao
          descricaoItem={descricaoModalArquivarItem("a postagem", alvoArquivar.assunto)}
          onCancel={() => {
            if (acaoLoading !== alvoArquivar.id) {
              setErroArquivar(null);
              setAlvoArquivar(null);
            }
          }}
          onConfirm={() => void confirmarArquivar()}
          loading={acaoLoading === alvoArquivar.id}
          error={erroArquivar}
        />
      ) : null}
    </div>
  );
}
