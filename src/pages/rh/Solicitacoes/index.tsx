import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Users,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import {
  CtaCriarButton,
  FiltroBarPillButton,
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { TabelaComPaginacao } from "../../../components/TabelaPaginacaoBar";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes, type AjudaContextualTutorial } from "../../../components/AjudaContextualAcoes";
import { TUTORIAL_RH_SOLICITACOES_APROVAR } from "../../geral/Ajuda/tutoriais/rhSolicitacoesAprovar";
import { TUTORIAL_RH_SOLICITACOES_FEEDBACK } from "../../geral/Ajuda/tutoriais/rhSolicitacoesFeedback";
import { TUTORIAL_RH_SOLICITACOES_REUNIOES } from "../../geral/Ajuda/tutoriais/rhSolicitacoesReunioes";
import { TUTORIAL_RH_SOLICITACOES_VAGAS } from "../../geral/Ajuda/tutoriais/rhSolicitacoesVagas";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import {
  descricaoColunaSolicitacao,
  fmtDataCurta,
  fmtDataSolicitacao,
  labelFeedbackOrigem,
  labelFeedbackRecomendacao,
  labelStatusSolicitacao,
  labelTipoSolicitacao,
  RH_SOLICITACAO_ABA_OPTIONS,
  RH_SOLICITACAO_ABA_TIPOS,
  RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE,
  RH_SOLICITACAO_STATUS_CARROSSEL,
  RH_SOLICITACAO_STATUS_CORES,
  RH_SOLICITACAO_STATUS_DEFAULT,
  RH_SOLICITACAO_TODOS_STATUS_LABEL,
  statusFiltroQueryValues,
  subAbaSolicitacao,
} from "../../../lib/rhSolicitacoesConstants";
import type {
  RhSolicitacaoAba,
  RhSolicitacaoFiltroStatus,
  RhSolicitacaoRow,
  RhSolicitacaoStatus,
} from "../../../types/rhSolicitacao";
import { ModalAtenderSolicitacao, ModalVerSolicitacao } from "./ModalsVerAtender";
import { ModalAgendarReuniaoSolicitacoes } from "./ModalAgendarReuniaoSolicitacoes";
import { ModalRegistrarFeedback } from "./ModalRegistrarFeedback";
import { ModalSolicitarVaga } from "./ModalSolicitarVaga";

const RH_SOLICITACOES_SELECT = `
  id,
  created_at,
  updated_at,
  tipo,
  status,
  descricao,
  observacao_rh,
  motivo_rejeicao,
  atestado_inicio,
  atestado_fim,
  atestado_storage_path,
  atestado_file_name,
  rh_vaga_id,
  atendido_em,
  atendido_por,
  abono_remunerado,
  rh_calendario_acao_id,
  reuniao_dia_iso,
  feedback_recomendacao,
  feedback_origem,
  escala_ct_feedback_id,
  lideranca_nome,
  evidencias_storage_paths,
  calendario_acao:rh_calendario_acoes!rh_solicitacoes_rh_calendario_acao_id_fkey ( payload ),
  solicitante:rh_funcionarios!rh_solicitacoes_rh_funcionario_id_fkey ( id, nome, org_time:rh_org_times!rh_funcionarios_org_time_id_fkey ( nome ) ),
  atendente:profiles!rh_solicitacoes_atendido_por_fkey ( id, name ),
  vaga:rh_vagas!rh_solicitacoes_rh_vaga_id_fkey ( id, titulo )
`.trim();

const TUTORIAL_CTX_ATESTADOS: AjudaContextualTutorial = {
  id: TUTORIAL_RH_SOLICITACOES_APROVAR.id,
  urlSlug: TUTORIAL_RH_SOLICITACOES_APROVAR.urlSlug,
  titulo: TUTORIAL_RH_SOLICITACOES_APROVAR.titulo,
  descricao: "Atender atestado como RH — abono remunerado e efeitos no Calendário e na Escala.",
};

