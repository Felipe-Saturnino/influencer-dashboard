import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Loader2, ExternalLink, Wrench } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { getPageFilterBoxStyle, getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import {
  FiltroBarTabButton,
  FiltroHistoricoButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
  SectionTitle,
} from "../../../components/dashboard";
import type { EstoqueFornecedorRow } from "../../../lib/techOpsEstoque";
import {
  buildMesesOrdemSaida,
  chaveEstudioOs,
  fetchFornecedoresOs,
  fetchItensDisponiveisOs,
  fetchItensManutencaoOs,
  fetchOrdensSaida,
  OS_LOCAIS_FIXOS,
  OS_STATUS_COLOR,
  ordemVisivelNoMes,
  type OrdemSaidaRow,
  type OrdemSaidaStatus,
  type OsItemDisponivel,
} from "../../../lib/techOpsOrdemSaida";
import { KpiOsCard } from "./ordemSaidaUi";
import { AbaInterna } from "./AbaInterna";
import { AbaExterna } from "./AbaExterna";
import { AbaManutencao } from "./AbaManutencao";

type AbaOs = "interna" | "externa" | "manutencao";
type StatusFiltro = "" | OrdemSaidaStatus;

const ABAS: readonly AbaOs[] = ["interna", "externa", "manutencao"];

const ERRO_CARREGAR =
  "Não foi possível carregar as ordens de saída. Se o problema persistir, entre em contato com o suporte.";

const BUSCA_PLACEHOLDER =
  "Pesquisar por código, origem, destino, fornecedor ou solicitante...";

const KPI_COR = {
  total: "var(--brand-primary, #7c3aed)",
  solicitada: OS_STATUS_COLOR.solicitada,
  aberta: OS_STATUS_COLOR.aberta,
  concluida: OS_STATUS_COLOR.concluida,
  cancelada: OS_STATUS_COLOR.cancelada,
} as const;

export default function TechOpsOrdemSaida() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("tech_ops_ordem_saida");
  const [aba, setAba] = useRouteTab<AbaOs>("tech_ops_ordem_saida", "interna", ABAS);

  const meses = useMemo(() => buildMesesOrdemSaida(), []);
  const [mesIdx, setMesIdx] = useState(() => Math.max(0, meses.length - 1));
  const [historico, setHistorico] = useState(false);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("");

  const [rows, setRows] = useState<OrdemSaidaRow[]>([]);
  const [itensDisponiveis, setItensDisponiveis] = useState<OsItemDisponivel[]>([]);
  const [itensManutencao, setItensManutencao] = useState<OsItemDisponivel[]>([]);
  const [fornecedores, setFornecedores] = useState<EstoqueFornecedorRow[]>([]);
  const [estudios, setEstudios] = useState<{ slug: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const podeVer = perm.canView === "sim" || perm.canView === "proprios";
  const userName = user?.name?.trim() || "Usuário";

  const mesAtual = meses[mesIdx] ?? meses[meses.length - 1];
  const mesKey = mesAtual?.key ?? "";
  const competenciaPreview = mesAtual?.competencia ?? `${mesKey}-01`;

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [os, itens, itensMan, forn] = await Promise.all([
        fetchOrdensSaida(),
        fetchItensDisponiveisOs(),
        fetchItensManutencaoOs(),
        fetchFornecedoresOs(),
      ]);
      setRows(os);
      setItensDisponiveis(itens);
      setItensManutencao(itensMan);
      setFornecedores(forn);
    } catch (e) {
      console.error("Ordem de Saída: falha ao carregar dados", e);
      setErro(ERRO_CARREGAR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (perm.loading || !podeVer) return;
    void carregar();
    void supabase
      .from("estudios_spin")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Ordem de Saída: falha ao carregar estúdios", error);
          return;
        }
        setEstudios((data ?? []).map((e: { slug: string; nome: string }) => ({ slug: e.slug, nome: e.nome })));
      });
  }, [perm.loading, podeVer, carregar]);

  const estudioNomePorSlug = useMemo(
    () => Object.fromEntries(estudios.map((e) => [e.slug, e.nome])),
    [estudios],
  );

  const locaisOptions = useMemo(
    () => [
      ...OS_LOCAIS_FIXOS.map((l) => ({ chave: l.chave as string, label: l.label })),
      ...estudios.map((e) => ({ chave: chaveEstudioOs(e.slug), label: e.nome })),
    ],
    [estudios],
  );

  const rowsDaAba = useMemo(() => rows.filter((r) => r.tipo === aba), [rows, aba]);

  const rowsNoMes = useMemo(
    () => rowsDaAba.filter((r) => ordemVisivelNoMes(r, mesKey, historico)),
    [rowsDaAba, mesKey, historico],
  );

  const kpis = useMemo(() => {
    const contagem = { solicitada: 0, aberta: 0, concluida: 0, cancelada: 0 };
    for (const r of rowsNoMes) contagem[r.status] += 1;
    return {
      total: rowsNoMes.length,
      ...contagem,
    };
  }, [rowsNoMes]);

  const toggleHistorico = () => {
    setHistorico((h) => {
      if (h) setMesIdx(meses.length - 1);
      return !h;
    });
  };

  const kpiClick = (s: StatusFiltro) => () => setStatusFiltro((prev) => (prev === s ? "" : s));

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

  const tabs: { id: AbaOs; label: string; icon: ReactNode }[] = [
    { id: "interna", label: "O.S. Interna", icon: <ArrowLeftRight {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "externa", label: "O.S. Externa", icon: <ExternalLink {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "manutencao", label: "O.S. Manutenção", icon: <Wrench {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];

  const pageBox = getPageContentBoxStyle(brand, t);
  const carrosselPrimeiro = mesIdx === 0;
  const carrosselUltimo = mesIdx === meses.length - 1;

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="tech_ops_ordem_saida" />}
        title={getPageMenuLabel("tech_ops_ordem_saida")}
        subtitle={getPageCanonicalSubtitle("tech_ops_ordem_saida")}
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
        <div style={getFilterBarRowStyle({ width: "100%" })}>
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
        </div>

        <div
          role="tablist"
          aria-label="Tipos de ordem de saída"
          style={getFilterBarRowStyle({ width: "100%", marginTop: 10 })}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(
              e,
              tabs.map((tb) => tb.id),
              setAba,
              (k) => `tab-os-${k}`,
            )
          }
        >
          {tabs.map((tb) => (
            <FiltroBarTabButton
              key={tb.id}
              id={`tab-os-${tb.id}`}
              active={aba === tb.id}
              aria-controls={`panel-os-${tb.id}`}
              onClick={() => setAba(tb.id)}
              icon={tb.icon}
            >
              {tb.label}
            </FiltroBarTabButton>
          ))}
        </div>

        <div style={getFilterBarRowStyle({ width: "100%", marginTop: 10 })}>
          <BarraPesquisaPagina
            value={busca}
            onChange={setBusca}
            placeholder={BUSCA_PLACEHOLDER}
            aria-label="Buscar ordens de saída"
            wrapperStyle={{ flex: "1 1 260px", maxWidth: 420 }}
          />
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
          <div style={pageBox}>
            <SectionTitle sub="clique em um card para filtrar por status">KPIs Consolidados</SectionTitle>
            <div
              className="app-grid-kpi-5"
              style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}
            >
              <KpiOsCard
                label="Total de OS"
                valor={kpis.total}
                cor={KPI_COR.total}
                active={statusFiltro === ""}
                onClick={() => setStatusFiltro("")}
                hint="Todas as ordens do período"
              />
              <KpiOsCard
                label="Solicitadas"
                valor={kpis.solicitada}
                cor={KPI_COR.solicitada}
                active={statusFiltro === "solicitada"}
                onClick={kpiClick("solicitada")}
                hint="Aguardando atendimento"
              />
              <KpiOsCard
                label="Abertas"
                valor={kpis.aberta}
                cor={KPI_COR.aberta}
                active={statusFiltro === "aberta"}
                onClick={kpiClick("aberta")}
                hint="Saída realizada, sem retorno"
              />
              <KpiOsCard
                label="Concluídas"
                valor={kpis.concluida}
                cor={KPI_COR.concluida}
                active={statusFiltro === "concluida"}
                onClick={kpiClick("concluida")}
                hint="Retorno realizado / encerrada"
              />
              <KpiOsCard
                label="Canceladas"
                valor={kpis.cancelada}
                cor={KPI_COR.cancelada}
                active={statusFiltro === "cancelada"}
                onClick={kpiClick("cancelada")}
                hint="Ordens canceladas no período"
              />
            </div>
          </div>

          <div role="tabpanel" id="panel-os-interna" aria-labelledby="tab-os-interna" hidden={aba !== "interna"}>
            <AbaInterna
              rows={rows}
              loading={loading}
              busca={busca}
              statusFiltro={statusFiltro}
              mesKey={mesKey}
              historico={historico}
              estudioNomePorSlug={estudioNomePorSlug}
              locaisOptions={locaisOptions}
              itensDisponiveis={itensDisponiveis}
              competenciaPreview={competenciaPreview}
              perm={perm}
              onReload={() => void carregar()}
              userName={userName}
            />
          </div>
          <div role="tabpanel" id="panel-os-externa" aria-labelledby="tab-os-externa" hidden={aba !== "externa"}>
            <AbaExterna
              rows={rows}
              loading={loading}
              busca={busca}
              statusFiltro={statusFiltro}
              mesKey={mesKey}
              historico={historico}
              estudioNomePorSlug={estudioNomePorSlug}
              itensDisponiveis={itensDisponiveis}
              competenciaPreview={competenciaPreview}
              perm={perm}
              onReload={() => void carregar()}
              userName={userName}
            />
          </div>
          <div
            role="tabpanel"
            id="panel-os-manutencao"
            aria-labelledby="tab-os-manutencao"
            hidden={aba !== "manutencao"}
          >
            <AbaManutencao
              rows={rows}
              loading={loading}
              busca={busca}
              statusFiltro={statusFiltro}
              mesKey={mesKey}
              historico={historico}
              estudioNomePorSlug={estudioNomePorSlug}
              fornecedores={fornecedores}
              itensManutencao={itensManutencao}
              competenciaPreview={competenciaPreview}
              perm={perm}
              onReload={() => void carregar()}
              userName={userName}
            />
          </div>
        </>
      )}
    </div>
  );
}
