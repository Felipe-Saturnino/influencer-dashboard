import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Eye, Loader2, Pencil } from "lucide-react";
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
import { FiltroBarPillButton } from "../../../components/dashboard";
import { FiltroBarCampoSelect } from "../../../components/FiltroBarCampoSelect";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { tooltipAcaoAbreModal } from "../../../lib/iconOnlyButtonA11y";
import {
  fmtDataSolicitacao,
  labelStatusSolicitacao,
  labelTipoSolicitacao,
  RH_SOLICITACAO_FILTRO_TODAS_VALUE,
  RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE,
  RH_SOLICITACAO_STATUS_CARROSSEL,
  RH_SOLICITACAO_STATUS_CORES,
  RH_SOLICITACAO_STATUS_DEFAULT,
  RH_SOLICITACAO_TIPO_OPTIONS,
  RH_SOLICITACAO_TODOS_STATUS_LABEL,
} from "../../../lib/rhSolicitacoesConstants";
import type {
  RhSolicitacaoFiltroStatus,
  RhSolicitacaoFiltroTipo,
  RhSolicitacaoRow,
  RhSolicitacaoStatus,
} from "../../../types/rhSolicitacao";
import { ModalAtenderSolicitacao, ModalVerSolicitacao } from "./ModalsVerAtender";

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
  solicitante:rh_funcionarios ( id, nome ),
  vaga:rh_vagas ( id, titulo )
`.trim();

type SortCol = "data" | "solicitante" | "tipo" | "status";

function unwrapEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function nomeSolicitante(row: RhSolicitacaoRow): string {
  return unwrapEmbed(row.solicitante)?.nome?.trim() || "—";
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

  const [filtroStatus, setFiltroStatus] = useState<RhSolicitacaoFiltroStatus>(RH_SOLICITACAO_STATUS_DEFAULT);
  const [filtroTipo, setFiltroTipo] = useState<RhSolicitacaoFiltroTipo>(RH_SOLICITACAO_FILTRO_TODAS_VALUE);
  const [lista, setLista] = useState<RhSolicitacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "data", dir: "desc" });
  const [modalVer, setModalVer] = useState<RhSolicitacaoRow | null>(null);
  const [modalAtender, setModalAtender] = useState<RhSolicitacaoRow | null>(null);

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
    let q = supabase.from("rh_solicitacoes").select(RH_SOLICITACOES_SELECT).order("created_at", { ascending: false });

    if (filtroStatus !== RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE) {
      q = q.eq("status", filtroStatus);
    }
    if (filtroTipo !== RH_SOLICITACAO_FILTRO_TODAS_VALUE) {
      q = q.eq("tipo", filtroTipo);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[RhSolicitacoes]", error);
      setLista([]);
    } else {
      setLista((data ?? []) as unknown as RhSolicitacaoRow[]);
    }
    setLoading(false);
  }, [filtroStatus, filtroTipo]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void fetchLista();
  }, [fetchLista, perm.loading, perm.canView]);

  const listaOrdenada = useMemo(() => {
    const rows = [...lista];
    const { col, dir } = sort;
    rows.sort((a, b) => {
      switch (col) {
        case "data":
          return (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) * (dir === "asc" ? 1 : -1);
        case "solicitante":
          return compareLocaleTexto(nomeSolicitante(a), nomeSolicitante(b), dir);
        case "tipo":
          return compareLocaleTexto(labelTipoSolicitacao(a.tipo), labelTipoSolicitacao(b.tipo), dir);
        case "status":
          return compareLocaleTexto(labelStatusSolicitacao(a.status), labelStatusSolicitacao(b.status), dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [lista, sort]);

  function onSort(col: SortCol) {
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "data" ? "desc" : "asc" }));
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

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="rh_solicitacoes" />}
        title={getPageMenuLabel("rh_solicitacoes")}
        subtitle="Acompanhe e atenda solicitações de prestadores — atestados e vagas internas."
      />

      <div style={getFilterBarWrapperStyle(brand, t)}>
        <div
          style={{
            ...getFilterBarRowStyle(),
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
            <button type="button" aria-label="Status anterior" onClick={retrocederStatus} style={getCarouselBtnNavStyle(t, false)}>
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={getCarouselPeriodLabelStyle(t, { minWidth: 160 })}>{labelStatusCentral}</span>
            <button type="button" aria-label="Próximo status" onClick={avancarStatus} style={getCarouselBtnNavStyle(t, false)}>
              <ChevronRight size={14} aria-hidden="true" />
            </button>

            <FiltroBarPillButton
              active={todosStatusAtivo}
              onClick={() => setFiltroStatus(RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE)}
              icon={FilterBarIcons.status}
              aria-label={todosStatusAtivo ? "Exibindo todos os status" : "Ver todos os status"}
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

          <FiltroBarCampoSelect
            id="filtro-tipo-solicitacao"
            value={filtroTipo}
            onChange={(v) => setFiltroTipo(v as RhSolicitacaoFiltroTipo)}
            options={RH_SOLICITACAO_TIPO_OPTIONS}
            icon={<ClipboardList size={15} strokeWidth={2} aria-hidden="true" />}
            ariaLabel="Tipo de solicitação"
            todasValue={RH_SOLICITACAO_FILTRO_TODAS_VALUE}
            todasLabel="Todas Solicitações"
            minWidth={220}
            style={{ flexShrink: 0 }}
          />
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="atestados e vagas internas">Solicitações</SectionTitle>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 13 }}>Carregando…</div>
          </div>
        ) : listaOrdenada.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Solicitações de prestadores</caption>
              <thead>
                <tr>
                  <SortTableTh
                    label="Data da Solicitação"
                    col="data"
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    onSort={onSort}
                    thStyle={dataTable.thHeaderSticky}
                    align="center"
                  />
                  <SortTableTh
                    label="Solicitante"
                    col="solicitante"
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    onSort={onSort}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <SortTableTh
                    label="Tipo de Solicitação"
                    col="tipo"
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    onSort={onSort}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <SortTableTh
                    label="Status"
                    col="status"
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    onSort={onSort}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <th scope="col" style={dataTable.thHeader}>
                    Ações
                  </th>
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
                    <td style={dataTable.tdSticky({ rowIndex: i })}>{fmtDataSolicitacao(row.created_at)}</td>
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
                    <td style={dataTable.tdCenter}>{labelTipoSolicitacao(row.tipo)}</td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center" }}>{badgeStatus(row.status)}</div>
                    </td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                        <BtnIconeAcaoLinha
                          label={tooltipAcaoAbreModal("Ver solicitação", nomeSolicitante(row))}
                          onClick={() => setModalVer(row)}
                        >
                          <Eye size={14} aria-hidden />
                        </BtnIconeAcaoLinha>
                        {perm.canEditarOk ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcaoAbreModal("Atender solicitação", nomeSolicitante(row))}
                            onClick={() => setModalAtender(row)}
                          >
                            <Pencil size={14} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