const TUTORIAL_CTX_REUNIOES: AjudaContextualTutorial = {
  id: TUTORIAL_RH_SOLICITACOES_REUNIOES.id,
  urlSlug: TUTORIAL_RH_SOLICITACOES_REUNIOES.urlSlug,
  titulo: TUTORIAL_RH_SOLICITACOES_REUNIOES.titulo,
  descricao: "Agendar reunião com o prestador ou atender (aprovar/rejeitar) pedidos pendentes.",
};

const TUTORIAL_CTX_VAGAS: AjudaContextualTutorial = {
  id: TUTORIAL_RH_SOLICITACOES_VAGAS.id,
  urlSlug: TUTORIAL_RH_SOLICITACOES_VAGAS.urlSlug,
  titulo: TUTORIAL_RH_SOLICITACOES_VAGAS.titulo,
  descricao: "Solicitar abertura de vaga e acompanhar o parecer do RH.",
};

const TUTORIAL_CTX_FEEDBACK: AjudaContextualTutorial = {
  id: TUTORIAL_RH_SOLICITACOES_FEEDBACK.id,
  urlSlug: TUTORIAL_RH_SOLICITACOES_FEEDBACK.urlSlug,
  titulo: TUTORIAL_RH_SOLICITACOES_FEEDBACK.titulo,
  descricao: "Registrar feedback ou aprovar feedbacks da liderança vindos do Controle de Turno.",
};

function tutorialCtxPorAba(aba: RhSolicitacaoAba): AjudaContextualTutorial {
  if (aba === "reunioes") return TUTORIAL_CTX_REUNIOES;
  if (aba === "vagas") return TUTORIAL_CTX_VAGAS;
  if (aba === "feedback") return TUTORIAL_CTX_FEEDBACK;
  return TUTORIAL_CTX_ATESTADOS;
}

type SortCol =
  | "data"
  | "solicitante"
  | "tipo"
  | "status"
  | "descricao"
  | "atendido"
  | "atendimento"
  | "lideranca"
  | "recomendacao"
  | "origem"
  | "dataReuniao"
  | "time";

function unwrapEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function nomeSolicitante(row: RhSolicitacaoRow): string {
  return unwrapEmbed(row.solicitante)?.nome?.trim() || "—";
}

function nomeTimeSolicitante(row: RhSolicitacaoRow): string {
  const s = unwrapEmbed(row.solicitante);
  const time = unwrapEmbed(s?.org_time ?? null);
  return time?.nome?.trim() || "—";
}

function nomeAtendente(row: RhSolicitacaoRow): string {
  return unwrapEmbed(row.atendente)?.name?.trim() || "—";
}

function badgeStatus(status: RhSolicitacaoStatus) {
  const cor = RH_SOLICITACAO_STATUS_CORES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        background: `${cor}22`,
        color: cor,
        border: `1px solid ${cor}44`,
        whiteSpace: "nowrap",
      }}
    >
      {labelStatusSolicitacao(status)}
    </span>
  );
}

