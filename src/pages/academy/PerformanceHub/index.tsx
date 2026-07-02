import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import type {
  PerformanceHubAvaliacao,
  PerformanceHubModalModo,
  PerformanceHubScoringConfig,
  PerformanceHubTab,
  PerformanceHubTimeSlug,
} from "../../../lib/academyPerformanceHubTypes";
import {
  PERFORMANCE_HUB_SCORING_DEFAULT,
} from "../../../lib/academyPerformanceHubScoring";
import { usePerformanceHubCadastro } from "../../../hooks/usePerformanceHubCadastro";
import {
  PERFORMANCE_HUB_AGENDA_MOCK,
  PERFORMANCE_HUB_AVALIACOES_MOCK,
} from "../../../lib/academyPerformanceHubMockData";
import { PERFORMANCE_HUB_TIME_DEFAULT } from "../../../lib/academyPerformanceHubConstants";
import { PerformanceHubFiltroBar } from "./PerformanceHubFiltroBar";
import { PerformanceHubAbaAvaliacoes } from "./PerformanceHubAbaAvaliacoes";
import { PerformanceHubAbaGerenciamento } from "./PerformanceHubAbaGerenciamento";
import { PerformanceHubAbaConfiguracao } from "./PerformanceHubAbaConfiguracao";
import { ModalAvaliarPerformanceHub, type PerformanceHubAvaliacaoFormPayload } from "./ModalAvaliarPerformanceHub";

type MesCarrossel = {
  ano: number;
  mes: number;
  label: string;
};

