import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Archive, ChevronLeft, ChevronRight, ClipboardList, Inbox, Loader2, MoreHorizontal } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import {
  DashboardPageHeader,
  FiltroCalendarioStaffSelect,
  FiltroCalendarioTimeSelect,
  FiltroBarTabButton,
  FiltroHistoricoButton,
  FiltroSolicitacoesTipoAcaoSelect,
  SectionTitle,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FILTRO_BAR_TAB_ICON_SIZE, getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import {
  ESCALA_TIME_SLUG_PARA_ROTULO_CALENDARIO,
  OFERTA_STATUS_LABEL,
  RH_CALENDARIO_ACAO_LABEL_FORMAL,
  type EscalaAcaoFiltro,
  type EscalaTimeFiltro,
  type LinhaOfertaMarketplace,
} from "../../../lib/escalaTurnosUiConstants";
import type { RhCalendarioAcaoTipo } from "../../../lib/rhCalendarioAcaoHelpers";
import {
  getMesesDisponiveisEscalaCarrossel,
  idxMesInicialEscalaCarrossel,
} from "../../../lib/escalaMesCarrosselOverviewStyle";
import { supabase } from "../../../lib/supabase";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import {
  CALENDARIO_TIMES_FILTRO_ORDEM,
  normalizarSelecaoUnica,
  TREINAMENTO_FILTRO_ID,
  normalizarNomeCalFiltro,
  timeRowPorRotuloCanonica,
  prestadorAtendeFiltroTime,
  type StaffTimeRow,
} from "../../../lib/rhCalendarioStaffFiltroHelpers";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import { BRAND } from "../../../lib/dashboardConstants";

const MOCK_SOLICITACOES: LinhaOfertaMarketplace[] = [];

const MSG_VAZIO_SOLICITACOES = "Sem solicitações para os filtros selecionados.";

function inicioFimMesUtc(ano: number, mes0: number): { ini: string; fim: string } {
  const ini = new Date(Date.UTC(ano, mes0, 1));
  const fim = new Date(Date.UTC(ano, mes0 + 1, 0));
  const p2 = (n: number) => String(n).padStart(2, "0");
  return {
    ini: `${ini.getUTCFullYear()}-${p2(ini.getUTCMonth() + 1)}-${p2(ini.getUTCDate())}`,
    fim: `${fim.getUTCFullYear()}-${p2(fim.getUTCMonth() + 1)}-${p2(fim.getUTCDate())}`,
  };
}

function dataIsoNoMes(dataIso: string, ano: number, mes0: number): boolean {
  const s = dataIso.slice(0, 10);
  const { ini, fim } = inicioFimMesUtc(ano, mes0);
  return s >= ini && s <= fim;
}

/** Data de abertura da solicitação (ISO) — distinta da data da oferta quando ambas existirem. */
function dataAberturaSolicitacaoIso(row: LinhaOfertaMarketplace): string {
  return (row.dataAberturaIso ?? row.dataOfertaIso).slice(0, 10);
}

function filtrarPorMesAberturaSolicitacao(
  rows: LinhaOfertaMarketplace[],
  ano: number,
  mes0: number,
): LinhaOfertaMarketplace[] {
  return rows.filter((r) => dataIsoNoMes(dataAberturaSolicitacaoIso(r), ano, mes0));
}

function passaFiltroTipo(row: LinhaOfertaMarketplace, filtro: EscalaAcaoFiltro): boolean {
  if (filtro === "todos") return true;
  return row.tipo === filtro;
}

function passaFiltroTime(row: LinhaOfertaMarketplace, filtro: EscalaTimeFiltro): boolean {
  if (filtro === "todos") return true;
  return row.timeKey === filtro;
}

export default function EscalaSolicitacoesPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_solicitacoes");
  const soProprios = !perm.loading && perm.canView === "proprios";

  const [times, setTimes] = useState<StaffTimeRow[]>([]);
  const [prestadores, setPrestadores] = useState<RhFuncionario[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [erroStaff, setErroStaff] = useState<string | null>(null);
  const [treinamentoGerenciaId, setTreinamentoGerenciaId] = useState<string | null>(null);
  const [treinamentoTimeIdsList, setTreinamentoTimeIdsList] = useState<string[]>([]);

  const hoje = useMemo(() => new Date(), []);
  const mesesDisponiveis = useMemo(() => getMesesDisponiveisEscalaCarrossel(hoje), [hoje]);
  const [idxMes, setIdxMes] = useState(() => idxMesInicialEscalaCarrossel(getMesesDisponiveisEscalaCarrossel(new Date()), new Date()));
  const [historico, setHistorico] = useState(false);

  const idxMesInicial = useMemo(
    () => idxMesInicialEscalaCarrossel(mesesDisponiveis, hoje),
    [mesesDisponiveis, hoje],
  );

  useEffect(() => {
    setIdxMes((i) => Math.min(Math.max(0, i), Math.max(0, mesesDisponiveis.length - 1)));
  }, [mesesDisponiveis.length]);

  const [aba, setAba] = useState<"aberto" | "arquivadas">("aberto");
  const [filtroTipo, setFiltroTipo] = useState<EscalaAcaoFiltro>("todos");
  const [filtroTimeIds, setFiltroTimeIds] = useState<string[]>([]);
  const [filtroStaffIds, setFiltroStaffIds] = useState<string[]>([]);

  const carregarTimes = useCallback(async () => {
    setErroStaff(null);
    const { data, error } = await supabase.rpc("rh_staff_times_filtrados");
    if (error) {
      setErroStaff("Não foi possível carregar os times de staff.");
      setTimes([]);
      return;
    }
    setTimes((data ?? []) as StaffTimeRow[]);
  }, []);

  const timeIds = useMemo(() => times.map((x) => x.id), [times]);
  const treinamentoTimeIds = useMemo(() => new Set(treinamentoTimeIdsList), [treinamentoTimeIdsList]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    if (perm.canView !== "sim" && perm.canView !== "proprios") return;
    if (perm.canView === "proprios") {
      setTimes([]);
      setErroStaff(null);
      return;
    }
    setLoadingStaff(true);
    void carregarTimes().finally(() => setLoadingStaff(false));
  }, [perm.loading, perm.canView, carregarTimes]);

  useEffect(() => {
    if (perm.loading || perm.canView !== "proprios") return;
    if (!user?.email?.trim()) {
      setPrestadores([]);
      setLoadingStaff(false);
      return;
    }
    let cancelled = false;
    setLoadingStaff(true);
    void (async () => {
      const row = await buscarRhFuncionarioAtivoPorEmailLogin(user.email!);
      if (cancelled) return;
      if (row) {
        setPrestadores([row]);
        setErroStaff(null);
      } else {
        setPrestadores([]);
        setErroStaff(null);
      }
      setLoadingStaff(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, user?.email]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("rh_org_gerencias")
        .select("id, nome")
        .eq("status", "ativo")
        .ilike("nome", "%treinamento%");
      if (cancelled) return;
      if (error || !data?.length) {
        setTreinamentoGerenciaId(null);
        return;
      }
      const exato = data.find((r: { nome: string }) => normalizarNomeCalFiltro(r.nome) === "treinamento");
      setTreinamentoGerenciaId(exato?.id ?? data[0]!.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    if (perm.canView === "proprios") return;
    let cancelled = false;
    void (async () => {
      const idsStaff = times.map((x) => x.id);
      const merged = new Map<string, RhFuncionario>();

      if (idsStaff.length > 0) {
        const { data, error } = await supabase
          .from("rh_funcionarios")
          .select("*")
          .in("org_time_id", idsStaff)
          .in("status", ["ativo", "indisponivel"])
          .order("nome", { ascending: true });
        if (!cancelled && !error) (data ?? []).forEach((p: RhFuncionario) => merged.set(p.id, p));
      }

      let ttIdsLocal: string[] = [];
      if (treinamentoGerenciaId) {
        const { data: tt } = await supabase
          .from("rh_org_times")
          .select("id")
          .eq("gerencia_id", treinamentoGerenciaId)
          .eq("status", "ativo");
        ttIdsLocal = (tt ?? []).map((r: { id: string }) => r.id);
        if (!cancelled) setTreinamentoTimeIdsList(ttIdsLocal);

        let q = supabase
          .from("rh_funcionarios")
          .select("*")
          .in("status", ["ativo", "indisponivel"])
          .order("nome", { ascending: true });
        if (ttIdsLocal.length > 0) {
          q = q.or(`org_gerencia_id.eq.${treinamentoGerenciaId},org_time_id.in.(${ttIdsLocal.join(",")})`);
        } else {
          q = q.eq("org_gerencia_id", treinamentoGerenciaId);
        }
        const { data: d2, error: e2 } = await q;
        if (!cancelled && !e2) (d2 ?? []).forEach((p: RhFuncionario) => merged.set(p.id, p));
      } else if (!cancelled) {
        setTreinamentoTimeIdsList([]);
      }

      if (!cancelled) {
        setPrestadores(
          [...merged.values()].sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR")),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, times, treinamentoGerenciaId]);

  const filtroTimeSlug = useMemo((): EscalaTimeFiltro => {
    if (filtroTimeIds.length === 0) return "todos";
    if (filtroTimeIds.includes(TREINAMENTO_FILTRO_ID)) return "treinamento";
    const id = filtroTimeIds[0];
    for (const slug of Object.keys(ESCALA_TIME_SLUG_PARA_ROTULO_CALENDARIO) as Exclude<
      EscalaTimeFiltro,
      "todos"
    >[]) {
      const row = timeRowPorRotuloCanonica(times, ESCALA_TIME_SLUG_PARA_ROTULO_CALENDARIO[slug]);
      if (row?.id === id) return slug;
    }
    return "todos";
  }, [filtroTimeIds, times]);

  const filtroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeIds);
    return new Set(filtroTimeIds.filter((id) => id !== TREINAMENTO_FILTRO_ID && allowed.has(id)));
  }, [filtroTimeIds, timeIds]);

  const treinamentoSelecionado = filtroTimeIds.includes(TREINAMENTO_FILTRO_ID);
  const filtroTimeAtivo = filtroTimeIds.length > 0;

  const timeMultiselectItems = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    for (const rotulo of CALENDARIO_TIMES_FILTRO_ORDEM) {
      if (rotulo === "Treinamento") {
        if (treinamentoGerenciaId) items.push({ id: TREINAMENTO_FILTRO_ID, name: "Treinamento" });
        continue;
      }
      const row = timeRowPorRotuloCanonica(times, rotulo);
      if (row) items.push({ id: row.id, name: rotulo });
    }
    return items;
  }, [times, treinamentoGerenciaId]);

  useEffect(() => {
    const valid = new Set(timeMultiselectItems.map((x) => x.id));
    setFiltroTimeIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [timeMultiselectItems]);

  const staffMultiselectItems = useMemo(() => {
    const opts = {
      filtroAtivo: filtroTimeAtivo,
      filtroTimeIdsReais,
      treinamentoSelecionado,
      treinamentoGerenciaId,
      treinamentoTimeIds,
    };
    return prestadores
      .filter((p) => prestadorAtendeFiltroTime(p, opts))
      .map((p) => ({ id: p.id, name: (p.nome ?? "").trim() || "—" }));
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais, treinamentoSelecionado, treinamentoGerenciaId, treinamentoTimeIds]);

  useEffect(() => {
    if (prestadores.length === 0 || !filtroTimeAtivo) return;
    const opts = {
      filtroAtivo: true,
      filtroTimeIdsReais,
      treinamentoSelecionado,
      treinamentoGerenciaId,
      treinamentoTimeIds,
    };
    setFiltroStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const allowedStaff = new Set(prestadores.filter((p) => prestadorAtendeFiltroTime(p, opts)).map((p) => p.id));
      const next = prev.filter((id) => allowedStaff.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais, treinamentoSelecionado, treinamentoGerenciaId, treinamentoTimeIds, filtroTimeIds]);

  useEffect(() => {
    const allowedIds = new Set(staffMultiselectItems.map((x) => x.id));
    setFiltroStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => allowedIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [staffMultiselectItems]);

  const linhasBase = MOCK_SOLICITACOES;

  const staffFiltroId = filtroStaffIds[0];

  const linhasNoPeriodoCarrossel = useMemo(() => {
    if (historico) return linhasBase;
    const m = mesesDisponiveis[idxMes];
    if (!m) return [];
    return filtrarPorMesAberturaSolicitacao(linhasBase, m.ano, m.mes);
  }, [linhasBase, mesesDisponiveis, idxMes, historico]);

  const linhasAberto = useMemo(() => {
    return linhasNoPeriodoCarrossel.filter(
      (r) =>
        r.status === "em_analise" &&
        passaFiltroTipo(r, filtroTipo) &&
        passaFiltroTime(r, filtroTimeSlug) &&
        (!staffFiltroId || r.solicitanteStaffId === staffFiltroId),
    );
  }, [linhasNoPeriodoCarrossel, filtroTipo, filtroTimeSlug, staffFiltroId]);

  const linhasArquivadas = useMemo(() => {
    return linhasNoPeriodoCarrossel.filter(
      (r) =>
        (r.status === "cancelada" || r.status === "aprovada" || r.status === "recusada") &&
        passaFiltroTipo(r, filtroTipo) &&
        passaFiltroTime(r, filtroTimeSlug) &&
        (!staffFiltroId || r.solicitanteStaffId === staffFiltroId),
    );
  }, [linhasNoPeriodoCarrossel, filtroTipo, filtroTimeSlug, staffFiltroId]);

  const mesSelecionado = mesesDisponiveis[idxMes];
  const carrosselPrimeiro = idxMes === 0;
  const carrosselUltimo = idxMes >= mesesDisponiveis.length - 1;
  const showTimeFilter = !soProprios && timeMultiselectItems.length > 0;
  const showStaffFilter = !soProprios && staffMultiselectItems.length > 0;

  const filterBarSection = (withTopBorder: boolean): CSSProperties => ({
    ...getFilterBarRowStyle(),
    width: "100%",
    ...(withTopBorder
      ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }
      : {}),
  });

  function renderTabelaSolicitacoes(rows: LinhaOfertaMarketplace[], comStatus: boolean) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_VAZIO_SOLICITACOES}
        </div>
      );
    }
    const headers = [
      "Data de Abertura",
      "Tipo de Ação",
      "Turno da Oferta",
      "Operadora",
      "Data de Interesse",
      "Turno de Interesse",
      "Comprador",
      ...(comStatus ? (["Status"] as const) : []),
      "Ações",
    ];
    return (
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
          <caption style={{ display: "none" }}>Solicitações</caption>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col" style={getThStyle(t)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {dataAberturaSolicitacaoIso(r)}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoOferta}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.operadora}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {r.dataInteresseIso ?? "—"}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoInteresse ?? "—"}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.comprador ?? "—"}</td>
                {comStatus && (
                  <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                    {r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}
                  </td>
                )}
                <td style={getTdStyle(t, { textAlign: "center", background: zebraStripe(i) })}>
                  <button
                    type="button"
                    aria-label="Ações da solicitação"
                    style={{
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      borderRadius: 8,
                      padding: 6,
                      cursor: "pointer",
                      color: t.text,
                    }}
                  >
                    <MoreHorizontal size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const blocoFiltrosLinha = loadingStaff ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: t.textMuted,
        fontSize: 12,
        fontFamily: FONT.body,
      }}
    >
      <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="var(--brand-primary, #7c3aed)" />
      {soProprios ? "Carregando…" : "Carregando staff…"}
    </span>
  ) : erroStaff ? (
    <span style={{ color: BRAND.vermelho, fontSize: 12, fontFamily: FONT.body }}>{erroStaff}</span>
  ) : (
    <>
      <FiltroSolicitacoesTipoAcaoSelect value={filtroTipo} onChange={setFiltroTipo} />
      {showTimeFilter ? (
        <FiltroCalendarioTimeSelect
          selected={filtroTimeIds}
          onChange={(ids) => {
            setFiltroTimeIds(ids);
            setFiltroStaffIds([]);
          }}
          items={timeMultiselectItems}
        />
      ) : null}
      {showStaffFilter ? (
        <FiltroCalendarioStaffSelect
          selected={filtroStaffIds}
          onChange={(ids) => setFiltroStaffIds(normalizarSelecaoUnica(filtroStaffIds, ids))}
          items={staffMultiselectItems}
        />
      ) : null}
    </>
  );

  const blocoCarrosselHistorico = (
    <>
      <button
        type="button"
        aria-label="Mês anterior"
        style={getCarouselBtnNavStyle(t, historico || carrosselPrimeiro)}
        onClick={() => {
          setHistorico(false);
          setIdxMes((i) => Math.max(0, i - 1));
        }}
        disabled={historico || carrosselPrimeiro}
      >
        <ChevronLeft size={14} aria-hidden="true" />
      </button>
      <span style={getCarouselPeriodLabelStyle(t, { minWidth: "min(100%, 180px)" })}>
        {historico ? "Todo o período" : (mesSelecionado?.label ?? "—")}
      </span>
      <button
        type="button"
        aria-label="Próximo mês"
        style={getCarouselBtnNavStyle(t, historico || carrosselUltimo)}
        onClick={() => {
          setHistorico(false);
          setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
        }}
        disabled={historico || carrosselUltimo}
      >
        <ChevronRight size={14} aria-hidden="true" />
      </button>
      <FiltroHistoricoButton
        active={historico}
        onClick={() => {
          if (historico) {
            setHistorico(false);
            setIdxMes(idxMesInicial >= 0 ? idxMesInicial : Math.max(0, mesesDisponiveis.length - 1));
          } else {
            setHistorico(true);
          }
        }}
      />
    </>
  );

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ padding: 24, color: t.textMuted, fontFamily: FONT.body }}>
        Carregando…
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="escala_solicitacoes" />}
        title={getPageMenuLabel("escala_solicitacoes")}
        subtitle="Acompanhe solicitações em aberto e o histórico arquivado por período, time e colaborador."
        brand={brand}
        t={t}
      />

      <div style={{ marginBottom: 18 }}>
        <div style={getFilterBarWrapperStyle(brand)}>
          <div style={filterBarSection(false)}>{blocoCarrosselHistorico}</div>
          <div style={filterBarSection(true)}>{blocoFiltrosLinha}</div>
          <div role="tablist" aria-label="Estado das solicitações" style={filterBarSection(true)}>
            <FiltroBarTabButton
              id="tab-sol-aberto"
              active={aba === "aberto"}
              aria-controls="panel-sol-aberto"
              onClick={() => setAba("aberto")}
              icon={<Inbox size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
            >
              Solicitações em Aberto
            </FiltroBarTabButton>
            <FiltroBarTabButton
              id="tab-sol-arq"
              active={aba === "arquivadas"}
              aria-controls="panel-sol-arq"
              onClick={() => setAba("arquivadas")}
              icon={<Archive size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
            >
              Solicitações Arquivadas
            </FiltroBarTabButton>
          </div>
        </div>
      </div>

      {aba === "aberto" && (
        <div role="tabpanel" id="panel-sol-aberto" aria-labelledby="tab-sol-aberto">
          <SectionTitle icon={<ClipboardList size={14} aria-hidden="true" />}>Solicitações</SectionTitle>
          {renderTabelaSolicitacoes(linhasAberto, false)}
        </div>
      )}

      {aba === "arquivadas" && (
        <div role="tabpanel" id="panel-sol-arq" aria-labelledby="tab-sol-arq">
          <SectionTitle icon={<ClipboardList size={14} aria-hidden="true" />}>Solicitações</SectionTitle>
          {renderTabelaSolicitacoes(linhasArquivadas, true)}
        </div>
      )}
    </div>
  );
}
