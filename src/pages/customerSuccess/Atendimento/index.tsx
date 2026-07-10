import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Globe, Instagram, Loader2, Mail, Pencil } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import {
  FiltroBarPillButton,
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  SortTableTh,
  onFiltroBarTabsKeyDown,
  type SortDir,
} from "../../../components/dashboard";
import { FiltroBarCampoSelect } from "../../../components/FiltroBarCampoSelect";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import {
  CS_ATENDIMENTO_ABA_EMAIL_LABEL,
  CS_ATENDIMENTO_ABA_INSTAGRAM,
  CS_ATENDIMENTO_ABA_INSTAGRAM_LABEL,
  CS_ATENDIMENTO_ABA_SITE_SPIN_LABEL,
  CS_ATENDIMENTO_FILTRO_NENHUM_LABEL,
  CS_ATENDIMENTO_FILTRO_NENHUM_VALUE,
  CS_ATENDIMENTO_FILTRO_TODOS_LABEL,
  CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE,
  CS_ATENDIMENTO_FILTRO_TODOS_VALUE,
  CS_ATENDIMENTO_INSTAGRAM_TAB_COLOR,
  CS_ATENDIMENTO_ORIGEM_EMAIL,
  CS_ATENDIMENTO_ORIGEM_INSTAGRAM_COMENTARIO,
  CS_ATENDIMENTO_ORIGEM_INSTAGRAM_DM,
  CS_ATENDIMENTO_ORIGEM_SITE_SPIN,
  CS_ATENDIMENTO_STATUS_CARROSSEL,
  CS_ATENDIMENTO_STATUS_CORES,
  CS_ATENDIMENTO_STATUS_DEFAULT,
  CS_ATENDIMENTO_TODOS_STATUS_LABEL,
  fmtDataChamado,
  fmtSlaChamado,
  labelStatusChamado,
} from "../../../lib/csAtendimentoConstants";
import { carregarAtendentesCustomerService, mapCsChamadoFromDb, unwrapCsEmbed, type CsChamadoRowDb } from "../../../lib/csAtendimentoHelpers";
import {
  COL_LABEL_EMAIL,
  COL_LABEL_SITE_SPIN,
  assuntoEmail,
  getColunasEmail,
  getColunasSiteSpin,
  solicitanteEmail,
  type ColunaEmail,
  type ColunaSiteSpin,
  type SortColEmail,
  type SortColSiteSpin,
} from "../../../lib/csAtendimentoTableColumns";
import type {
  CsAtendenteFiltroOption,
  CsAtendimentoAbaOrigem,
  CsChamadoFiltroAtendente,
  CsChamadoFiltroStatus,
  CsChamadoHistoricoRow,
  CsChamadoRow,
} from "../../../types/csAtendimento";
import { ModalAtenderChamado, ModalVerChamado } from "./ModalsVerAtender";
import { CsAtendimentoInstagramPainel } from "./CsAtendimentoInstagramPainel";

const CS_CHAMADOS_SELECT = `
  id,
  protocolo,
  origem,
  status,
  nome_completo,
  telefone,
  email,
  atuacao,
  empresa,
  mensagem,
  assunto,
  instagram_username,
  instagram_post_caption,
  instagram_post_tipo,
  primeira_resposta_em,
  ultima_mensagem_usuario_em,
  inicio_atendimento_em,
  arquivado_em,
  atendente_id,
  created_at,
  updated_at,
  atendente:profiles!cs_chamados_atendente_id_fkey ( id, name ),
  cs_chamado_anexos ( id, nome, storage_path, content_type )
`.trim();

const ABAS_ORIGEM: CsAtendimentoAbaOrigem[] = [
  CS_ATENDIMENTO_ORIGEM_SITE_SPIN,
  CS_ATENDIMENTO_ORIGEM_EMAIL,
  CS_ATENDIMENTO_ABA_INSTAGRAM,
];

function tabIdAbaOrigem(aba: CsAtendimentoAbaOrigem): string {
  if (aba === CS_ATENDIMENTO_ORIGEM_EMAIL) return "tab-cs-email";
  if (aba === CS_ATENDIMENTO_ABA_INSTAGRAM) return "tab-cs-instagram";
  return "tab-cs-site-spin";
}

