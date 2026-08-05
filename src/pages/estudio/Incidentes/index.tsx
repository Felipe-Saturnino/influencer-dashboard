import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BellOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Shuffle,
  UserRound,
  Users,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { getPageContentBoxStyle, getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import {
  CtaCriarButton,
  FiltroBarTabButton,
  FiltroEntidadeBarSelect,
  FiltroEstudioSelect,
  FiltroHistoricoButton,
  KpiCard,
  onFiltroBarTabsKeyDown,
  SectionTitle,
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import {
  getIdxMesCarrosselPadrao,
  getMesesDisponiveis,
  getPeriodoComparativoMoM,
  getPeriodoHistoricoCompetencias,
} from "../../../lib/dashboardHelpers";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { buscarRhFuncionarioIdsPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import { fetchEstudiosSpinRows, fetchMesasSpinCadastroRows } from "../../plataforma/GestaoMesas/gestaoMesasFetch";
import { nomeEstudioJoin } from "../../plataforma/GestaoMesas/gestaoMesasUi";
import type { EstudioSpinRow, MesaSpinCadastroRow } from "../../plataforma/GestaoMesas/gestaoMesasUi";
import { fetchEstudioIncidentesPeriodo, fetchStaffFiltroIncidentes } from "../../../lib/estudioIncidentesFetch";
import {
  INCIDENTE_CATEGORIA_META,
  INCIDENTES_MES_INICIO,
  INCIDENTES_PAGE_SUBTITLE,
  type EstudioIncidenteRow,
  type IncidenteCategoria,
  type IncidenteStaffOption,
  type IncidenteTimeAlvo,
} from "../../../lib/estudioIncidentesTypes";
import {
  formatDataHoraIncidente,
  incidenteCategoriaLabel,
  labelMesaIncidente,
  labelPrestadorIncidente,
  labelTipoJogoIncidente,
  normalizarTipoJogoIncidente,
  timeAlvoLabel,
} from "../../../lib/estudioIncidentesHelpers";
import { GAME_IDENTITY_ICONS, isGameIdentityKey } from "../../../lib/gameIdentityIcons";
import { getGameTagChipStyle } from "../../../lib/gameIdentityColors";
import { ModalVerIncidente } from "./ModalVerIncidente";
import { ModalNovoIncidente, type NovoIncidenteMesaOption } from "./ModalNovoIncidente";

const ERRO_CARREGAR =
  "Não foi possível carregar os incidentes. Se o problema persistir, entre em contato com o suporte.";

const INCIDENTES_PAGE_SUBTITLE_PROPRIOS =
  "Acompanhe os incidentes registrados sobre a sua operação em mesa.";

type TimeTab = "todos" | IncidenteTimeAlvo;
type SortCol = "protocolo" | "data" | "prestador" | "time" | "jogo" | "incidente" | "tipo" | "relator";

const CATEGORIAS_KPI: IncidenteCategoria[] = [
  "caso",
  "erro",
  "oculto",
  "nao_avisado",
  "avisado_resolvido",
  "avisado_nao_resolvido",
];

const CATEGORIA_ICON: Record<IncidenteCategoria, ReactNode> = {
  caso: <AlertTriangle size={16} aria-hidden />,
  erro: <CircleAlert size={16} aria-hidden />,
  oculto: <EyeOff size={16} aria-hidden />,
  nao_avisado: <BellOff size={16} aria-hidden />,
  avisado_resolvido: <CheckCircle2 size={16} aria-hidden />,
  avisado_nao_resolvido: <AlertCircle size={16} aria-hidden />,
};

function gameIdentityKeyFromJogo(jogo: string) {
  const k = normalizarTipoJogoIncidente(jogo);
  const candidato = k === "fb" ? "futebol_brasileiro" : k;
  return isGameIdentityKey(candidato) ? candidato : null;
}

function contarPorCategoria(rows: EstudioIncidenteRow[]): Record<IncidenteCategoria, number> {
  const out: Record<IncidenteCategoria, number> = {
    caso: 0,
    erro: 0,
    oculto: 0,
    nao_avisado: 0,
    avisado_resolvido: 0,
    avisado_nao_resolvido: 0,
  };
  for (const r of rows) out[r.incidente] += 1;
  return out;
}

function sortRows(rows: EstudioIncidenteRow[], col: SortCol, dir: SortDir): EstudioIncidenteRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (col) {
      case "data":
        return compareLocaleTexto(a.ocorrido_em, b.ocorrido_em, dir);
      case "protocolo":
        return compareLocaleTexto(a.protocolo, b.protocolo, dir);
      case "prestador":
        return compareLocaleTexto(a.prestador_nome, b.prestador_nome, dir);
      case "time":
        return compareLocaleTexto(timeAlvoLabel(a.time_alvo), timeAlvoLabel(b.time_alvo), dir);
      case "jogo":
        return compareLocaleTexto(labelTipoJogoIncidente(a.jogo), labelTipoJogoIncidente(b.jogo), dir);
      case "incidente":
        return compareLocaleTexto(incidenteCategoriaLabel(a.incidente), incidenteCategoriaLabel(b.incidente), dir);
      case "tipo":
        return compareLocaleTexto(a.tipo, b.tipo, dir);
      case "relator":
        return compareLocaleTexto(a.relator_nome, b.relator_nome, dir);
      default:
        return 0;
    }
  });
  return copy;
}

