import { useCallback, useEffect, useMemo, useState } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros"
import { usePermission } from "../../../hooks/usePermission"
import { FONT } from "../../../constants/theme"
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles"
import { FONT_TITLE } from "../../../lib/dashboardConstants"
import { supabase } from "../../../lib/supabase"
import { FiltroInfluencerSelect, FiltroHistoricoButton, FiltroOperadoraSelect } from "../../../components/dashboard"
import { PageHeader } from "../../../components/PageHeader"
import { PageMenuIcon } from "../../../components/PageMenuIcon"
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { getPageFilterBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles"
import { ROLES_PARIDADE_INFLUENCER, roleParidadeInfluencer } from "../../../lib/staffRoles"
import { fmtMoeda, gerarMeses, periodoDoMes, rowPassaFiltrosKpiBanca } from "./bancaJogoHelpers"
import type { BancaPerfilMapRow, BancaRowDb, BancaStatusConta } from "./bancaJogoTypes"
import { STATUS_BANCA } from "./bancaJogoTypes"
import type { BlocoFiltros } from "./bancaJogoFiltros"
import { BlocoSolicitacoes } from "./BlocoSolicitacoes"
import { BlocoConsolidadoBanca } from "./BlocoConsolidadoBanca"

export default function BancaJogo() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("banca_jogo");
  const {
    showFiltroInfluencer,
    showFiltroOperadora,
    podeVerInfluencer,
    podeVerOperadora,
    escoposVisiveis: ev,
    operadoraSlugsForcado,
  } = useDashboardFiltros();

  const [ciclosRows, setCiclosRows] = useState<BancaRowDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterInfluencers, setFilterInfluencers] = useState<string[]>([]);
  const [filterOperadora, setFilterOperadora] = useState("todas");
  const [influencerList, setInfluencerList] = useState<{ id: string; name: string }[]>([]);
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [perfilMap, setPerfilMap] = useState<Record<string, BancaPerfilMapRow>>({});

  const MESES_OPCOES = useMemo(() => gerarMeses().slice(1), []);
  const [mesFiltro, setMesFiltro] = useState(MESES_OPCOES[0]?.value ?? "");
  const [historico, setHistorico] = useState(false);

  const influencerListVisiveis = useMemo(
    () => influencerList.filter((i) => podeVerInfluencer(i.id)),
    [influencerList, podeVerInfluencer],
  );

  const agenciaParesInfIds = useMemo(() => {
    if (user?.role !== "agencia") return null;
    const ids = new Set<string>();
    for (const s of ev?.influencersVisiveis ?? []) ids.add(s);
    return ids;
  }, [user?.role, ev?.influencersVisiveis]);

  const influencerListAgenciaModal = useMemo(() => {
    if (user?.role !== "agencia") return [];
    return influencerListVisiveis.filter((i) => !agenciaParesInfIds || agenciaParesInfIds.has(i.id));
  }, [user?.role, influencerListVisiveis, agenciaParesInfIds]);

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
    operadorasList,
    mesFiltro: historico ? "" : mesFiltro,
    historico,
  }), [podeVerInfluencer, podeVerOperadora, filterInfluencers, filterOperadoraEfetivo, filtroOp, operadorasList, mesFiltro, historico]);

  const kpisBanca = useMemo(() => {
    const periodo = filtros.historico ? null : periodoDoMes(filtros.mesFiltro);
    let solicitado = 0;
    let aprovado = 0;
    let pago = 0;
    for (const r of ciclosRows) {
      if (!rowPassaFiltrosKpiBanca(r, filtros, periodo, filtros.historico)) continue;
      const v = Number(r.valor) || 0;
      if (r.status === "solicitado") solicitado += v;
      else if (r.status === "aprovado") aprovado += v;
      else if (r.status === "liberado") pago += v;
    }
    return { solicitado, aprovado, pago };
  }, [ciclosRows, filtros]);

  const idxMesAtual = MESES_OPCOES.findIndex((m) => m.value === mesFiltro);
  function prevMes() {
    if (idxMesAtual < MESES_OPCOES.length - 1) setMesFiltro(MESES_OPCOES[idxMesAtual + 1]?.value ?? "");
  }
  function nextMes() {
    if (idxMesAtual > 0) setMesFiltro(MESES_OPCOES[idxMesAtual - 1]?.value ?? "");
  }

  async function carregarDados() {
    setLoading(true);
    const { data } = await supabase.from("banca_jogo_solicitacoes").select("*").order("solicitado_em", { ascending: false });
    setCiclosRows((data ?? []) as BancaRowDb[]);
    setLoading(false);
  }

  useEffect(() => { void carregarDados(); }, []);

  useEffect(() => {
    void supabase.from("profiles").select("id, name").in("role", [...ROLES_PARIDADE_INFLUENCER]).then(({ data }) => {
      if (data) setInfluencerList(data);
    });
  }, []);

  useEffect(() => {
    void supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome").then(({ data }) => {
      if (data) setOperadorasList(data);
    });
  }, []);

  const carregarPerfis = useCallback(async () => {
    const { data: perfis } = await supabase
      .from("influencer_perfil")
      .select("id, nome_artistico, cpf, banca_status_conta, banca_data_bloqueio, banca_data_desbloqueio, status");
    const { data: emails } = await supabase.from("profiles").select("id, email").in("role", [...ROLES_PARIDADE_INFLUENCER]);
    const emailM: Record<string, string> = {};
    for (const e of emails ?? []) emailM[(e as { id: string }).id] = (e as { email: string }).email;
    const m: Record<string, BancaPerfilMapRow> = {};
    for (const p of perfis ?? []) {
      const row = p as {
        id: string;
        nome_artistico?: string;
        cpf?: string;
        banca_status_conta?: string | null;
        banca_data_bloqueio?: string | null;
        banca_data_desbloqueio?: string | null;
        status?: string | null;
      };
      const conta: BancaStatusConta = row.banca_status_conta === "bloqueada" ? "bloqueada" : "liberada";
      m[row.id] = {
        nome: row.nome_artistico ?? emailM[row.id] ?? row.id,
        cpf: row.cpf ?? "",
        email: emailM[row.id] ?? "",
        banca_status_conta: conta,
        banca_data_bloqueio: row.banca_data_bloqueio ?? null,
        banca_data_desbloqueio: row.banca_data_desbloqueio ?? null,
        perfil_status: row.status ?? null,
      };
    }
    setPerfilMap(m);
  }, []);

  useEffect(() => { void carregarPerfis(); }, [carregarPerfis]);

  const staffPodeAcao =
    !!user &&
    !roleParidadeInfluencer(user.role) &&
    user.role !== "agencia" &&
    perm.canEditarOk;

  const staffPodeAprovar = staffPodeAcao && user?.role !== "operador";

  /** can_excluir da Gestão de Usuários: sim ou proprios, respeitando escopo influencer + operadora da linha. */
  const podeExcluirLinha = useCallback((r: BancaRowDb) => {
    if (!user || !perm.canExcluirOk) return false;
    const ce = perm.canExcluir;
    if (ce !== "sim" && ce !== "proprios") return false;
    return podeVerInfluencer(r.influencer_id) && podeVerOperadora(r.operadora_slug);
  }, [user, perm.canExcluirOk, perm.canExcluir, podeVerInfluencer, podeVerOperadora]);

  if (perm.loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 10, color: t.textMuted, fontFamily: FONT.body }}>
        <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
        Carregando…
      </div>
    );
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 10, color: t.textMuted, fontFamily: FONT.body }}>
        <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
        Carregando…
      </div>
    );
  }

  const perfilMapSolicitacoes = perfilMap;

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="banca_jogo" />}
        title={getPageMenuLabel("banca_jogo")}
        subtitle="Solicite, aprove e libere bancas de jogo por parceiro e operadora."
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
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
              {historico ? "Todo o período" : (MESES_OPCOES.find((m) => m.value === mesFiltro)?.label ?? mesFiltro)}
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
      </div>

      <div className="app-grid-kpi-3" style={{ ...getPageKpiSectionGapStyle(), width: "100%", gap: 14 }}>
          {[
            { label: "R$ Solicitado", total: kpisBanca.solicitado, color: STATUS_BANCA.solicitado.color },
            { label: "R$ Aprovado", total: kpisBanca.aprovado, color: STATUS_BANCA.aprovado.color },
            { label: "R$ Pago", total: kpisBanca.pago, color: STATUS_BANCA.liberado.color },
          ].map((k) => (
            <div
              key={k.label}
              aria-label={`${k.label}: ${fmtMoeda(k.total)}`}
              style={{
                borderRadius: 14,
                border: `1px solid ${t.cardBorder}`,
                borderLeft: `3px solid ${k.color}`,
                background: brand.blockBg,
                padding: "16px 18px",
                boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {k.label}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: k.color,
                  fontFamily: FONT_TITLE,
                  marginTop: 6,
                }}
              >
                {fmtMoeda(k.total)}
              </div>
            </div>
          ))}
      </div>

      <BlocoSolicitacoes
        filtros={filtros}
        rowsDb={ciclosRows}
        perfilMap={perfilMapSolicitacoes}
        staffPodeAcao={staffPodeAcao}
        staffPodeAprovar={staffPodeAprovar}
        podeExcluirLinha={podeExcluirLinha}
        onRecarregar={carregarDados}
        onPerfisAtualizados={() => void carregarPerfis()}
        influencerListAgencia={influencerListAgenciaModal}
        nomeUsuario={user?.name ?? ""}
      />

      <BlocoConsolidadoBanca
        filtros={filtros}
        rowsDb={ciclosRows}
        perfilMap={perfilMap}
        podeEditarStatusConta={staffPodeAcao}
        onPerfisAtualizados={() => void carregarPerfis()}
      />
    </div>
  );
}