function nomeAtendente(row: CsChamadoRow): string {
  return unwrapCsEmbed(row.atendente)?.name?.trim() || "—";
}

function badgeStatus(status: CsChamadoRow["status"]) {
  const cor = CS_ATENDIMENTO_STATUS_CORES[status];
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
      {labelStatusChamado(status)}
    </span>
  );
}

function celulaTextoEllipsis(valor: string, maxWidth = 160) {
  return (
    <span
      style={{
        display: "inline-block",
        maxWidth,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={valor !== "—" ? valor : undefined}
    >
      {valor}
    </span>
  );
}

export default function CsAtendimentoPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("cs_atendimento");
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const [abaOrigem, setAbaOrigem] = useState<CsAtendimentoAbaOrigem>(CS_ATENDIMENTO_ORIGEM_SITE_SPIN);
  const [filtroStatus, setFiltroStatus] = useState<CsChamadoFiltroStatus>(CS_ATENDIMENTO_STATUS_DEFAULT);
  const [filtroAtendente, setFiltroAtendente] = useState<CsChamadoFiltroAtendente>(CS_ATENDIMENTO_FILTRO_TODOS_VALUE);
  const [atendentes, setAtendentes] = useState<CsAtendenteFiltroOption[]>([]);
  const [lista, setLista] = useState<CsChamadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortSite, setSortSite] = useState<{ col: SortColSiteSpin; dir: SortDir }>({ col: "data", dir: "desc" });
  const [sortEmail, setSortEmail] = useState<{ col: SortColEmail; dir: SortDir }>({ col: "data", dir: "desc" });
  const [modalVer, setModalVer] = useState<CsChamadoRow | null>(null);
  const [modalAtender, setModalAtender] = useState<CsChamadoRow | null>(null);
  const [historico, setHistorico] = useState<CsChamadoHistoricoRow[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const isAbaEmail = abaOrigem === CS_ATENDIMENTO_ORIGEM_EMAIL;
  const isAbaInstagram = abaOrigem === CS_ATENDIMENTO_ABA_INSTAGRAM;
  const todosStatusAtivo = filtroStatus === CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE;

  const labelStatusCentral = todosStatusAtivo
    ? CS_ATENDIMENTO_TODOS_STATUS_LABEL
    : CS_ATENDIMENTO_STATUS_CARROSSEL.find((s) => s.key === filtroStatus)?.label ?? CS_ATENDIMENTO_TODOS_STATUS_LABEL;

  const opcoesStaffPrestadores = useMemo(
    () => atendentes.map((a) => ({ value: a.profileId, label: a.nome })),
    [atendentes],
  );

  const colunasSite = useMemo(() => getColunasSiteSpin(filtroStatus), [filtroStatus]);
  const colunasEmail = useMemo(() => getColunasEmail(filtroStatus), [filtroStatus]);

  const avancarStatus = () => {
    if (filtroStatus === CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE) {
      setFiltroStatus(CS_ATENDIMENTO_STATUS_CARROSSEL[0]!.key);
      return;
    }
    const idx = CS_ATENDIMENTO_STATUS_CARROSSEL.findIndex((s) => s.key === filtroStatus);
    const next = CS_ATENDIMENTO_STATUS_CARROSSEL[(idx + 1) % CS_ATENDIMENTO_STATUS_CARROSSEL.length]!;
    setFiltroStatus(next.key);
  };

  const retrocederStatus = () => {
    if (filtroStatus === CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE) {
      setFiltroStatus(CS_ATENDIMENTO_STATUS_CARROSSEL[CS_ATENDIMENTO_STATUS_CARROSSEL.length - 1]!.key);
      return;
    }
    const idx = CS_ATENDIMENTO_STATUS_CARROSSEL.findIndex((s) => s.key === filtroStatus);
    const prev =
      CS_ATENDIMENTO_STATUS_CARROSSEL[(idx - 1 + CS_ATENDIMENTO_STATUS_CARROSSEL.length) % CS_ATENDIMENTO_STATUS_CARROSSEL.length]!;
    setFiltroStatus(prev.key);
  };

  const fetchLista = useCallback(async () => {
    setLoading(true);

    let q = supabase.from("cs_chamados").select(CS_CHAMADOS_SELECT).order("created_at", { ascending: false });

    if (abaOrigem === CS_ATENDIMENTO_ABA_INSTAGRAM) {
      q = q.in("origem", [CS_ATENDIMENTO_ORIGEM_INSTAGRAM_DM, CS_ATENDIMENTO_ORIGEM_INSTAGRAM_COMENTARIO]);
    } else {
      q = q.eq("origem", abaOrigem);
    }

    if (filtroStatus !== CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE) {
      q = q.eq("status", filtroStatus);
    }
    if (filtroAtendente === CS_ATENDIMENTO_FILTRO_NENHUM_VALUE) {
      q = q.is("atendente_id", null);
    } else if (filtroAtendente !== CS_ATENDIMENTO_FILTRO_TODOS_VALUE) {
      q = q.eq("atendente_id", filtroAtendente);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[CsAtendimento]", error);
      setLista([]);
    } else {
      setLista(((data ?? []) as unknown as CsChamadoRowDb[]).map(mapCsChamadoFromDb));
    }
    setLoading(false);
  }, [abaOrigem, filtroStatus, filtroAtendente]);

  const carregarHistorico = useCallback(async (chamadoId: string) => {
    setLoadingHistorico(true);
    const { data, error } = await supabase
      .from("cs_chamado_historico")
      .select("*")
      .eq("chamado_id", chamadoId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[CsAtendimento] historico", error);
      setHistorico([]);
    } else {
      setHistorico((data ?? []) as CsChamadoHistoricoRow[]);
    }
    setLoadingHistorico(false);
  }, []);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregarAtendentesCustomerService().then(setAtendentes);
  }, [perm.loading, perm.canView]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void fetchLista();
  }, [fetchLista, perm.loading, perm.canView]);

  useEffect(() => {
    const alvo = modalVer ?? modalAtender;
    if (!alvo) {
      setHistorico([]);
      return;
    }
    void carregarHistorico(alvo.id);
  }, [modalVer, modalAtender, carregarHistorico]);

  const listaOrdenadaSite = useMemo(() => {
    const rows = [...lista];
    const { col, dir } = sortSite;
    rows.sort((a, b) => {
      switch (col) {
        case "chamado":
          return compareLocaleTexto(a.protocolo, b.protocolo, dir);
        case "data":
          return (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) * (dir === "asc" ? 1 : -1);
        case "solicitante":
          return compareLocaleTexto(a.nome_completo, b.nome_completo, dir);
        case "inicio":
          return (
            ((a.inicio_atendimento_em ?? "") < (b.inicio_atendimento_em ?? "") ? -1 : (a.inicio_atendimento_em ?? "") > (b.inicio_atendimento_em ?? "") ? 1 : 0) *
            (dir === "asc" ? 1 : -1)
          );
        case "atendente":
          return compareLocaleTexto(nomeAtendente(a), nomeAtendente(b), dir);
        case "sla":
          return compareLocaleTexto(fmtSlaChamado(a.created_at, a.arquivado_em), fmtSlaChamado(b.created_at, b.arquivado_em), dir);
        case "status":
          return compareLocaleTexto(labelStatusChamado(a.status), labelStatusChamado(b.status), dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [lista, sortSite]);

  const listaOrdenadaEmail = useMemo(() => {
    const rows = [...lista];
    const { col, dir } = sortEmail;
    rows.sort((a, b) => {
      switch (col) {
        case "chamado":
          return compareLocaleTexto(a.protocolo, b.protocolo, dir);
        case "data":
          return (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) * (dir === "asc" ? 1 : -1);
        case "solicitante":
          return compareLocaleTexto(solicitanteEmail(a), solicitanteEmail(b), dir);
        case "assunto":
          return compareLocaleTexto(assuntoEmail(a), assuntoEmail(b), dir);
        case "inicio":
          return (
            ((a.inicio_atendimento_em ?? "") < (b.inicio_atendimento_em ?? "") ? -1 : (a.inicio_atendimento_em ?? "") > (b.inicio_atendimento_em ?? "") ? 1 : 0) *
            (dir === "asc" ? 1 : -1)
          );
        case "atendente":
          return compareLocaleTexto(nomeAtendente(a), nomeAtendente(b), dir);
        case "sla":
          return compareLocaleTexto(fmtSlaChamado(a.created_at, a.arquivado_em), fmtSlaChamado(b.created_at, b.arquivado_em), dir);
        case "status":
          return compareLocaleTexto(labelStatusChamado(a.status), labelStatusChamado(b.status), dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [lista, sortEmail]);

  const listaInstagramDm = useMemo(
    () => lista.filter((r) => r.origem === CS_ATENDIMENTO_ORIGEM_INSTAGRAM_DM),
    [lista],
  );
  const listaInstagramComentario = useMemo(
    () => lista.filter((r) => r.origem === CS_ATENDIMENTO_ORIGEM_INSTAGRAM_COMENTARIO),
    [lista],
  );

  function onSortSite(col: SortColSiteSpin) {
    setSortSite((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "data" ? "desc" : "asc" }));
  }

  function onSortEmail(col: SortColEmail) {
    setSortEmail((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "data" ? "desc" : "asc" }));
  }

  useEffect(() => {
    if (!isAbaEmail && !colunasSite.includes(sortSite.col)) {
      setSortSite({ col: "data", dir: "desc" });
    }
  }, [colunasSite, sortSite.col, isAbaEmail]);

  useEffect(() => {
    if (isAbaEmail && !colunasEmail.includes(sortEmail.col)) {
      setSortEmail({ col: "data", dir: "desc" });
    }
  }, [colunasEmail, sortEmail.col, isAbaEmail]);

  function renderAcoes(row: CsChamadoRow) {
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        <BtnIconeAcaoLinha label={tooltipAcao("Ver Chamado")} onClick={() => setModalVer(row)}>
          <Eye size={14} aria-hidden />
        </BtnIconeAcaoLinha>
        {row.status !== "arquivado" && perm.canEditarOk ? (
          <BtnIconeAcaoLinha label={tooltipAcao("Atender Chamado")} onClick={() => setModalAtender(row)}>
            <Pencil size={14} aria-hidden />
          </BtnIconeAcaoLinha>
        ) : null}
      </div>
    );
  }

  function renderLinhaSite(row: CsChamadoRow, i: number, colunas: ColunaSiteSpin[]) {
    return (
      <tr
        key={row.id}
        style={{ background: dataTable.zebraRow(i) }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = dataTable.zebraRow(i);
        }}
      >
        {colunas.map((col) => {
          if (col === "chamado") {
            return (
              <td key={col} style={dataTable.tdSticky({ rowIndex: i })}>
                <strong>{row.protocolo}</strong>
              </td>
            );
          }
          if (col === "data") {
            return <td key={col} style={dataTable.tdCenter}>{fmtDataChamado(row.created_at)}</td>;
          }
          if (col === "solicitante") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                {celulaTextoEllipsis(row.nome_completo)}
              </td>
            );
          }
          if (col === "inicio") {
            return <td key={col} style={dataTable.tdCenter}>{fmtDataChamado(row.inicio_atendimento_em)}</td>;
          }
          if (col === "atendente") {
            return <td key={col} style={dataTable.tdCenter}>{celulaTextoEllipsis(nomeAtendente(row))}</td>;
          }
          if (col === "sla") {
            return <td key={col} style={dataTable.tdCenter}>{fmtSlaChamado(row.created_at, row.arquivado_em)}</td>;
          }
          if (col === "status") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                <div style={{ display: "flex", justifyContent: "center" }}>{badgeStatus(row.status)}</div>
              </td>
            );
          }
          return (
            <td key={col} style={dataTable.tdCenter}>
              {renderAcoes(row)}
            </td>
          );
        })}
      </tr>
    );
  }

  function renderLinhaEmail(row: CsChamadoRow, i: number, colunas: ColunaEmail[]) {
    return (
      <tr
        key={row.id}
        style={{ background: dataTable.zebraRow(i) }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = dataTable.zebraRow(i);
        }}
      >
        {colunas.map((col) => {
          if (col === "chamado") {
            return (
              <td key={col} style={dataTable.tdSticky({ rowIndex: i })}>
                <strong>{row.protocolo}</strong>
              </td>
            );
          }
          if (col === "data") {
            return <td key={col} style={dataTable.tdCenter}>{fmtDataChamado(row.created_at)}</td>;
          }
          if (col === "solicitante") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                {celulaTextoEllipsis(solicitanteEmail(row), 200)}
              </td>
            );
          }
          if (col === "assunto") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                {celulaTextoEllipsis(assuntoEmail(row), 220)}
              </td>
            );
          }
          if (col === "inicio") {
            return <td key={col} style={dataTable.tdCenter}>{fmtDataChamado(row.inicio_atendimento_em)}</td>;
          }
          if (col === "atendente") {
            return <td key={col} style={dataTable.tdCenter}>{celulaTextoEllipsis(nomeAtendente(row))}</td>;
          }
          if (col === "sla") {
            return <td key={col} style={dataTable.tdCenter}>{fmtSlaChamado(row.created_at, row.arquivado_em)}</td>;
          }
          if (col === "status") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                <div style={{ display: "flex", justifyContent: "center" }}>{badgeStatus(row.status)}</div>
              </td>
            );
          }
          return (
            <td key={col} style={dataTable.tdCenter}>
              {renderAcoes(row)}
            </td>
          );
        })}
      </tr>
    );
  }

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

  const listaOrdenada = isAbaEmail ? listaOrdenadaEmail : listaOrdenadaSite;
  const colunasAtivas = isAbaEmail ? colunasEmail : colunasSite;
  const panelId = isAbaEmail ? "panel-cs-email" : "panel-cs-site-spin";
  const tabId = isAbaEmail ? "tab-cs-email" : "tab-cs-site-spin";

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="cs_atendimento" />}
        title={getPageMenuLabel("cs_atendimento")}
        subtitle="Gerencie os chamados para CS, acompanhe SLA e veja os atendimentos da equipe."
      />

      <div style={getFilterBarWrapperStyle(brand, t)}>
        <div className="app-marketplace-filtro-minhas">
          <span className="app-marketplace-filtro-minhas__spacer" aria-hidden="true" />
          <div className="app-marketplace-filtro-minhas__centro" role="group" aria-label="Status do chamado">
            <button type="button" aria-label="Status anterior" onClick={retrocederStatus} style={getCarouselBtnNavStyle(t, false)}>
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={getCarouselPeriodLabelStyle(t, { minWidth: 160 })}>{labelStatusCentral}</span>
            <button type="button" aria-label="Próximo status" onClick={avancarStatus} style={getCarouselBtnNavStyle(t, false)}>
              <ChevronRight size={14} aria-hidden="true" />
            </button>

            <FiltroBarPillButton
              active={todosStatusAtivo}
              onClick={() => setFiltroStatus(CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE)}
              icon={FilterBarIcons.status}
              aria-label={todosStatusAtivo ? "Exibindo todos os status" : "Ver todos os status"}
            >
              {CS_ATENDIMENTO_TODOS_STATUS_LABEL}
            </FiltroBarPillButton>

            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
                <Loader2 size={12} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
                Carregando…
              </span>
            ) : null}
          </div>

          <div className="app-marketplace-filtro-minhas__cta">
            <FiltroBarCampoSelect
              id="filtro-staff-cs"
              value={filtroAtendente}
              onChange={(v) => setFiltroAtendente(v as CsChamadoFiltroAtendente)}
              options={opcoesStaffPrestadores}
              extraOptions={[{ value: CS_ATENDIMENTO_FILTRO_NENHUM_VALUE, label: CS_ATENDIMENTO_FILTRO_NENHUM_LABEL }]}
              icon={FilterBarIcons.staff}
              ariaLabel="Staff"
              todasValue={CS_ATENDIMENTO_FILTRO_TODOS_VALUE}
              todasLabel={CS_ATENDIMENTO_FILTRO_TODOS_LABEL}
              minWidth={220}
            />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Origem do atendimento"
          style={{ ...getFilterBarRowStyle(), justifyContent: "center", width: "100%", marginTop: 10 }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS_ORIGEM, setAbaOrigem, tabIdAbaOrigem)}
        >
          <FiltroBarTabButton
            id="tab-cs-site-spin"
            active={abaOrigem === CS_ATENDIMENTO_ORIGEM_SITE_SPIN}
            aria-controls="panel-cs-site-spin"
            onClick={() => setAbaOrigem(CS_ATENDIMENTO_ORIGEM_SITE_SPIN)}
            icon={<Globe {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {CS_ATENDIMENTO_ABA_SITE_SPIN_LABEL}
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-cs-email"
            active={abaOrigem === CS_ATENDIMENTO_ORIGEM_EMAIL}
            aria-controls="panel-cs-email"
            onClick={() => setAbaOrigem(CS_ATENDIMENTO_ORIGEM_EMAIL)}
            icon={<Mail {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {CS_ATENDIMENTO_ABA_EMAIL_LABEL}
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-cs-instagram"
            active={abaOrigem === CS_ATENDIMENTO_ABA_INSTAGRAM}
            aria-controls="panel-cs-instagram"
            onClick={() => setAbaOrigem(CS_ATENDIMENTO_ABA_INSTAGRAM)}
            icon={<Instagram {...FILTRO_BAR_TAB_ICON_PROPS} />}
            activeColor={CS_ATENDIMENTO_INSTAGRAM_TAB_COLOR}
          >
            {CS_ATENDIMENTO_ABA_INSTAGRAM_LABEL}
          </FiltroBarTabButton>
        </div>
      </div>

      {isAbaInstagram ? (
        <CsAtendimentoInstagramPainel
          listaDm={listaInstagramDm}
          listaComentario={listaInstagramComentario}
          loading={loading}
          filtroStatus={filtroStatus}
          t={t}
          dataTable={dataTable}
          pageBox={pageBox}
          perm={perm}
          onVer={setModalVer}
          onAtender={setModalAtender}
        />
      ) : (
        <div style={pageBox} id={panelId} role="tabpanel" aria-labelledby={tabId}>
          <SectionTitle>Atendimentos</SectionTitle>

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
              <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 13 }}>Carregando…</div>
            </div>
          ) : listaOrdenada.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Nenhum chamado encontrado.
            </div>
          ) : (
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: isAbaEmail ? 960 : 720 })}>
                <caption style={{ display: "none" }}>
                  {isAbaEmail ? "Lista de chamados de atendimento por e-mail" : "Lista de chamados de atendimento do site"}
                </caption>
                <thead>
                  <tr>
                    {colunasAtivas.map((col) =>
                      col === "acoes" ? (
                        <th key={col} scope="col" style={dataTable.thHeader}>
                          {isAbaEmail ? COL_LABEL_EMAIL.acoes : COL_LABEL_SITE_SPIN.acoes}
                        </th>
                      ) : isAbaEmail ? (
                        <SortTableTh
                          key={col}
                          label={COL_LABEL_EMAIL[col as ColunaEmail]}
                          col={col}
                          sortCol={sortEmail.col}
                          sortDir={sortEmail.dir}
                          onSort={(c) => onSortEmail(c as SortColEmail)}
                          thStyle={col === "chamado" ? dataTable.thHeaderSticky : dataTable.thHeader}
                          align="center"
                        />
                      ) : (
                        <SortTableTh
                          key={col}
                          label={COL_LABEL_SITE_SPIN[col as ColunaSiteSpin]}
                          col={col}
                          sortCol={sortSite.col}
                          sortDir={sortSite.dir}
                          onSort={(c) => onSortSite(c as SortColSiteSpin)}
                          thStyle={col === "chamado" ? dataTable.thHeaderSticky : dataTable.thHeader}
                          align="center"
                        />
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isAbaEmail
                    ? listaOrdenada.map((row, i) => renderLinhaEmail(row, i, colunasEmail))
                    : listaOrdenada.map((row, i) => renderLinhaSite(row, i, colunasSite))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ModalVerChamado
        open={!!modalVer}
        onClose={() => setModalVer(null)}
        row={modalVer}
        historico={historico}
        loadingHistorico={loadingHistorico}
        t={t}
      />
      <ModalAtenderChamado
        open={!!modalAtender}
        onClose={() => setModalAtender(null)}
        row={modalAtender}
        historico={historico}
        loadingHistorico={loadingHistorico}
        t={t}
        brand={brand}
        onSaved={() => void fetchLista()}
      />
    </div>
  );
}
