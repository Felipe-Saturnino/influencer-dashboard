import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Globe, Loader2, Pencil } from "lucide-react";
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
import { FiltroBarPillButton, FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, SortTableTh, type SortDir } from "../../../components/dashboard";
import { FiltroBarCampoSelect } from "../../../components/FiltroBarCampoSelect";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import {
  CS_ATENDIMENTO_FILTRO_NENHUM_LABEL,
  CS_ATENDIMENTO_FILTRO_NENHUM_VALUE,
  CS_ATENDIMENTO_FILTRO_TODOS_LABEL,
  CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE,
  CS_ATENDIMENTO_FILTRO_TODOS_VALUE,
  CS_ATENDIMENTO_ABA_SITE_SPIN_LABEL,
  CS_ATENDIMENTO_ORIGEM_SITE_SPIN,
  CS_ATENDIMENTO_STATUS_CARROSSEL,
  CS_ATENDIMENTO_STATUS_CORES,
  CS_ATENDIMENTO_STATUS_DEFAULT,
  CS_ATENDIMENTO_TODOS_STATUS_LABEL,
  fmtDataChamado,
  fmtSlaChamado,
  labelStatusChamado,
} from "../../../lib/csAtendimentoConstants";
import { carregarAtendentesCustomerService, unwrapCsEmbed } from "../../../lib/csAtendimentoHelpers";
import type {
  CsAtendenteFiltroOption,
  CsChamadoFiltroAtendente,
  CsChamadoFiltroStatus,
  CsChamadoHistoricoRow,
  CsChamadoRow,
} from "../../../types/csAtendimento";
import { ModalAtenderChamado, ModalVerChamado } from "./ModalsVerAtender";

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
  inicio_atendimento_em,
  arquivado_em,
  atendente_id,
  created_at,
  updated_at,
  atendente:profiles!cs_chamados_atendente_id_fkey ( id, name )
`.trim();

type SortCol = "chamado" | "data" | "solicitante" | "inicio" | "atendente" | "sla" | "status";
type ColunaTabela = SortCol | "acoes";

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

function getColunas(filtroStatus: CsChamadoFiltroStatus): ColunaTabela[] {
  if (filtroStatus === CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE) {
    return ["chamado", "data", "solicitante", "inicio", "atendente", "sla", "status", "acoes"];
  }
  if (filtroStatus === "aberto") {
    return ["chamado", "data", "solicitante", "acoes"];
  }
  if (filtroStatus === "em_andamento") {
    return ["chamado", "data", "solicitante", "inicio", "atendente", "acoes"];
  }
  return ["chamado", "data", "solicitante", "atendente", "sla", "acoes"];
}

const COL_LABEL: Record<ColunaTabela, string> = {
  chamado: "Chamado",
  data: "Data de Abertura",
  solicitante: "Solicitante",
  inicio: "Início do Atendimento",
  atendente: "Atendente",
  sla: "SLA",
  status: "Status",
  acoes: "Ações",
};

export default function CsAtendimentoPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("cs_atendimento");
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const [filtroStatus, setFiltroStatus] = useState<CsChamadoFiltroStatus>(CS_ATENDIMENTO_STATUS_DEFAULT);
  const [filtroAtendente, setFiltroAtendente] = useState<CsChamadoFiltroAtendente>(CS_ATENDIMENTO_FILTRO_TODOS_VALUE);
  const [atendentes, setAtendentes] = useState<CsAtendenteFiltroOption[]>([]);
  const [lista, setLista] = useState<CsChamadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "data", dir: "desc" });
  const [modalVer, setModalVer] = useState<CsChamadoRow | null>(null);
  const [modalAtender, setModalAtender] = useState<CsChamadoRow | null>(null);
  const [historico, setHistorico] = useState<CsChamadoHistoricoRow[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const todosStatusAtivo = filtroStatus === CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE;

  const labelStatusCentral = todosStatusAtivo
    ? CS_ATENDIMENTO_TODOS_STATUS_LABEL
    : CS_ATENDIMENTO_STATUS_CARROSSEL.find((s) => s.key === filtroStatus)?.label ?? CS_ATENDIMENTO_TODOS_STATUS_LABEL;

  const opcoesAtendente = useMemo(
    () => [
      { value: CS_ATENDIMENTO_FILTRO_TODOS_VALUE, label: CS_ATENDIMENTO_FILTRO_TODOS_LABEL },
      { value: CS_ATENDIMENTO_FILTRO_NENHUM_VALUE, label: CS_ATENDIMENTO_FILTRO_NENHUM_LABEL },
      ...atendentes.map((a) => ({ value: a.profileId, label: a.nome })),
    ],
    [atendentes],
  );

  const colunas = useMemo(() => getColunas(filtroStatus), [filtroStatus]);

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
    let q = supabase
      .from("cs_chamados")
      .select(CS_CHAMADOS_SELECT)
      .eq("origem", CS_ATENDIMENTO_ORIGEM_SITE_SPIN)
      .order("created_at", { ascending: false });

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
      setLista((data ?? []) as unknown as CsChamadoRow[]);
    }
    setLoading(false);
  }, [filtroStatus, filtroAtendente]);

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

  const listaOrdenada = useMemo(() => {
    const rows = [...lista];
    const { col, dir } = sort;
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
  }, [lista, sort]);

  function onSort(col: SortCol) {
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "data" ? "desc" : "asc" }));
  }

  useEffect(() => {
    if (!colunas.includes(sort.col)) {
      setSort({ col: "data", dir: "desc" });
    }
  }, [colunas, sort.col]);

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
              options={opcoesAtendente}
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
        >
          <FiltroBarTabButton
            id="tab-cs-site-spin"
            active
            aria-controls="panel-cs-atendimentos"
            onClick={() => {}}
            icon={<Globe {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {CS_ATENDIMENTO_ABA_SITE_SPIN_LABEL}
          </FiltroBarTabButton>
        </div>
      </div>

      <div style={pageBox} id="panel-cs-atendimentos" role="tabpanel" aria-labelledby="tab-cs-site-spin">
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
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Lista de chamados de atendimento</caption>
              <thead>
                <tr>
                  {colunas.map((col) =>
                    col === "acoes" ? (
                      <th key={col} scope="col" style={dataTable.thHeader}>
                        {COL_LABEL[col]}
                      </th>
                    ) : (
                      <SortTableTh
                        key={col}
                        label={COL_LABEL[col]}
                        col={col}
                        sortCol={sort.col}
                        sortDir={sort.dir}
                        onSort={onSort}
                        thStyle={col === "chamado" ? dataTable.thHeaderSticky : dataTable.thHeader}
                        align="center"
                      />
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {listaOrdenada.map((row, i) => (
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
                          <td key={col} style={dataTable.tdCenter} title={row.nome_completo}>
                            <span
                              style={{
                                display: "inline-block",
                                maxWidth: 160,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.nome_completo}
                            </span>
                          </td>
                        );
                      }
                      if (col === "inicio") {
                        return <td key={col} style={dataTable.tdCenter}>{fmtDataChamado(row.inicio_atendimento_em)}</td>;
                      }
                      if (col === "atendente") {
                        return (
                          <td key={col} style={dataTable.tdCenter} title={nomeAtendente(row)}>
                            <span
                              style={{
                                display: "inline-block",
                                maxWidth: 160,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {nomeAtendente(row)}
                            </span>
                          </td>
                        );
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
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