function parseDateBr(value: string): Date | null {
  const [dia, mes, ano] = value.split("/");
  const d = Number(dia);
  const m = Number(mes);
  const y = Number(ano);
  if (!d || !m || !y) return null;
  const parsed = new Date(y, m - 1, d);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildMesesCarrossel(rows: PerformanceHubAvaliacao[], time: PerformanceHubTimeSlug): MesCarrossel[] {
  const keys = new Set<string>();
  for (const row of rows) {
    if (row.time !== time) continue;
    const parsed = parseDateBr(row.data);
    if (!parsed) continue;
    keys.add(`${parsed.getFullYear()}-${parsed.getMonth()}`);
  }
  const entries = [...keys].map((key) => {
    const [ano, mes] = key.split("-").map(Number);
    const raw = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { ano, mes, label: raw.charAt(0).toUpperCase() + raw.slice(1) };
  });
  entries.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  if (entries.length > 0) return entries;
  const now = new Date();
  const raw = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return [{ ano: now.getFullYear(), mes: now.getMonth(), label: raw.charAt(0).toUpperCase() + raw.slice(1) }];
}

function cloneScoringDefault(): PerformanceHubScoringConfig {
  return JSON.parse(JSON.stringify(PERFORMANCE_HUB_SCORING_DEFAULT)) as PerformanceHubScoringConfig;
}

function isAvaliacaoNoMes(row: PerformanceHubAvaliacao, mes: MesCarrossel | undefined): boolean {
  if (!mes) return false;
  const parsed = parseDateBr(row.data);
  if (!parsed) return false;
  return parsed.getFullYear() === mes.ano && parsed.getMonth() === mes.mes;
}

function initialTab(
  canEditarOk: boolean,
  canCriarOk: boolean,
  current: PerformanceHubTab,
): PerformanceHubTab {
  if (current === "gerenciamento" && !canEditarOk) return "avaliacoes";
  if (current === "configuracao" && !canCriarOk) return canEditarOk ? "gerenciamento" : "avaliacoes";
  return current;
}

export default function PerformanceHubPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("academy_performance_hub");
  const cadastro = usePerformanceHubCadastro();
  const [aba, setAba] = useRouteTab(
    "academy_performance_hub",
    "avaliacoes",
    ["avaliacoes", "gerenciamento", "configuracao"] as const,
  );

  const [historico, setHistorico] = useState(false);
  const [timeSelecionado, setTimeSelecionado] = useState<PerformanceHubTimeSlug>(PERFORMANCE_HUB_TIME_DEFAULT);
  const [staffSelecionado, setStaffSelecionado] = useState<string[]>([]);
  const [idxMes, setIdxMes] = useState(0);
  const [scoringConfig, setScoringConfig] = useState<PerformanceHubScoringConfig>(() => cloneScoringDefault());
  const [avaliacoes, setAvaliacoes] = useState<PerformanceHubAvaliacao[]>(PERFORMANCE_HUB_AVALIACOES_MOCK);
  const [avaliacaoEmEdicao, setAvaliacaoEmEdicao] = useState<PerformanceHubAvaliacao | null>(null);
  const [modalModo, setModalModo] = useState<PerformanceHubModalModo>("ver");

  useEffect(() => {
    if (perm.loading) return;
    const next = initialTab(perm.canEditarOk, perm.canCriarOk, aba);
    if (next !== aba) setAba(next);
  }, [perm.loading, perm.canEditarOk, perm.canCriarOk, aba, setAba]);

  const mesesCarrossel = useMemo(
    () => buildMesesCarrossel(avaliacoes, timeSelecionado),
    [avaliacoes, timeSelecionado],
  );

  useEffect(() => {
    setIdxMes((prev) => Math.min(prev, Math.max(0, mesesCarrossel.length - 1)));
  }, [mesesCarrossel]);

  useEffect(() => {
    const staffList = cadastro.staffOptionsPorTime(timeSelecionado);
    if (staffSelecionado.length === 0) return;
    const selected = staffSelecionado[0];
    if (!staffList.some((item) => item.value === selected)) setStaffSelecionado([]);
  }, [timeSelecionado, staffSelecionado, cadastro]);

  const mesSelecionado = mesesCarrossel[idxMes];

  const avaliacoesFiltradas = useMemo(() => {
    const staffList = cadastro.staffOptionsPorTime(timeSelecionado);
    const selectedStaff = staffSelecionado[0];
    const selectedStaffName = selectedStaff
      ? staffList.find((s) => s.value === selectedStaff)?.label ?? ""
      : "";
    return avaliacoes.filter((row) => {
      if (row.time !== timeSelecionado) return false;
      if (!historico && !isAvaliacaoNoMes(row, mesSelecionado)) return false;
      if (selectedStaffName && row.avaliadoNome !== selectedStaffName) return false;
      return true;
    });
  }, [avaliacoes, timeSelecionado, historico, mesSelecionado, staffSelecionado, cadastro]);

  const agendaFiltrada = useMemo(() => {
    const staffList = cadastro.staffOptionsPorTime(timeSelecionado);
    const selectedStaff = staffSelecionado[0];
    const selectedStaffName = selectedStaff
      ? staffList.find((s) => s.value === selectedStaff)?.label ?? ""
      : "";
    return PERFORMANCE_HUB_AGENDA_MOCK.filter((row) => {
      if (row.time !== timeSelecionado) return false;
      if (selectedStaffName && row.nome !== selectedStaffName) return false;
      return true;
    });
  }, [timeSelecionado, staffSelecionado, cadastro]);

  const staffOptions = useMemo(
    () =>
      cadastro.staffOptionsPorTime(timeSelecionado).map((item) => ({
        id: item.value,
        name: `${item.label} (${item.turno})`,
      })),
    [cadastro, timeSelecionado],
  );

  function aplicarPayload(row: PerformanceHubAvaliacao, payload: PerformanceHubAvaliacaoFormPayload): PerformanceHubAvaliacao {
    return {
      ...row,
      tipoAvaliacao: payload.tipoAvaliacao,
      turno: payload.turno,
      estudioId: payload.estudioId,
      jogo: payload.jogo,
      mesaId: payload.mesaId,
      pontosFortes: payload.pontosFortes,
      pontosDesenvolver: payload.pontosDesenvolver,
      criterios: payload.criterios,
      notaTotal: payload.notaTotal,
      notaImagem: payload.notaImagem,
      notaComunicacao: payload.notaComunicacao,
      notaMesa: payload.notaMesa,
      videoUrl: payload.videoUrl,
      videoNome: payload.videoNome,
    };
  }

  function handleVerAvaliacao(row: PerformanceHubAvaliacao) {
    setModalModo("ver");
    setAvaliacaoEmEdicao(row);
  }

  function handleAnalisarAvaliacao(row: PerformanceHubAvaliacao) {
    setModalModo("analisar");
    setAvaliacaoEmEdicao(row);
  }

  function handleAbrirAvaliacao(row: PerformanceHubAvaliacao) {
    handleAnalisarAvaliacao(row);
  }

  function handleSolicitarAvaliacaoPorNome(nome: string) {
    const existente = avaliacoes.find((row) => row.time === timeSelecionado && row.avaliadoNome === nome);
    if (existente) {
      handleAnalisarAvaliacao(existente);
      return;
    }
    const staffId = cadastro.resolveStaffId(nome);
    const nova: PerformanceHubAvaliacao = {
      id: `novo-${Date.now()}`,
      data: new Date().toLocaleDateString("pt-BR"),
      time: timeSelecionado,
      avaliadoNome: nome,
      avaliadoStaffId: staffId,
      avaliadorNome: user?.name ?? "Performance Coach",
      status: "em_analise",
      notaTotal: null,
      notaImagem: null,
      notaComunicacao: null,
      notaMesa: null,
      tipoAvaliacao: null,
      turno: null,
      estudioId: null,
      jogo: null,
      mesaId: null,
      pontosFortes: null,
      pontosDesenvolver: null,
      criterios: undefined,
      videoUrl: null,
      videoNome: null,
    };
    setAvaliacoes((prev) => [nova, ...prev]);
    handleAnalisarAvaliacao(nova);
  }

  if (perm.loading) {
    return (
      <div
        className="app-page-shell"
        style={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted }}
      >
        <div style={{ textAlign: "center", fontFamily: FONT.body }}>
          <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          <div style={{ marginTop: 10, fontSize: 13 }}>Carregando…</div>
        </div>
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
    <div className="app-page-shell app-page-shell--pb64" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <PageHeader
        icon={<PageMenuIcon pageKey="academy_performance_hub" />}
        title={getPageMenuLabel("academy_performance_hub")}
        subtitle="Portal de avaliação de desempenho dos Prestadores."
      />

      <PerformanceHubFiltroBar
        brand={brand}
        t={t}
        aba={aba}
        onSelectAba={setAba}
        historico={historico}
        onToggleHistorico={() => setHistorico((prev) => !prev)}
        labelCarrossel={historico ? "Todo o período" : (mesSelecionado?.label ?? "—")}
        carrosselAnteriorDisabled={historico || idxMes <= 0}
        carrosselProximoDisabled={historico || idxMes >= mesesCarrossel.length - 1}
        onCarrosselAnterior={() => setIdxMes((prev) => Math.max(0, prev - 1))}
        onCarrosselProximo={() => setIdxMes((prev) => Math.min(mesesCarrossel.length - 1, prev + 1))}
        timeSelecionado={timeSelecionado}
        onSelecionarTime={setTimeSelecionado}
        staffItems={staffOptions}
        staffSelecionado={staffSelecionado}
        onSelecionarStaff={setStaffSelecionado}
        canEditarOk={perm.canEditarOk}
        canCriarOk={perm.canCriarOk}
      />

      <div role="tabpanel" id={`panel-performance-hub-${aba}`} aria-labelledby={`tab-performance-hub-${aba}`}>
        {aba === "avaliacoes" ? (
          <PerformanceHubAbaAvaliacoes
            avaliacoes={avaliacoesFiltradas}
            canEditar={perm.canEditar}
            roleUsuario={user?.role ?? "prestador"}
            onVer={handleVerAvaliacao}
            onAnalisar={handleAnalisarAvaliacao}
          />
        ) : null}

        {aba === "gerenciamento" && perm.canEditarOk ? (
          <PerformanceHubAbaGerenciamento
            avaliacoes={avaliacoesFiltradas}
            agenda={agendaFiltrada}
            onAvaliar={handleAbrirAvaliacao}
            onAvaliarPorNome={handleSolicitarAvaliacaoPorNome}
          />
        ) : null}

        {aba === "configuracao" && perm.canCriarOk ? (
          <PerformanceHubAbaConfiguracao
            config={scoringConfig}
            onChange={setScoringConfig}
            onSalvar={() => undefined}
          />
        ) : null}
      </div>

      {avaliacaoEmEdicao ? (
        <ModalAvaliarPerformanceHub
          avaliacao={avaliacaoEmEdicao}
          config={scoringConfig}
          modo={modalModo}
          estudios={cadastro.estudios}
          mesas={cadastro.mesas}
          getPrefill={cadastro.getPrefill}
          onClose={() => setAvaliacaoEmEdicao(null)}
          onSalvar={(payload) => {
            const atualizado = aplicarPayload(avaliacaoEmEdicao, payload);
            setAvaliacoes((prev) => prev.map((row) => (row.id === avaliacaoEmEdicao.id ? atualizado : row)));
            setAvaliacaoEmEdicao(atualizado);
          }}
          onConcluir={(payload) => {
            setAvaliacoes((prev) =>
              prev.map((row) =>
                row.id === avaliacaoEmEdicao.id ? { ...aplicarPayload(row, payload), status: "concluida" } : row,
              ),
            );
            setAvaliacaoEmEdicao(null);
          }}
        />
      ) : null}
    </div>
  );
}
