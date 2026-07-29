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
  ACADEMY_POSTAGEM_STATUS_LABEL,
  ACADEMY_POSTAGEM_TIPO_UI_LABEL,
  fmtDataColunaGerenciamento,
  labelComunicadoFromSlug,
  labelDicaManualFromSlug,
  podeAprovarPostagemAcademyGerenciamento,
  podeArquivarPostagemAcademyGerenciamento,
  podeEditarPostagemAcademyGerenciamento,
  registrarHistoricoStatus,
  stripHtmlText,
  type AcademyPostagemContentType,
  type AcademyPostagemStatus,
  type AcademyPostagemTipoUi,
} from "../../../lib/academyPortalWorkflow";
import { carregarMetaAutoresPortalAcademy } from "../../../lib/academyPortalAutorMeta";
import { normalizarTextoBusca } from "../../../lib/searchText";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { usePermission } from "../../../hooks/usePermission";
import { ModalCriarPostagem, type PostagemEditRef } from "./ModalCriarPostagem";
import { ModalHistoricoPostagem } from "./ModalHistoricoPostagem";
import { buildMesesCarrossel, itemNoMesCarrossel, type MesCarrosselEntry } from "./portalAcademyCarrossel";
import { getPeriodoHistoricoCompetencias, isDataNoPeriodoHistoricoCompetencias } from "../../../lib/dashboardHelpers";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { TabelaPaginacaoBar } from "../../../components/TabelaPaginacaoBar";
import { clampPageIndex, slicePage, TABELA_PAGE_SIZE_PRESTADORES } from "../../../lib/tablePagination";

type Categoria = { id: string; slug: string; label: string; scope: string };

export type PostagemGerenciamentoRow = {
  id: string;
  contentType: AcademyPostagemContentType;
  tipoUi: AcademyPostagemTipoUi;
  assunto: string;
  autorNome: string;
  postagemTipoLabel: string;
  categoriaLabel: string;
  createdAt: string;
  status: AcademyPostagemStatus;
  publishedAt: string | null;
  createdBy: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  aprovadorNome: string;
  textoBusca: string;
};

type PostagemSortCol =
  | "assunto"
  | "autor"
  | "tipo"
  | "categoria"
  | "createdAt"
  | "status"
  | "approvedAt"
  | "aprovador"
  | "publishedAt";

