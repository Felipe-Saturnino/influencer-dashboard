import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros"
import { usePermission } from "../../../hooks/usePermission"
import { BASE_COLORS, FONT } from "../../../constants/theme"
import { FONT_TITLE } from "../../../lib/dashboardConstants"
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles"
import { getPeriodoHistoricoCompetencias } from "../../../lib/dashboardHelpers"
import { supabase } from "../../../lib/supabase"
import { fetchAllPages, fetchInBatched, fetchLiveResultadosBatched } from "../../../lib/supabasePaginate"
import type { CicloPagamento } from "../../../types"
import { FiltroInfluencerSelect, FiltroHistoricoButton, FiltroOperadoraSelect } from "../../../components/dashboard"
import { PageHeader } from "../../../components/PageHeader"
import { PageMenuIcon } from "../../../components/PageMenuIcon"
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes"
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu"
import { getPageContentBoxStyle, getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles"
import { roleParidadeInfluencer } from "../../../lib/staffRoles"
import {
  cicloSemanalParaData,
  gerarCiclosProativos,
  mesCalendarioDeHoje,
  opcoesMesesDoCarrossel,
  periodoDoMes,
  podeVerPagamentosAgenteFinanceiro,
} from "./financeiroCiclos"
import { fecharCiclosExpiradosPendentes } from "./financeiroFecharCiclo"
import { CICLO_IN_CHUNK, CICLO_PAGAMENTO_COLS } from "./financeiroTypes"
import type {
  FinanceiroAgenteCicloEscopo,
  FinanceiroLiveEscopoRow,
  FinanceiroPagamentoCicloEscopo,
} from "./financeiroTypes"
import type { BlocoFiltros } from "./financeiroFiltros"
import { BlocoKpis } from "./BlocoKpis"
import { BlocoCiclos } from "./BlocoCiclos"
import { BlocoConsolidado } from "./BlocoConsolidado"
import { useFinanceiroCatalogos } from "./useFinanceiroCatalogos"
import { useFinanceiroMes } from "./useFinanceiroMes"

export default function Financeiro() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("financeiro");

  const [ciclos, setCiclos] = useState<CicloPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loadGenRef = useRef(0);
  const [filterInfluencers, setFilterInfluencers] = useState<string[]>([]);
  const [filterOperadora, setFilterOperadora] = useState<string>("todas");
  const {
    influencerList,
    operadorasList,
    operadoraInfMap,
    loadingCatalogos,
  } = useFinanceiroCatalogos();

  const influencerListVisiveis = useMemo(() =>
    influencerList.filter((i) => podeVerInfluencer(i.id)),
    [influencerList, podeVerInfluencer]
  );

  const MESES_OPCOES = useMemo(() => opcoesMesesDoCarrossel(ciclos), [ciclos]);
  const [mesFiltro, setMesFiltro] = useState(() => mesCalendarioDeHoje());
  const [historico, setHistorico] = useState(false);

  useEffect(() => {
    if (historico || MESES_OPCOES.length === 0) return;
    if (!MESES_OPCOES.some((m) => m.value === mesFiltro)) {
      const fallback = MESES_OPCOES.find((m) => m.value === mesCalendarioDeHoje()) ?? MESES_OPCOES[0];
      if (fallback) setMesFiltro(fallback.value);
    }
  }, [MESES_OPCOES, historico, mesFiltro]);

  const filterOperadoraEfetivo = operadoraSlugsForcado?.length ? operadoraSlugsForcado[0] : filterOperadora;
  const filtroOp = useMemo(
    () => (operadoraSlugsForcado?.length ? operadoraSlugsForcado : (filterOperadora !== "todas" ? [filterOperadora] : null)),
    [operadoraSlugsForcado, filterOperadora],
  );
  const filtros: BlocoFiltros = useMemo(() => ({
    podeVerInfluencer,
    podeVerOperadora,
    filterInfluencers,
    filterOperadora: filterOperadoraEfetivo,
    filtroOp,
    operadoraInfMap,
    operadorasList,
    mesFiltro: historico ? "" : mesFiltro,
    historico,
  }), [podeVerInfluencer, podeVerOperadora, filterInfluencers, filterOperadoraEfetivo, filtroOp, operadoraInfMap, operadorasList, mesFiltro, historico]);

  const ciclosFiltradosPorMes = useMemo(() => {
    if (historico) {
      const periodo = getPeriodoHistoricoCompetencias();
      return ciclos.filter(
        (c) => c.data_fim && c.data_fim >= periodo.inicio && c.data_fim <= periodo.fim,
      );
    }
    if (!mesFiltro) return ciclos;
    const periodo = periodoDoMes(mesFiltro);
    if (!periodo) return ciclos;
    return ciclos.filter(c => c.data_fim && c.data_fim >= periodo.inicio && c.data_fim <= periodo.fim);
  }, [ciclos, mesFiltro, historico]);

  const idxMesAtual = MESES_OPCOES.findIndex(m => m.value === mesFiltro);
  function prevMes() {
    if (idxMesAtual < MESES_OPCOES.length - 1) setMesFiltro(MESES_OPCOES[idxMesAtual + 1]?.value ?? "");
  }
  function nextMes() {
    if (idxMesAtual > 0) setMesFiltro(MESES_OPCOES[idxMesAtual - 1]?.value ?? "");
  }
  const { mesData, loadingMes, erroMes, recarregarMes } = useFinanceiroMes(
    filtros,
    podeVerInfluencer,
    user?.role,
    !loadingCatalogos,
  );

  const carregarCiclos = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setLoadError(false);
    try {
    const data = await fetchAllPages<CicloPagamento>(async (from, to) =>
      await supabase
        .from("ciclos_pagamento")
        .select(CICLO_PAGAMENTO_COLS)
        .order("data_inicio", { ascending: false })
        .range(from, to),
    );
    let ciclosExistentes = data;

    // Ciclos a partir de 19/12 (lives iniciaram): qui 18/12 a qua 24/12 é o primeiro
    const PRIMEIRO_CICLO_INICIO = "2025-12-18";
    const baseQuinta = new Date(2025, 11, 18); // 18 dez 2025 (quinta da semana do dia 19)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diffMs = hoje.getTime() - baseQuinta.getTime();
    const semanasAteAgora = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const semanasAhead = Math.max(1, semanasAteAgora + 1); // +1 para incluir a semana atual
    const ciclosProativos = gerarCiclosProativos(baseQuinta, semanasAhead);
    const existentesInicio = new Set(ciclosExistentes.map(c => c.data_inicio));
    const paraInserir = ciclosProativos.filter(c => !existentesInicio.has(c.data_inicio));

    if (paraInserir.length > 0) {
      const { data: inseridos } = await supabase.from("ciclos_pagamento").insert(paraInserir).select(CICLO_PAGAMENTO_COLS);
      if (inseridos?.length) {
        ciclosExistentes = [...ciclosExistentes, ...(inseridos as CicloPagamento[])].sort(
          (a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || "")
        );
      }
    }

    // Fallback: se ainda vazio, criar a partir de lives realizadas (histórico)
    if (ciclosExistentes.length === 0) {
      ciclosExistentes = await criarCiclosAutomaticamente();
    } else {
      const complementados = await complementarCiclos(ciclosExistentes);
      if (complementados.length > 0) {
        ciclosExistentes = [...ciclosExistentes, ...complementados].sort(
          (a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || "")
        );
      }
    }

    // Remove ciclos antes de 19/12 (lives iniciaram nessa data)
    let ciclosFiltrados = ciclosExistentes.filter(c => (c.data_inicio || "") >= PRIMEIRO_CICLO_INICIO);

    // Encerra ciclos expirados antes do filtro de escopo — não depender de admin abrir a página
    ciclosFiltrados = await fecharCiclosExpiradosPendentes(ciclosFiltrados);

    const OPERADORA_PADRAO = "casa_apostas";

    /** Ciclos com lives realizadas + resultado no escopo do usuário (abertos ou expirados ainda não fechados). */
    async function ciclosVisiveisPorLivesNoEscopo(lista: CicloPagamento[]): Promise<CicloPagamento[]> {
      if (lista.length === 0) return [];
      const dataMin = lista.reduce(
        (acc, c) => ((c.data_inicio || "") < acc ? c.data_inicio! : acc),
        lista[0].data_inicio!,
      );
      const dataMax = lista.reduce(
        (acc, c) => ((c.data_fim || "") > acc ? c.data_fim! : acc),
        lista[0].data_fim!,
      );

      const livesEscopo = await fetchAllPages<FinanceiroLiveEscopoRow>(async (from, to) =>
        await supabase
          .from("lives")
          .select("id, data, influencer_id, operadora_slug")
          .eq("status", "realizada")
          .gte("data", dataMin)
          .lte("data", dataMax)
          .range(from, to),
      );
      const liveIds = livesEscopo.map((l) => l.id);
      let resIds = new Set<string>();
      if (liveIds.length > 0) {
        const resData = await fetchLiveResultadosBatched<{ live_id: string }>(liveIds, async (ids) =>
          await supabase.from("live_resultados").select("live_id").in("live_id", ids),
        );
        resIds = new Set(resData.map((r) => String(r.live_id)));
      }

      return lista.filter((c) =>
        livesEscopo.some((l) => {
          const opSlug = l.operadora_slug?.trim() || OPERADORA_PADRAO;
          return (
            l.data >= (c.data_inicio || "") &&
            l.data <= (c.data_fim || "") &&
            resIds.has(String(l.id)) &&
            podeVerInfluencer(l.influencer_id) &&
            podeVerOperadora(opSlug)
          );
        }),
      );
    }

    // Filtro por escopo: influencer, agência e operadora só veem ciclos com pagamento no seu escopo
    if (!escoposVisiveis.semRestricaoEscopo) {
      const fechadosDefinitivos = ciclosFiltrados.filter((c) => !!c.fechado_em);
      const previewOuAbertos = ciclosFiltrados.filter((c) => !c.fechado_em);
      const fechadoIds = fechadosDefinitivos.map(c => c.id);

      const [pags, agts] = await Promise.all([
        fetchInBatched<FinanceiroPagamentoCicloEscopo>(fechadoIds, CICLO_IN_CHUNK, async (slice) => {
          const { data, error } = await supabase
            .from("pagamentos")
            .select("ciclo_id, influencer_id, operadora_slug")
            .in("ciclo_id", slice);
          if (error) throw new Error(error.message);
          return (data ?? []) as FinanceiroPagamentoCicloEscopo[];
        }),
        podeVerPagamentosAgenteFinanceiro(user?.role)
          ? fetchInBatched<FinanceiroAgenteCicloEscopo>(fechadoIds, CICLO_IN_CHUNK, async (slice) => {
              const { data, error } = await supabase
                .from("pagamentos_agentes")
                .select("ciclo_id, operadora_slug")
                .in("ciclo_id", slice);
              if (error) throw new Error(error.message);
              return (data ?? []) as FinanceiroAgenteCicloEscopo[];
            })
          : Promise.resolve([] as FinanceiroAgenteCicloEscopo[]),
      ]);

      const ciclosComPagVisible = new Set<string>();
      for (const p of pags) {
        if (podeVerInfluencer(p.influencer_id) && p.operadora_slug && podeVerOperadora(p.operadora_slug)) {
          ciclosComPagVisible.add(p.ciclo_id);
        }
      }
      for (const a of agts) {
        if (a.operadora_slug && podeVerOperadora(a.operadora_slug)) {
          ciclosComPagVisible.add(a.ciclo_id);
        }
      }

      const ciclosVisiveis = fechadosDefinitivos.filter(c => ciclosComPagVisible.has(c.id));
      const ciclosPorLives = await ciclosVisiveisPorLivesNoEscopo(previewOuAbertos);
      ciclosVisiveis.push(...ciclosPorLives);

      ciclosFiltrados = ciclosVisiveis.sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || ""));
    }

    if (gen !== loadGenRef.current) return;
    setCiclos(ciclosFiltrados);
    } catch (e) {
      console.error("[Financeiro] Erro ao carregar ciclos:", e);
      if (gen !== loadGenRef.current) return;
      setCiclos([]);
      setLoadError(true);
    } finally {
      if (gen === loadGenRef.current) setLoading(false);
    }
  }, [escoposVisiveis, user?.role, podeVerInfluencer, podeVerOperadora]);

  useEffect(() => {
    void carregarCiclos();
  }, [carregarCiclos]);

  const recarregarFinanceiro = useCallback(() => {
    void carregarCiclos();
    void recarregarMes();
  }, [carregarCiclos, recarregarMes]);

  /** Cria ciclos que faltam para datas de lives realizadas não cobertas pelos existentes */
  async function complementarCiclos(existentes: CicloPagamento[]): Promise<CicloPagamento[]> {
    const PRIMEIRO_CICLO = "2025-12-18";
    const lives = await fetchAllPages<{ data: string }>(async (from, to) =>
      await supabase
        .from("lives")
        .select("data")
        .eq("status", "realizada")
        .not("data", "is", null)
        .gte("data", PRIMEIRO_CICLO)
        .range(from, to),
    );
    if (!lives.length) return [];
    const ciclosParaInserir: { data_inicio: string; data_fim: string }[] = [];
    const ciclosInicioSet = new Set(existentes.map(c => c.data_inicio));
    for (const l of lives) {
      const ciclo = cicloSemanalParaData(l.data);
      if (!ciclo || ciclo.data_inicio < PRIMEIRO_CICLO || ciclosInicioSet.has(ciclo.data_inicio)) continue;
      const estaCoberto = existentes.some(c => l.data >= (c.data_inicio || "") && l.data <= (c.data_fim || ""));
      if (!estaCoberto) {
        ciclosInicioSet.add(ciclo.data_inicio);
        ciclosParaInserir.push(ciclo);
      }
    }
    if (ciclosParaInserir.length === 0) return [];
    const { data: inseridos, error } = await supabase.from("ciclos_pagamento").insert(ciclosParaInserir).select(CICLO_PAGAMENTO_COLS);
    if (error) return [];
    return (inseridos ?? []) as CicloPagamento[];
  }

  async function criarCiclosAutomaticamente(): Promise<CicloPagamento[]> {
    const baseQuinta = new Date(2025, 11, 18); // 18 dez 2025 — lives iniciaram em 19/12
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const semanasAteAgora = Math.floor((hoje.getTime() - baseQuinta.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const semanasAhead = Math.max(1, semanasAteAgora + 1);
    const ciclosProativos = gerarCiclosProativos(baseQuinta, semanasAhead);
    const { data: inseridos, error } = await supabase.from("ciclos_pagamento").insert(ciclosProativos).select(CICLO_PAGAMENTO_COLS);
    if (error) {
      console.warn("Não foi possível criar ciclos automaticamente:", error.message);
      return [];
    }
    return (inseridos ?? []).sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || ""));
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "400px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          Carregando…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-page-shell">
        <PageHeader
          icon={<PageMenuIcon pageKey="financeiro" />}
          title={getPageMenuLabel("financeiro")}
          subtitle="Gerencie os ciclos de pagamento dos influencers e afiliados, do rascunho ao pago."
          actions={<AjudaContextualAcoes pageKey="financeiro" />}
        />
        <div
          role="alert"
          aria-live="polite"
          style={getPageContentBoxStyle(brand, t, { padding: 48, textAlign: "center" })}
        >
          <p style={{ fontFamily: FONT_TITLE, fontSize: "18px", fontWeight: 900, color: t.text, marginBottom: "8px" }}>
            Não foi possível carregar o financeiro
          </p>
          <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "16px" }}>
            Os valores desta página não foram carregados — não considere os números como zerados. Se o problema persistir, entre em contato com o suporte.
          </p>
          <button
            type="button"
            onClick={() => { void carregarCiclos(); void recarregarMes(); }}
            style={{
              padding: "10px 20px", borderRadius: "10px", border: "none",
              background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (ciclos.length === 0) {
    return (
      <div className="app-page-shell">
        <PageHeader
          icon={<PageMenuIcon pageKey="financeiro" />}
          title={getPageMenuLabel("financeiro")}
          subtitle="Gerencie os ciclos de pagamento dos influencers e afiliados, do rascunho ao pago."
          actions={<AjudaContextualAcoes pageKey="financeiro" />}
        />
        <div style={getPageContentBoxStyle(brand, t, { padding: 48, textAlign: "center" })}>
          <p style={{ fontFamily: FONT_TITLE, fontSize: "18px", fontWeight: 900, color: t.text, marginBottom: "8px" }}>
            {roleParidadeInfluencer(user?.role) ? "Nenhum pagamento cadastrado" : "Nenhum ciclo cadastrado"}
          </p>
          {roleParidadeInfluencer(user?.role) ? (
            <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "16px" }}>
              Os ciclos são criados automaticamente. Caso tenha realizado lives recentemente e os dados não apareçam, aguarde até 24h ou entre em contato com a equipe.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "8px" }}>
                Nenhum ciclo encontrado. Os ciclos são gerados automaticamente a cada semana (quinta a quarta).
              </p>
              <details style={{ marginTop: 8, textAlign: "left", maxWidth: 520, marginInline: "auto" }}>
                <summary style={{ fontSize: 12, color: t.textMuted, cursor: "pointer", fontFamily: FONT.body }}>
                  Detalhes técnicos
                </summary>
                <p style={{ fontSize: 12, color: t.textMuted, fontFamily: "monospace", marginTop: 8 }}>
                  Verificar permissões de INSERT em ciclos_pagamento no Supabase.
                </p>
              </details>
            </>
          )}
          <button
            type="button"
            onClick={() => { carregarCiclos(); }}
            style={{
              padding: "10px 20px", borderRadius: "10px", border: "none",
              background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="financeiro" />}
        title={getPageMenuLabel("financeiro")}
        subtitle="Gerencie os ciclos de pagamento dos influencers e afiliados, do rascunho ao pago."
      />

      {/* Bloco de filtros (similar Agenda) */}
      <div style={getPageFilterBoxStyle(brand, t)}>
          <div className="app-filter-bar-tabs-cta">
          <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
          <div className="app-filter-bar-tabs-cta__tabs" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={prevMes}
              style={getCarouselBtnNavStyle(t, idxMesAtual >= MESES_OPCOES.length - 1)}
              disabled={idxMesAtual >= MESES_OPCOES.length - 1}
              title="Mês anterior"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={getCarouselPeriodLabelStyle(t)}>
              {historico ? "Todo o período" : (MESES_OPCOES.find(m => m.value === mesFiltro)?.label ?? mesFiltro)}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={nextMes}
              style={getCarouselBtnNavStyle(t, idxMesAtual <= 0)}
              disabled={idxMesAtual <= 0}
              title="Próximo mês"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>

            <FiltroHistoricoButton active={historico} onClick={() => setHistorico((h) => !h)} />

            {showFiltroInfluencer && influencerListVisiveis.length > 0 && (
              <FiltroInfluencerSelect
                mode="multiple"
                value={filterInfluencers}
                onChange={setFilterInfluencers}
                influencers={influencerListVisiveis}
              />
            )}

            {showFiltroOperadora && operadorasList.length > 0 && (
              <FiltroOperadoraSelect
                pill
                minWidth={200}
                value={filterOperadora}
                onChange={setFilterOperadora}
                operadoras={operadorasList}
                podeVerOperadora={podeVerOperadora}
              />
            )}
          </div>
          <div className="app-filter-bar-tabs-cta__actions">
            <AjudaContextualAcoes pageKey="financeiro" />
          </div>
          </div>
      </div>

      {erroMes && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            ...getPageContentBoxStyle(brand, t, { padding: "12px 16px" }),
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          Não foi possível carregar os valores do período — os totais abaixo não refletem a realidade. Se o problema persistir, entre em contato com o suporte.
        </div>
      )}

      <BlocoKpis mesData={mesData} loadingMes={loadingMes} />
      <BlocoCiclos ciclos={ciclosFiltradosPorMes} onRecarregar={recarregarFinanceiro} filtros={filtros} />
      <BlocoConsolidado mesData={mesData} loadingMes={loadingMes} />
    </div>
  );
}