export default function Incidentes() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("incidentes");
  const dataTable = useDataTableBlock();

  const isProprios = perm.canView === "proprios";
  /** Produto: Novo Incidente só com Editar = Sim (não Próprios). */
  const canNovo = perm.canEditar === "sim";

  const meses = useMemo(() => getMesesDisponiveis(INCIDENTES_MES_INICIO), []);
  const [mesIdx, setMesIdx] = useState(() => getIdxMesCarrosselPadrao(meses));
  const [historico, setHistorico] = useState(false);
  const [estudioFiltro, setEstudioFiltro] = useState("todos");
  const [timeTab, setTimeTab] = useState<TimeTab>("todos");
  const [staffFiltroId, setStaffFiltroId] = useState("");
  const [busca, setBusca] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "data", dir: "desc" });

  const [rowsAtual, setRowsAtual] = useState<EstudioIncidenteRow[]>([]);
  const [rowsAnterior, setRowsAnterior] = useState<EstudioIncidenteRow[]>([]);
  const [mesasRows, setMesasRows] = useState<MesaSpinCadastroRow[]>([]);
  const [estudiosRows, setEstudiosRows] = useState<EstudioSpinRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<IncidenteStaffOption[]>([]);
  const [meusIds, setMeusIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [verIncidente, setVerIncidente] = useState<EstudioIncidenteRow | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const mesAtual = meses[mesIdx] ?? meses[meses.length - 1];
  const podeVer = perm.canView === "sim" || perm.canView === "proprios";

  const periodoAtual = useMemo(() => {
    if (historico) return getPeriodoHistoricoCompetencias();
    if (!mesAtual) return getPeriodoHistoricoCompetencias();
    return getPeriodoComparativoMoM(mesAtual.ano, mesAtual.mes).atual;
  }, [historico, mesAtual]);

  const periodoAnterior = useMemo(() => {
    if (historico || !mesAtual) return null;
    return getPeriodoComparativoMoM(mesAtual.ano, mesAtual.mes).anterior;
  }, [historico, mesAtual]);

  const carregarDados = useCallback(async () => {
    setErro(null);
    try {
      const [atual, anterior] = await Promise.all([
        fetchEstudioIncidentesPeriodo({ dataIni: periodoAtual.inicio, dataFim: periodoAtual.fim }),
        periodoAnterior
          ? fetchEstudioIncidentesPeriodo({ dataIni: periodoAnterior.inicio, dataFim: periodoAnterior.fim })
          : Promise.resolve([]),
      ]);
      setRowsAtual(atual);
      setRowsAnterior(anterior);
    } catch (e) {
      console.error("Incidentes: falha ao carregar dados do período", e);
      setErro(ERRO_CARREGAR);
    } finally {
      setLoading(false);
    }
  }, [periodoAtual, periodoAnterior]);

  useEffect(() => {
    if (perm.loading || !podeVer) return;
    setLoading(true);
    void carregarDados();
  }, [perm.loading, podeVer, carregarDados]);

  useEffect(() => {
    if (perm.loading || !podeVer) return;
    let cancel = false;
    void (async () => {
      try {
        const [mesasRes, estudiosRes, staffRes] = await Promise.all([
          fetchMesasSpinCadastroRows(),
          fetchEstudiosSpinRows(),
          fetchStaffFiltroIncidentes(),
        ]);
        if (cancel) return;
        setMesasRows(mesasRes);
        setEstudiosRows(estudiosRes);
        setStaffOptions(staffRes);
      } catch (e) {
        console.error("Incidentes: falha ao carregar mesas/estúdios/staff", e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [perm.loading, podeVer]);

  useEffect(() => {
    if (perm.loading || !isProprios) return;
    let cancel = false;
    void (async () => {
      const ids = await buscarRhFuncionarioIdsPorEmailLogin(user?.email);
      if (!cancel) setMeusIds(ids);
    })();
    return () => {
      cancel = true;
    };
  }, [perm.loading, isProprios, user?.email]);

  function toggleHistorico() {
    setHistorico((h) => {
      if (h) setMesIdx(getIdxMesCarrosselPadrao(meses));
      return !h;
    });
  }

  const estudiosOptions = useMemo(() => estudiosRows.map((e) => ({ slug: e.slug, nome: e.nome })), [estudiosRows]);

  const mesasParaForm = useMemo<NovoIncidenteMesaOption[]>(
    () =>
      mesasRows.map((m) => ({
        id: m.id,
        label: labelMesaIncidente(m.numero_mesa, nomeEstudioJoin(m, estudiosRows), m.nome_mesa),
        numeroMesa: m.numero_mesa,
        estudioSlug: m.estudio_slug,
        tipoJogo: m.tipo_jogo,
      })),
    [mesasRows, estudiosRows],
  );

  const staffFiltroOptions = useMemo(
    () => (timeTab === "todos" ? staffOptions : staffOptions.filter((s) => s.timeKey === timeTab)),
    [staffOptions, timeTab],
  );

  const aplicarFiltrosEscopo = useCallback(
    (rows: EstudioIncidenteRow[]) =>
      rows.filter((r) => {
        if (timeTab !== "todos" && r.time_alvo !== timeTab) return false;
        if (staffFiltroId && r.prestador_id !== staffFiltroId) return false;
        if (estudioFiltro !== "todos" && r.estudio_slug !== estudioFiltro) return false;
        if (isProprios && !meusIds.includes(r.prestador_id)) return false;
        return true;
      }),
    [timeTab, staffFiltroId, estudioFiltro, isProprios, meusIds],
  );

  const rowsAtualEscopo = useMemo(() => aplicarFiltrosEscopo(rowsAtual), [rowsAtual, aplicarFiltrosEscopo]);
  const rowsAnteriorEscopo = useMemo(
    () => aplicarFiltrosEscopo(rowsAnterior),
    [rowsAnterior, aplicarFiltrosEscopo],
  );

  const kpiAtual = useMemo(() => contarPorCategoria(rowsAtualEscopo), [rowsAtualEscopo]);
  const kpiAnterior = useMemo(() => contarPorCategoria(rowsAnteriorEscopo), [rowsAnteriorEscopo]);

  const rowsTabela = useMemo(() => {
    const filtradas = rowsAtualEscopo.filter((r) =>
      textoContemBuscaEmAlgum(busca, r.protocolo, r.tipo, r.mesa_label, r.prestador_nome),
    );
    return sortRows(filtradas, sort.col, sort.dir);
  }, [rowsAtualEscopo, busca, sort]);

  function onSort(col: SortCol) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));
  }

  const timeTabs: TimeTab[] = ["todos", "gp", "shuf"];

  function th(col: SortCol, label: string, style?: CSSProperties) {
    return (
      <SortTableTh
        key={col}
        col={col}
        label={label}
        sortCol={sort.col}
        sortDir={sort.dir}
        onSort={onSort}
        thStyle={style ?? dataTable.thHeader}
        align="center"
      />
    );
  }

  if (perm.loading) {
    return (
      <div className="app-page-shell">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
            <Loader2
              size={24}
              className="app-lucide-spin"
              color="var(--brand-primary, #7c3aed)"
              aria-hidden="true"
              style={{ marginBottom: 12 }}
            />
            <div style={{ fontSize: 13 }}>Carregando…</div>
          </div>
        </div>
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

  const carrosselPrimeiro = mesIdx === 0;
  const carrosselUltimo = mesIdx === meses.length - 1;

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="incidentes" />}
        title={getPageMenuLabel("incidentes")}
        subtitle={isProprios ? INCIDENTES_PAGE_SUBTITLE_PROPRIOS : INCIDENTES_PAGE_SUBTITLE}
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
        <div className="app-marketplace-filtro-minhas">
          <span className="app-marketplace-filtro-minhas__spacer" aria-hidden="true" />
          <div className="app-marketplace-filtro-minhas__centro">
            <button
              type="button"
              aria-label="Mês anterior"
              disabled={historico || carrosselPrimeiro}
              onClick={() => setMesIdx((i) => Math.max(0, i - 1))}
              style={getCarouselBtnNavStyle(t, historico || carrosselPrimeiro)}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={getCarouselPeriodLabelStyle(t, { minWidth: 180 })}>
              {historico ? "Todo o período" : mesAtual?.label}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              disabled={historico || carrosselUltimo}
              onClick={() => setMesIdx((i) => Math.min(meses.length - 1, i + 1))}
              style={getCarouselBtnNavStyle(t, historico || carrosselUltimo)}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            <FiltroHistoricoButton active={historico} onClick={toggleHistorico} />
            <FiltroEstudioSelect value={estudioFiltro} onChange={setEstudioFiltro} estudios={estudiosOptions} />
          </div>
          <div className="app-marketplace-filtro-minhas__cta">
            <AjudaContextualAcoes pageKey="incidentes" />
          </div>
        </div>

        {!isProprios ? (
          <div
            role="tablist"
            aria-label="Time"
            style={{ ...getFilterBarRowStyle(), marginTop: 10 }}
            onKeyDown={(e) => onFiltroBarTabsKeyDown(e, timeTabs, setTimeTab, (k) => `tab-incidentes-time-${k}`)}
          >
            <FiltroBarTabButton
              id="tab-incidentes-time-todos"
              active={timeTab === "todos"}
              onClick={() => setTimeTab("todos")}
              icon={<Users size={16} strokeWidth={2} aria-hidden />}
            >
              Todos Times
            </FiltroBarTabButton>
            <FiltroBarTabButton
              id="tab-incidentes-time-gp"
              active={timeTab === "gp"}
              onClick={() => setTimeTab("gp")}
              icon={<UserRound size={16} strokeWidth={2} aria-hidden />}
            >
              Game Presenters
            </FiltroBarTabButton>
            <FiltroBarTabButton
              id="tab-incidentes-time-shuf"
              active={timeTab === "shuf"}
              onClick={() => setTimeTab("shuf")}
              icon={<Shuffle size={16} strokeWidth={2} aria-hidden />}
            >
              Shuffler
            </FiltroBarTabButton>
          </div>
        ) : null}

        <div style={{ ...getFilterBarRowStyle(), marginTop: 10 }}>
          <BarraPesquisaPagina
            value={busca}
            onChange={setBusca}
            placeholder={PAGE_SEARCH.incidentes}
            aria-label="Buscar incidentes"
            wrapperStyle={{ flex: "1 1 260px", maxWidth: 420 }}
          />
          {!isProprios ? (
            <FiltroEntidadeBarSelect
              mode="single"
              selected={staffFiltroId ? [staffFiltroId] : []}
              onChange={(v) => setStaffFiltroId(v[0] ?? "")}
              items={staffFiltroOptions.map((s) => ({
                id: s.id,
                name: labelPrestadorIncidente(s.nome, s.nickname),
              }))}
              icon={FilterBarIcons.staff}
              triggerEmptyLabel="Todos Staff"
              ariaFilterPrefix="Filtrar por staff"
              listboxAriaLabel="Staff"
            />
          ) : null}
        </div>
      </div>

      {erro ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, padding: "20px 0", textAlign: "center" }}
        >
          {erro}
        </div>
      ) : (
        <>
          <div style={getPageContentBoxStyle(brand, t)}>
            <SectionTitle>KPIs Consolidados</SectionTitle>
            <div className="app-grid-kpi-6">
              {CATEGORIAS_KPI.map((cat) => {
                const meta = INCIDENTE_CATEGORIA_META[cat];
                return (
                  <KpiCard
                    key={cat}
                    label={meta.label}
                    value={String(kpiAtual[cat])}
                    icon={CATEGORIA_ICON[cat]}
                    accentColor={meta.color}
                    atual={kpiAtual[cat]}
                    anterior={kpiAnterior[cat]}
                    isHistorico={historico}
                    isInverso
                  />
                );
              })}
            </div>
          </div>

          <div style={getPageContentBoxStyle(brand, t)}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <SectionTitle compact>Incidentes</SectionTitle>
              {canNovo ? (
                <CtaCriarButton type="button" onClick={() => setNovoOpen(true)}>
                  Novo Incidente
                </CtaCriarButton>
              ) : null}
            </div>

            {loading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                <Loader2
                  size={20}
                  className="app-lucide-spin"
                  color="var(--brand-primary, #7c3aed)"
                  aria-hidden="true"
                  style={{ marginBottom: 8 }}
                />
                <div style={{ fontSize: 13 }}>Carregando…</div>
              </div>
            ) : rowsTabela.length === 0 ? (
              <div
                style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}
              >
                Sem dados para o período selecionado.
              </div>
            ) : (
              <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
                <table style={getDataTableStyle({ minWidth: 900 })}>
                  <caption style={{ display: "none" }}>Lista de incidentes registrados no período</caption>
                  <thead>
                    <tr>
                      {th("protocolo", "Protocolo", dataTable.thHeaderSticky)}
                      {th("data", "Data/Hora")}
                      {!isProprios ? th("prestador", "Prestador") : null}
                      {!isProprios ? th("time", "Time") : null}
                      {th("jogo", "Jogo")}
                      {th("incidente", "Incidente")}
                      {th("tipo", "Tipo")}
                      {!isProprios ? th("relator", "Relator") : null}
                      <th scope="col" style={dataTable.thHeader}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsTabela.map((r, i) => {
                      const gameKey = gameIdentityKeyFromJogo(r.jogo);
                      const chip = gameKey ? getGameTagChipStyle(gameKey, t.isDark) : null;
                      const categoriaMeta = INCIDENTE_CATEGORIA_META[r.incidente];
                      return (
                        <tr key={r.id} style={{ background: dataTable.zebraRow(i) }}>
                          <td style={dataTable.tdSticky({ rowIndex: i, fontWeight: 700 })}>{r.protocolo}</td>
                          <td style={dataTable.tdCenter}>{formatDataHoraIncidente(r.ocorrido_em)}</td>
                          {!isProprios ? <td style={dataTable.tdCenter}>{r.prestador_nome}</td> : null}
                          {!isProprios ? <td style={dataTable.tdCenter}>{timeAlvoLabel(r.time_alvo)}</td> : null}
                          <td style={dataTable.tdCenter}>
                            {gameKey && chip ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "3px 9px",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: chip.bg,
                                  border: `1px solid ${chip.border}`,
                                  color: chip.color,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {GAME_IDENTITY_ICONS[gameKey]}
                                {labelTipoJogoIncidente(r.jogo)}
                              </span>
                            ) : (
                              labelTipoJogoIncidente(r.jogo)
                            )}
                          </td>
                          <td style={dataTable.tdCenter}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "3px 9px",
                                borderRadius: 20,
                                background: `${categoriaMeta.color}22`,
                                color: categoriaMeta.color,
                                border: `1px solid ${categoriaMeta.color}44`,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {categoriaMeta.label}
                            </span>
                          </td>
                          <td style={dataTable.tdCenter}>{r.tipo}</td>
                          {!isProprios ? <td style={dataTable.tdCenter}>{r.relator_nome}</td> : null}
                          <td style={dataTable.tdCenter}>
                            <div style={{ display: "flex", justifyContent: "center" }}>
                              <BtnIconeAcaoLinha label={tooltipAcao("Ver Incidente")} onClick={() => setVerIncidente(r)}>
                                <Eye size={13} aria-hidden />
                              </BtnIconeAcaoLinha>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {verIncidente ? (
        <ModalVerIncidente
          incidente={verIncidente}
          ocultarPrestadorTimeRelator={isProprios}
          onClose={() => setVerIncidente(null)}
        />
      ) : null}

      {novoOpen ? (
        <ModalNovoIncidente
          mesas={mesasParaForm}
          onClose={() => setNovoOpen(false)}
          onSaved={() => {
            setNovoOpen(false);
            void carregarDados();
          }}
        />
      ) : null}
    </div>
  );
}