const STATUS_ORDEM: Record<AcademyPostagemStatus, number> = {
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

const ERRO_CARREGAR =
  "Não foi possível carregar as postagens. Se o problema persistir, entre em contato com o suporte.";
const ERRO_ARQUIVAR =
  "Não foi possível arquivar a postagem. Se o problema persistir, entre em contato com o suporte.";
const ERRO_APROVAR =
  "Não foi possível aprovar a postagem. Se o problema persistir, entre em contato com o suporte.";

function erroColunasAprovacaoAusentes(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const mencionaColuna = message.includes("approved_at") || message.includes("approved_by");
  return (
    mencionaColuna &&
    (message.includes("does not exist") ||
      message.includes("Could not find") ||
      message.includes("schema cache"))
  );
}

const POSTAGEM_TIPO_FILTRO_OPCOES = (["comunicado", "dica", "manual"] as const).map((value) => ({
  value,
  label: ACADEMY_POSTAGEM_TIPO_UI_LABEL[value],
}));

const POSTAGEM_STATUS_FILTRO_OPCOES = (["publicado", "rascunho", "aprovacao", "arquivado"] as const).map(
  (value) => ({
    value,
    label: ACADEMY_POSTAGEM_STATUS_LABEL[value],
  }),
);

export function GerenciamentoPostagensFiltrosTipoStatus({
  filtroTipo,
  onFiltroTipoChange,
  filtroStatus,
  onFiltroStatusChange,
}: {
  filtroTipo: "todos" | AcademyPostagemTipoUi;
  onFiltroTipoChange: (v: "todos" | AcademyPostagemTipoUi) => void;
  filtroStatus: "todos" | AcademyPostagemStatus;
  onFiltroStatusChange: (v: "todos" | AcademyPostagemStatus) => void;
}) {
  return (
    <>
      <FiltroBarCampoSelect
        id="filtro-tipo-postagem-portal-academy"
        value={filtroTipo}
        onChange={(v) => onFiltroTipoChange(v as typeof filtroTipo)}
        options={POSTAGEM_TIPO_FILTRO_OPCOES}
        icon={<Newspaper size={15} strokeWidth={2} aria-hidden="true" />}
        ariaLabel="Tipos de postagem"
        todasValue="todos"
        todasLabel="Todas Postagens"
      />
      <FiltroBarCampoSelect
        id="filtro-status-postagem-portal-academy"
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

function acoesPorStatus(status: AcademyPostagemStatus): ("editar" | "aprovar" | "arquivar" | "historico")[] {
  switch (status) {
    case "publicado":
      return ["editar", "arquivar", "historico"];
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
  categoriasDica,
  categoriasManual,
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
  categoriasDica: Categoria[];
  categoriasManual: Categoria[];
  onDadosAlterados: () => void;
  buscaDeb: string;
  modoHistorico: boolean;
  idxMes: number;
  mesesDisponiveis: MesCarrosselEntry[];
  filtroTipo: "todos" | AcademyPostagemTipoUi;
  filtroStatus: "todos" | AcademyPostagemStatus;
  onMesesCarrosselChange: (meses: MesCarrosselEntry[]) => void;
  onRegisterAbrirCriar?: (abrir: () => void) => void;
}) {
  const { theme: t, user } = useApp();
  const perm = usePermission("academy_portal");
  const dataTable = useDataTableBlock();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PostagemGerenciamentoRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [modalCriar, setModalCriar] = useState(false);
  const [editRef, setEditRef] = useState<PostagemEditRef | null>(null);
  const [histRef, setHistRef] = useState<{ contentType: AcademyPostagemContentType; id: string; assunto: string } | null>(null);
  const [acaoLoading, setAcaoLoading] = useState<string | null>(null);
  const [alvoArquivar, setAlvoArquivar] = useState<PostagemGerenciamentoRow | null>(null);
  const [sortCol, setSortCol] = useState<PostagemSortCol>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pagina, setPagina] = useState(0);

  const abrirCriar = useCallback(() => {
    setEditRef(null);
    setModalCriar(true);
  }, []);

  useEffect(() => {
    onRegisterAbrirCriar?.(abrirCriar);
  }, [onRegisterAbrirCriar, abrirCriar]);

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

    const carregarTabela = (
      tabela: "academy_portal_comunicado" | "academy_portal_dica" | "academy_portal_manual",
      incluirAprovacao: boolean,
    ) =>
      fetchAllPages(async (from, to) => {
        const colunasBase =
          tabela === "academy_portal_manual"
            ? "id, titulo, corpo, introducao, status, created_at, published_at, created_by"
            : "id, titulo, corpo, status, created_at, published_at, created_by";
        const colunasAprovacao =
          incluirAprovacao && tabela !== "academy_portal_manual" ? ", approved_at, approved_by" : "";
        const res = await supabase
          .from(tabela)
          .select(`${colunasBase}${colunasAprovacao}, categoria:academy_portal_categoria(slug)`)
          .gte("created_at", inicio)
          .order("created_at", { ascending: false })
          .range(from, to);
        return { data: res.data as unknown as Record<string, unknown>[] | null, error: res.error };
      });

    let coms: unknown[] = [];
    let dicas: unknown[] = [];
    let manuais: unknown[] = [];
    try {
      [coms, dicas, manuais] = await Promise.all([
        carregarTabela("academy_portal_comunicado", true),
        carregarTabela("academy_portal_dica", true),
        carregarTabela("academy_portal_manual", false),
      ]);
    } catch (e) {
      if (erroColunasAprovacaoAusentes(e)) {
        console.warn(
          "[GerenciamentoPostagens Academy] migration de aprovação pendente; carregando schema anterior.",
          e,
        );
        try {
          [coms, dicas, manuais] = await Promise.all([
            carregarTabela("academy_portal_comunicado", false),
            carregarTabela("academy_portal_dica", false),
            carregarTabela("academy_portal_manual", false),
          ]);
        } catch (fallbackError) {
          console.error("[GerenciamentoPostagens Academy] fallback:", fallbackError);
          setErro(ERRO_CARREGAR);
          setRows([]);
          setLoading(false);
          return;
        }
      } else {
        console.error("[GerenciamentoPostagens Academy]", e);
        setErro(ERRO_CARREGAR);
        setRows([]);
        setLoading(false);
        return;
      }
    }

    const comRes = { data: coms };
    const dicaRes = { data: dicas };
    const manualRes = { data: manuais };

    const userIds = new Set<string>();
    const built: PostagemGerenciamentoRow[] = [];

    const pushRow = (
      row: {
        id: string;
        titulo: string;
        corpo: string;
        status: AcademyPostagemStatus;
        created_at: string;
        published_at: string | null;
        created_by: string | null;
        approved_at?: string | null;
        approved_by?: string | null;
        categoria?: { slug: string } | { slug: string }[] | null;
      },
      contentType: AcademyPostagemContentType,
      tipoUi: AcademyPostagemTipoUi,
      labelFn: (slug: string) => string,
      extraBusca = "",
    ) => {
      const catSlug = Array.isArray(row.categoria) ? row.categoria[0]?.slug : row.categoria?.slug;
      if (row.created_by) userIds.add(row.created_by);
      if (row.approved_by) userIds.add(row.approved_by);
      built.push({
        id: row.id,
        contentType,
        tipoUi,
        assunto: row.titulo,
        autorNome: "",
        postagemTipoLabel: ACADEMY_POSTAGEM_TIPO_UI_LABEL[tipoUi],
        categoriaLabel: labelFn(catSlug ?? ""),
        createdAt: row.created_at,
        status: row.status ?? "rascunho",
        publishedAt: row.published_at,
        createdBy: row.created_by,
        approvedAt: row.approved_at ?? null,
        approvedBy: row.approved_by ?? null,
        aprovadorNome: "",
        textoBusca: normalizarTextoBusca(`${row.titulo} ${stripHtmlText(row.corpo)} ${extraBusca}`),
      });
    };

    for (const c of comRes.data ?? []) {
      pushRow(c as Parameters<typeof pushRow>[0], "comunicado", "comunicado", labelComunicadoFromSlug);
    }
    for (const d of dicaRes.data ?? []) {
      pushRow(d as Parameters<typeof pushRow>[0], "dica", "dica", labelDicaManualFromSlug);
    }
    for (const m of manualRes.data ?? []) {
      const row = m as Parameters<typeof pushRow>[0] & { introducao?: string | null };
      pushRow(row, "manual", "manual", labelDicaManualFromSlug, row.introducao ?? "");
    }

    const meta = await carregarMetaAutoresPortalAcademy([...userIds]);
    const withAutor = built.map((r) => ({
      ...r,
      autorNome: meta[r.createdBy ?? ""]?.nome ?? "—",
      aprovadorNome: r.approvedBy ? (meta[r.approvedBy]?.nome ?? "—") : "—",
    }));

    setRows(withAutor);
    onMesesCarrosselChange(buildMesesCarrossel(withAutor.map((r) => ({ iso: r.publishedAt ?? r.createdAt }))));
    setLoading(false);
  }, [onMesesCarrosselChange]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const rowsFiltradas = useMemo(() => {
    const mesSel = mesesDisponiveis[idxMes];
    let list = [...rows];
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
      list = list.filter((r) =>
        isDataNoPeriodoHistoricoCompetencias(r.publishedAt ?? r.createdAt),
      );
    }
    if (filtroTipo !== "todos") list = list.filter((r) => r.tipoUi === filtroTipo);
    if (filtroStatus !== "todos") list = list.filter((r) => r.status === filtroStatus);
    if (buscaDeb) list = list.filter((r) => r.textoBusca.includes(buscaDeb));

    const dir = sortDir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      switch (sortCol) {
        case "assunto":
          return compareTexto(a.assunto, b.assunto, dir);
        case "autor":
          return compareTexto(a.autorNome, b.autorNome, dir);
        case "tipo":
          return compareTexto(a.postagemTipoLabel, b.postagemTipoLabel, dir);
        case "categoria":
          return compareTexto(a.categoriaLabel, b.categoriaLabel, dir);
        case "status":
          return dir * (STATUS_ORDEM[a.status] - STATUS_ORDEM[b.status]);
        case "approvedAt":
          return compareDataIso(a.approvedAt, b.approvedAt, dir);
        case "aprovador":
          return compareTexto(a.aprovadorNome, b.aprovadorNome, dir);
        case "publishedAt":
          return compareDataIso(a.publishedAt, b.publishedAt, dir);
        default:
          return compareDataIso(a.createdAt, b.createdAt, dir);
      }
    });
    return list;
  }, [rows, modoHistorico, mesesDisponiveis, idxMes, filtroTipo, filtroStatus, buscaDeb, sortCol, sortDir]);

  useEffect(() => {
    setPagina(0);
  }, [rowsFiltradas]);

  const paginaSafe = clampPageIndex(pagina, rowsFiltradas.length, TABELA_PAGE_SIZE_PRESTADORES);
  const rowsPagina = useMemo(
    () => slicePage(rowsFiltradas, paginaSafe, TABELA_PAGE_SIZE_PRESTADORES),
    [rowsFiltradas, paginaSafe],
  );

  const aprovarPostagem = async (row: PostagemGerenciamentoRow) => {
    if (!user?.id || !podeAprovarPostagemAcademyGerenciamento(perm.canEditar)) return;
    if (row.contentType === "manual") return;
    setAcaoLoading(row.id);
    const now = new Date().toISOString();
    const table = row.contentType === "comunicado" ? "academy_portal_comunicado" : "academy_portal_dica";
    const { error } = await supabase
      .from(table)
      .update({
        status: "publicado",
        approved_at: now,
        approved_by: user.id,
        published_at: now,
        published_by: user.id,
      })
      .eq("id", row.id);
    if (error) {
      console.error("[GerenciamentoPostagens Academy] aprovar:", error);
      setAcaoLoading(null);
      setErro(ERRO_APROVAR);
      return;
    }
    await registrarHistoricoStatus(supabase, row.contentType, row.id, "aprovacao", "publicado", user.id);
    setAcaoLoading(null);
    await carregar();
    onDadosAlterados();
  };

  const confirmarArquivar = async () => {
    if (!alvoArquivar || !user?.id) return;
    if (
      !podeArquivarPostagemAcademyGerenciamento(
        perm.canEditar,
        perm.canEditarOk,
        user.id,
        alvoArquivar.createdBy,
      )
    ) {
      setAlvoArquivar(null);
      return;
    }
    setAcaoLoading(alvoArquivar.id);
    const table =
      alvoArquivar.contentType === "comunicado"
        ? "academy_portal_comunicado"
        : alvoArquivar.contentType === "dica"
          ? "academy_portal_dica"
          : "academy_portal_manual";
    const { error } = await supabase.from(table).update({ status: "arquivado" }).eq("id", alvoArquivar.id);
    if (error) {
      console.error("[GerenciamentoPostagens Academy] arquivar:", error);
      setAcaoLoading(null);
      setAlvoArquivar(null);
      setErro(ERRO_ARQUIVAR);
      return;
    }
    await registrarHistoricoStatus(
      supabase,
      alvoArquivar.contentType,
      alvoArquivar.id,
      alvoArquivar.status,
      "arquivado",
      user.id,
    );
    setAcaoLoading(null);
    setAlvoArquivar(null);
    await carregar();
    onDadosAlterados();
  };

  return (
    <div>
      {erro ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, marginBottom: 12 }}>
          {erro}
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 className="app-lucide-spin" size={24} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
          Carregando…
        </div>
      ) : rowsFiltradas.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhuma postagem encontrada.
        </div>
      ) : (
        <>
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 1100 })}>
            <caption style={{ display: "none" }}>Gerenciamento de postagens do Portal da Academy</caption>
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
                  label="Tipo"
                  col="tipo"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Categoria"
                  col="categoria"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Criado em"
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
                  label="Publicado em"
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
                const acoes = acoesPorStatus(row.status).filter((a) => {
                  if (a === "editar") {
                    return podeEditarPostagemAcademyGerenciamento(
                      perm.canEditar,
                      perm.canEditarOk,
                      user?.id,
                      row.createdBy,
                    );
                  }
                  if (a === "arquivar") {
                    return podeArquivarPostagemAcademyGerenciamento(
                      perm.canEditar,
                      perm.canEditarOk,
                      user?.id,
                      row.createdBy,
                    );
                  }
                  if (a === "aprovar") {
                    return podeAprovarPostagemAcademyGerenciamento(perm.canEditar);
                  }
                  return true;
                });
                return (
                  <tr
                    key={`${row.contentType}-${row.id}`}
                    style={{ background: dataTable.zebraRow(i) }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = dataTable.zebraRow(i);
                    }}
                  >
                    <td style={dataTable.tdCenter}>{row.assunto}</td>
                    <td style={dataTable.tdCenter}>{row.autorNome}</td>
                    <td style={dataTable.tdCenter}>{row.postagemTipoLabel}</td>
                    <td style={dataTable.tdCenter}>{row.categoriaLabel}</td>
                    <td style={dataTable.tdCenter}>{fmtDataColunaGerenciamento(row.createdAt)}</td>
                    <td style={dataTable.tdCenter}>{ACADEMY_POSTAGEM_STATUS_LABEL[row.status]}</td>
                    <td style={dataTable.tdCenter}>{fmtDataColunaGerenciamento(row.approvedAt)}</td>
                    <td style={dataTable.tdCenter}>{row.aprovadorNome}</td>
                    <td style={dataTable.tdCenter}>{fmtDataColunaGerenciamento(row.publishedAt)}</td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                        {acoes.includes("editar") ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Editar postagem")}
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
                            label={tooltipAcao("Aprovar postagem")}
                            onClick={() => void aprovarPostagem(row)}
                            disabled={acaoLoading === row.id}
                          >
                            <Check size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                        {acoes.includes("arquivar") ? (
                          <BtnArquivarLinha
                            labelAcao={tooltipArquivar("postagem")}
                            onClick={() => setAlvoArquivar(row)}
                            disabled={acaoLoading === row.id}
                          />
                        ) : null}
                        {acoes.includes("historico") ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Histórico da postagem")}
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
        {!loading && rowsFiltradas.length > 0 ? (
          <TabelaPaginacaoBar
            t={t}
            page={paginaSafe}
            pageSize={TABELA_PAGE_SIZE_PRESTADORES}
            totalItems={rowsFiltradas.length}
            onPageChange={setPagina}
          />
        ) : null}
        </>
      )}

      {modalCriar ? (
        <ModalCriarPostagem
          open={modalCriar}
          modo={editRef ? "editar" : "criar"}
          editRef={editRef}
          categoriasCom={categoriasCom}
          categoriasDica={categoriasDica}
          categoriasManual={categoriasManual}
          onClose={() => {
            setModalCriar(false);
            setEditRef(null);
          }}
          onSalvo={() => {
            void carregar();
            onDadosAlterados();
          }}
        />
      ) : null}

      {histRef ? (
        <ModalHistoricoPostagem
          open
          assunto={histRef.assunto}
          contentType={histRef.contentType}
          contentId={histRef.id}
          onClose={() => setHistRef(null)}
        />
      ) : null}

      {alvoArquivar ? (
        <ModalConfirmArquivarPadrao
          descricaoItem={descricaoModalArquivarItem("a postagem", alvoArquivar.assunto)}
          onCancel={() => setAlvoArquivar(null)}
          onConfirm={() => void confirmarArquivar()}
          loading={acaoLoading === alvoArquivar.id}
        />
      ) : null}
    </div>
  );
}