export default function RhSolicitacoesPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_solicitacoes");
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const [aba, setAba] = useState<RhSolicitacaoAba>("atestados");
  const [filtroStatus, setFiltroStatus] = useState<RhSolicitacaoFiltroStatus>(RH_SOLICITACAO_STATUS_DEFAULT);
  const [lista, setLista] = useState<RhSolicitacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "data", dir: "desc" });
  const [modalVer, setModalVer] = useState<RhSolicitacaoRow | null>(null);
  const [modalAtender, setModalAtender] = useState<RhSolicitacaoRow | null>(null);
  const [modalAgendar, setModalAgendar] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(false);
  const [modalVaga, setModalVaga] = useState(false);

  /** Ver=Sim sem Editar → só leitura (sem ícones). Próprios ou Editar → Ver; Atender se Editar + em_analise. */
  const showAcoes = perm.canEditarOk || perm.canView === "proprios";
  const showCta = perm.canEditarOk;

  const labelStatusCentral =
    filtroStatus === RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE
      ? RH_SOLICITACAO_TODOS_STATUS_LABEL
      : RH_SOLICITACAO_STATUS_CARROSSEL.find((s) => s.key === filtroStatus)?.label ?? RH_SOLICITACAO_TODOS_STATUS_LABEL;

  const todosStatusAtivo = filtroStatus === RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE;

  const avancarStatus = () => {
    if (filtroStatus === RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE) {
      setFiltroStatus(RH_SOLICITACAO_STATUS_CARROSSEL[0]!.key);
      return;
    }
    const idx = RH_SOLICITACAO_STATUS_CARROSSEL.findIndex((s) => s.key === filtroStatus);
    const next = RH_SOLICITACAO_STATUS_CARROSSEL[(idx + 1) % RH_SOLICITACAO_STATUS_CARROSSEL.length]!;
    setFiltroStatus(next.key);
  };

  const retrocederStatus = () => {
    if (filtroStatus === RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE) {
      setFiltroStatus(RH_SOLICITACAO_STATUS_CARROSSEL[RH_SOLICITACAO_STATUS_CARROSSEL.length - 1]!.key);
      return;
    }
    const idx = RH_SOLICITACAO_STATUS_CARROSSEL.findIndex((s) => s.key === filtroStatus);
    const prev =
      RH_SOLICITACAO_STATUS_CARROSSEL[(idx - 1 + RH_SOLICITACAO_STATUS_CARROSSEL.length) % RH_SOLICITACAO_STATUS_CARROSSEL.length]!;
    setFiltroStatus(prev.key);
  };

  const fetchLista = useCallback(async () => {
    setLoading(true);
    const tipos = RH_SOLICITACAO_ABA_TIPOS[aba];
    let q = supabase
      .from("rh_solicitacoes")
      .select(RH_SOLICITACOES_SELECT)
      .in("tipo", [...tipos])
      .order("created_at", { ascending: false })
      .limit(200);

    const statusValues = statusFiltroQueryValues(filtroStatus);
    if (statusValues) {
      q = statusValues.length === 1 ? q.eq("status", statusValues[0]!) : q.in("status", statusValues);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[RhSolicitacoes]", error);
      setLista([]);
    } else {
      setLista((data ?? []) as unknown as RhSolicitacaoRow[]);
    }
    setLoading(false);
  }, [filtroStatus, aba]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void fetchLista();
  }, [fetchLista, perm.loading, perm.canView]);

  useEffect(() => {
    setSort({
      col: aba === "reunioes" ? "dataReuniao" : "data",
      dir: "desc",
    });
  }, [aba]);

  const listaOrdenada = useMemo(() => {
    const rows = [...lista];
    const { col, dir } = sort;
    rows.sort((a, b) => {
      switch (col) {
        case "data":
          return (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) * (dir === "asc" ? 1 : -1);
        case "dataReuniao": {
          const da = a.reuniao_dia_iso ?? "";
          const db = b.reuniao_dia_iso ?? "";
          return (da < db ? -1 : da > db ? 1 : 0) * (dir === "asc" ? 1 : -1);
        }
        case "solicitante":
          return compareLocaleTexto(nomeSolicitante(a), nomeSolicitante(b), dir);
        case "time":
          return compareLocaleTexto(nomeTimeSolicitante(a), nomeTimeSolicitante(b), dir);
        case "tipo":
          return compareLocaleTexto(labelTipoSolicitacao(a.tipo), labelTipoSolicitacao(b.tipo), dir);
        case "status":
          return compareLocaleTexto(labelStatusSolicitacao(a.status), labelStatusSolicitacao(b.status), dir);
        case "descricao":
          return compareLocaleTexto(descricaoColunaSolicitacao(a.tipo, a), descricaoColunaSolicitacao(b.tipo, b), dir);
        case "lideranca":
          return compareLocaleTexto(a.lideranca_nome ?? "", b.lideranca_nome ?? "", dir);
        case "recomendacao":
          return compareLocaleTexto(
            labelFeedbackRecomendacao(a.feedback_recomendacao),
            labelFeedbackRecomendacao(b.feedback_recomendacao),
            dir,
          );
        case "origem":
          return compareLocaleTexto(labelFeedbackOrigem(a.feedback_origem), labelFeedbackOrigem(b.feedback_origem), dir);
        case "atendido":
          return compareLocaleTexto(nomeAtendente(a), nomeAtendente(b), dir);
        case "atendimento":
          return (
            ((a.atendido_em ?? "") < (b.atendido_em ?? "") ? -1 : (a.atendido_em ?? "") > (b.atendido_em ?? "") ? 1 : 0) *
            (dir === "asc" ? 1 : -1)
          );
        default:
          return 0;
      }
    });
    return rows;
  }, [lista, sort]);

  const exibirColunaStatus = todosStatusAtivo;
  const exibirColunasAtendimento =
    aba !== "feedback" && (filtroStatus === "aprovado" || filtroStatus === "rejeitado");

  function onSort(col: SortCol) {
    setSort((s) =>
      s.col === col
        ? { col, dir: s.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "data" || col === "dataReuniao" || col === "atendimento" ? "desc" : "asc" },
    );
  }

  const abaKeys = RH_SOLICITACAO_ABA_OPTIONS.map((o) => o.key);

  if (perm.loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ verticalAlign: "middle" }} />{" "}
        Carregando…
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  function renderAcoes(row: RhSolicitacaoRow) {
    if (!showAcoes) return <span style={{ color: t.textMuted }}>—</span>;
    const podeAtender = perm.canEditarOk && row.status === "em_analise" && !exibirColunasAtendimento;
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        <BtnIconeAcaoLinha label={tooltipAcao("Ver solicitação")} onClick={() => setModalVer(row)}>
          <Eye size={14} aria-hidden />
        </BtnIconeAcaoLinha>
        {podeAtender ? (
          <BtnIconeAcaoLinha label={tooltipAcao("Atender solicitação")} onClick={() => setModalAtender(row)}>
            <Pencil size={14} aria-hidden />
          </BtnIconeAcaoLinha>
        ) : null}
      </div>
    );
  }

  function renderTabelaFeedback() {
    return (
      <TabelaComPaginacao items={listaOrdenada} t={t} resetKey={`${aba}-${sort.col}-${sort.dir}-${filtroStatus}`}>
        {(linhas, zebraIdx) => (
      <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle({ minWidth: 860 })}>
          <caption style={{ display: "none" }}>Feedback</caption>
          <thead>
            <tr>
              <SortTableTh label="Data do Registro" col="data" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeaderSticky} align="center" />
              <SortTableTh label="Liderança" col="lideranca" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
              <SortTableTh label="Prestador" col="solicitante" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
              <SortTableTh label="Recomendação" col="recomendacao" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
              <SortTableTh label="Status" col="status" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
              <SortTableTh label="Origem" col="origem" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
              {showAcoes ? (
                <th scope="col" style={dataTable.thHeader}>
                  Ações
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {linhas.map((row, i) => (
              <tr
                key={row.id}
                style={{ background: dataTable.zebraRow(zebraIdx(i)) }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = dataTable.zebraRow(zebraIdx(i));
                }}
              >
                <td style={dataTable.tdSticky({ rowIndex: zebraIdx(i) })}>{fmtDataSolicitacao(row.created_at)}</td>
                <td style={dataTable.tdCenter}>{row.lideranca_nome?.trim() || "—"}</td>
                <td style={dataTable.tdCenter}>{nomeSolicitante(row)}</td>
                <td style={dataTable.tdCenter}>{labelFeedbackRecomendacao(row.feedback_recomendacao)}</td>
                <td style={dataTable.tdCenter}>
                  <div style={{ display: "flex", justifyContent: "center" }}>{badgeStatus(row.status)}</div>
                </td>
                <td style={dataTable.tdCenter}>{labelFeedbackOrigem(row.feedback_origem)}</td>
                {showAcoes ? <td style={dataTable.tdCenter}>{renderAcoes(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        )}
      </TabelaComPaginacao>
    );
  }

  function renderTabelaGenerica() {
    const isReunioes = aba === "reunioes";
    const isVagas = aba === "vagas";

    return (
      <TabelaComPaginacao items={listaOrdenada} t={t} resetKey={`${aba}-${sort.col}-${sort.dir}-${filtroStatus}`}>
        {(linhas, zebraIdx) => (
      <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle({ minWidth: 720 })}>
          <caption style={{ display: "none" }}>{RH_SOLICITACAO_ABA_OPTIONS.find((a) => a.key === aba)?.label}</caption>
          <thead>
            <tr>
              <SortTableTh
                label={isReunioes ? "Data Solicitada" : "Data da Solicitação"}
                col={isReunioes ? "dataReuniao" : "data"}
                sortCol={sort.col}
                sortDir={sort.dir}
                onSort={onSort}
                thStyle={dataTable.thHeaderSticky}
                align="center"
              />
              <SortTableTh label="Solicitante" col="solicitante" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
              {(isReunioes || isVagas) && (
                <SortTableTh label="Time" col="time" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
              )}
              {isReunioes ? (
                <SortTableTh label="Tipo de Reunião" col="tipo" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
              ) : null}
              {exibirColunasAtendimento ? (
                <>
                  <SortTableTh label="Atendido" col="atendido" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Data do Atendimento" col="atendimento" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                </>
              ) : (
                <SortTableTh
                  label={exibirColunaStatus || isReunioes || isVagas ? "Status" : "Descrição"}
                  col={exibirColunaStatus || isReunioes || isVagas ? "status" : "descricao"}
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={onSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
              )}
              {showAcoes ? (
                <th scope="col" style={dataTable.thHeader}>
                  Ações
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {linhas.map((row, i) => (
              <tr
                key={row.id}
                style={{ background: dataTable.zebraRow(zebraIdx(i)) }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = dataTable.zebraRow(zebraIdx(i));
                }}
              >
                <td style={dataTable.tdSticky({ rowIndex: zebraIdx(i) })}>
                  {isReunioes ? fmtDataCurta(row.reuniao_dia_iso) : fmtDataSolicitacao(row.created_at)}
                </td>
                <td style={dataTable.tdCenter} title={nomeSolicitante(row)}>
                  <span
                    style={{
                      display: "inline-block",
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {nomeSolicitante(row)}
                  </span>
                </td>
                {(isReunioes || isVagas) && <td style={dataTable.tdCenter}>{nomeTimeSolicitante(row)}</td>}
                {isReunioes ? <td style={dataTable.tdCenter}>{labelTipoSolicitacao(row.tipo)}</td> : null}
                {exibirColunasAtendimento ? (
                  <>
                    <td style={dataTable.tdCenter}>{nomeAtendente(row)}</td>
                    <td style={dataTable.tdCenter}>{row.atendido_em ? fmtDataSolicitacao(row.atendido_em) : "—"}</td>
                  </>
                ) : (
                  <td style={dataTable.tdCenter}>
                    {exibirColunaStatus || isReunioes || isVagas ? (
                      <div style={{ display: "flex", justifyContent: "center" }}>{badgeStatus(row.status)}</div>
                    ) : (
                      <span title={descricaoColunaSolicitacao(row.tipo, row)}>
                        {descricaoColunaSolicitacao(row.tipo, row)}
                      </span>
                    )}
                  </td>
                )}
                {showAcoes ? <td style={dataTable.tdCenter}>{renderAcoes(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        )}
      </TabelaComPaginacao>
    );
  }

  const ctaLabel =
    aba === "reunioes" ? "Agendar Reunião" : aba === "vagas" ? "Solicitar Vaga" : aba === "feedback" ? "Registrar Feedback" : null;

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="rh_solicitacoes" />}
        title={getPageMenuLabel("rh_solicitacoes")}
        subtitle="Acompanhe e atenda solicitações de prestadores."
      />

      <div style={getFilterBarWrapperStyle(brand, t)}>
        <div className="app-marketplace-filtro-minhas">
          <span className="app-marketplace-filtro-minhas__spacer" aria-hidden="true" />
          <div className="app-marketplace-filtro-minhas__centro" role="group" aria-label="Status da solicitação">
            <button type="button" aria-label="Status anterior" onClick={retrocederStatus} style={getCarouselBtnNavStyle(t, false)}>
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={getCarouselPeriodLabelStyle(t, { minWidth: 160 })}>{labelStatusCentral}</span>
            <button type="button" aria-label="Próximo status" onClick={avancarStatus} style={getCarouselBtnNavStyle(t, false)}>
              <ChevronRight size={14} aria-hidden="true" />
            </button>

            <FiltroBarPillButton
              active={todosStatusAtivo}
              onClick={() =>
                setFiltroStatus(
                  todosStatusAtivo
                    ? RH_SOLICITACAO_STATUS_DEFAULT
                    : RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE,
                )
              }
              icon={FilterBarIcons.status}
              aria-label={
                todosStatusAtivo
                  ? "Desativar todos os status — voltar a Em análise"
                  : "Ver todos os status"
              }
            >
              {RH_SOLICITACAO_TODOS_STATUS_LABEL}
            </FiltroBarPillButton>

            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
                <Loader2 size={12} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
                Carregando…
              </span>
            ) : null}
          </div>

          <div className="app-marketplace-filtro-minhas__cta">
            <AjudaContextualAcoes
              pageKey="rh_solicitacoes"
              tutorial={tutorialCtxPorAba(aba)}
            />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Tipo de solicitação"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${t.cardBorder}`,
          }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, abaKeys, setAba, (k) => `tab-sol-${k}`)}
        >
          <FiltroBarTabButton
            id="tab-sol-atestados"
            active={aba === "atestados"}
            aria-controls="panel-sol-atestados"
            onClick={() => setAba("atestados")}
            icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Atestados
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-sol-reunioes"
            active={aba === "reunioes"}
            aria-controls="panel-sol-reunioes"
            onClick={() => setAba("reunioes")}
            icon={<Users {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Reuniões
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-sol-vagas"
            active={aba === "vagas"}
            aria-controls="panel-sol-vagas"
            onClick={() => setAba("vagas")}
            icon={<Briefcase {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Vagas
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-sol-feedback"
            active={aba === "feedback"}
            aria-controls="panel-sol-feedback"
            onClick={() => setAba("feedback")}
            icon={<MessageSquare {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Feedback
          </FiltroBarTabButton>
        </div>
      </div>

      <div style={pageBox} id={`panel-sol-${aba}`} role="tabpanel" aria-labelledby={`tab-sol-${aba}`}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <SectionTitle sub={subAbaSolicitacao(aba)}>
            {RH_SOLICITACAO_ABA_OPTIONS.find((a) => a.key === aba)?.label ?? "Solicitações"}
          </SectionTitle>
          {showCta && ctaLabel ? (
            <CtaCriarButton
              type="button"
              onClick={() => {
                if (aba === "reunioes") setModalAgendar(true);
                else if (aba === "vagas") setModalVaga(true);
                else if (aba === "feedback") setModalFeedback(true);
              }}
            >
              {ctaLabel}
            </CtaCriarButton>
          ) : null}
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 13 }}>Carregando…</div>
          </div>
        ) : listaOrdenada.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhuma solicitação encontrada.
          </div>
        ) : aba === "feedback" ? (
          renderTabelaFeedback()
        ) : (
          renderTabelaGenerica()
        )}
      </div>

      <ModalVerSolicitacao open={!!modalVer} onClose={() => setModalVer(null)} row={modalVer} t={t} />
      <ModalAtenderSolicitacao
        open={!!modalAtender}
        onClose={() => setModalAtender(null)}
        row={modalAtender}
        t={t}
        brand={brand}
        onSaved={() => void fetchLista()}
      />
      <ModalAgendarReuniaoSolicitacoes
        open={modalAgendar}
        onClose={() => setModalAgendar(false)}
        onSaved={() => void fetchLista()}
        t={t}
        brand={brand}
      />
      <ModalRegistrarFeedback
        open={modalFeedback}
        onClose={() => setModalFeedback(false)}
        onSaved={() => void fetchLista()}
        t={t}
        brand={brand}
      />
      <ModalSolicitarVaga
        open={modalVaga}
        onClose={() => setModalVaga(false)}
        onSaved={() => void fetchLista()}
        t={t}
        brand={brand}
      />
    </div>
  );
}
