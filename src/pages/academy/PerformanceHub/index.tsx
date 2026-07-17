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
  PerformanceHubScoringPorTime,
  PerformanceHubTab,
  PerformanceHubTimeSlug,
} from "../../../lib/academyPerformanceHubTypes";
import {
  cloneScoringPorTime,
  scoringConfigParaTime,
} from "../../../lib/academyPerformanceHubScoring";
import { normalizarTextoBusca } from "../../../lib/searchText";
import { getPeriodoHistoricoCompetencias } from "../../../lib/dashboardHelpers";
import { usePerformanceHubCadastro } from "../../../hooks/usePerformanceHubCadastro";
import { usePerformanceHubAvaliacoes } from "../../../hooks/usePerformanceHubAvaliacoes";
import {
  avaliacaoEmAndamentoPorNome,
  avaliacaoVisivelAbaAvaliacoes,
  statusAposConcluirModal,
  statusAposSalvarRascunho,
  statusInicialNovaAvaliacao,
} from "../../../lib/academyPerformanceHubWorkflow";
import { buildPerformanceHubAgenda } from "../../../lib/academyPerformanceHubAgenda";
import { PERFORMANCE_HUB_TIME_DEFAULT } from "../../../lib/academyPerformanceHubConstants";
import { PerformanceHubFiltroBar } from "./PerformanceHubFiltroBar";
import { PerformanceHubAbaAvaliacoes } from "./PerformanceHubAbaAvaliacoes";
import { PerformanceHubAbaGerenciamento } from "./PerformanceHubAbaGerenciamento";
import { PerformanceHubAbaConfiguracao } from "./PerformanceHubAbaConfiguracao";
import { ModalAvaliarPerformanceHub, type PerformanceHubAvaliacaoFormPayload } from "./ModalAvaliarPerformanceHub";
import { ModalAnalisarFeedbackPerformanceHub } from "./ModalAnalisarFeedbackPerformanceHub";

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

function cloneScoringDefault(): PerformanceHubScoringPorTime {
  return cloneScoringPorTime();
}

function nomeCoincideUsuario(nomeAvaliado: string, nomeUsuario: string): boolean {
  return normalizarTextoBusca(nomeAvaliado) === normalizarTextoBusca(nomeUsuario);
}

function isAvaliacaoNoMes(row: PerformanceHubAvaliacao, mes: MesCarrossel | undefined): boolean {
  if (!mes) return false;
  const parsed = parseDateBr(row.data);
  if (!parsed) return false;
  return parsed.getFullYear() === mes.ano && parsed.getMonth() === mes.mes;
}

function isAvaliacaoNoHistorico(row: PerformanceHubAvaliacao): boolean {
  const parsed = parseDateBr(row.data);
  if (!parsed) return false;
  const dataIso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  const { inicio, fim } = getPeriodoHistoricoCompetencias();
  return dataIso >= inicio && dataIso <= fim;
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
  const avaliacoesDb = usePerformanceHubAvaliacoes();
  const [aba, setAba] = useRouteTab(
    "academy_performance_hub",
    "avaliacoes",
    ["avaliacoes", "gerenciamento", "configuracao"] as const,
  );

  const [historico, setHistorico] = useState(false);
  const [timeSelecionado, setTimeSelecionado] = useState<PerformanceHubTimeSlug>(PERFORMANCE_HUB_TIME_DEFAULT);
  const [staffSelecionado, setStaffSelecionado] = useState<string[]>([]);
  const [idxMes, setIdxMes] = useState(0);
  const [scoringPorTime, setScoringPorTime] = useState<PerformanceHubScoringPorTime>(() => cloneScoringDefault());
  const { avaliacoes, setAvaliacoes, persistirAvaliacao } = avaliacoesDb;
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

  const mesAgenda = useMemo(() => {
    if (historico) {
      const now = new Date();
      return { ano: now.getFullYear(), mes: now.getMonth() };
    }
    return mesSelecionado;
  }, [historico, mesSelecionado]);

  const agendaFiltrada = useMemo(() => {
    const staffList = cadastro.staffAgendaPorTimeFn(timeSelecionado);
    const selectedStaff = staffSelecionado[0];
    const agenda = buildPerformanceHubAgenda(staffList, avaliacoes, mesAgenda, timeSelecionado);
    if (!selectedStaff) return agenda;
    const selectedName = cadastro.staffOptionsPorTime(timeSelecionado).find((s) => s.value === selectedStaff)?.label;
    if (!selectedName) return agenda;
    return agenda.filter((row) => row.nome === selectedName);
  }, [avaliacoes, cadastro, mesAgenda, staffSelecionado, timeSelecionado]);

  const avaliacoesFiltradasBase = useMemo(() => {
    const staffList = cadastro.staffOptionsPorTime(timeSelecionado);
    const selectedStaff = staffSelecionado[0];
    const selectedStaffName = selectedStaff
      ? staffList.find((s) => s.value === selectedStaff)?.label ?? ""
      : "";
    return avaliacoes.filter((row) => {
      if (row.time !== timeSelecionado) return false;
      if (perm.canView === "proprios" && user?.name && !nomeCoincideUsuario(row.avaliadoNome, user.name)) {
        return false;
      }
      if (historico && !isAvaliacaoNoHistorico(row)) return false;
      if (!historico && !isAvaliacaoNoMes(row, mesSelecionado)) return false;
      if (selectedStaffName && row.avaliadoNome !== selectedStaffName) return false;
      return true;
    });
  }, [avaliacoes, timeSelecionado, historico, mesSelecionado, staffSelecionado, cadastro, perm.canView, user?.name]);

  const avaliacoesAbaAvaliacoes = useMemo(
    () => avaliacoesFiltradasBase.filter(avaliacaoVisivelAbaAvaliacoes),
    [avaliacoesFiltradasBase],
  );

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
      notaProcedimentos: payload.notaProcedimentos,
      videoUrl: payload.videoUrl,
      videoNome: payload.videoNome,
    };
  }

  function handleVerAvaliacao(row: PerformanceHubAvaliacao) {
    setModalModo("ver");
    setAvaliacaoEmEdicao(row);
  }

  function handleAnalisarAvaliacao(row: PerformanceHubAvaliacao) {
    setModalModo(row.status === "feedback" ? "analisar_feedback" : "analisar");
    setAvaliacaoEmEdicao(row);
  }

  function handleAbrirAvaliacao(row: PerformanceHubAvaliacao) {
    handleAnalisarAvaliacao(row);
  }

  function handleSolicitarAvaliacaoPorNome(nome: string) {
    const existente = avaliacaoEmAndamentoPorNome(avaliacoes, timeSelecionado, nome);
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
      status: statusInicialNovaAvaliacao(timeSelecionado),
      notaTotal: null,
      notaImagem: null,
      notaComunicacao: null,
      notaMesa: null,
      notaProcedimentos: null,
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
    void persistirAvaliacao(nova).then((salvo) => {
      if (salvo) setAvaliacaoEmEdicao(salvo);
    });
  }

  if (perm.loading || cadastro.loading || avaliacoesDb.loading) {
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
        showStaffFilter={aba !== "configuracao"}
      />

      <div role="tabpanel" id={`panel-performance-hub-${aba}`} aria-labelledby={`tab-performance-hub-${aba}`}>
        {aba === "avaliacoes" ? (
          <PerformanceHubAbaAvaliacoes
            avaliacoes={avaliacoesAbaAvaliacoes}
            timeSelecionado={timeSelecionado}
            canView={perm.canView}
            roleUsuario={user?.role ?? "prestador"}
            onVer={handleVerAvaliacao}
            onAnalisar={handleAnalisarAvaliacao}
          />
        ) : null}

        {aba === "gerenciamento" && perm.canEditarOk ? (
          <PerformanceHubAbaGerenciamento
            avaliacoes={avaliacoesFiltradasBase}
            timeSelecionado={timeSelecionado}
            agenda={agendaFiltrada}
            onAvaliar={handleAbrirAvaliacao}
            onAvaliarPorNome={handleSolicitarAvaliacaoPorNome}
          />
        ) : null}

        {aba === "configuracao" && perm.canCriarOk ? (
          <PerformanceHubAbaConfiguracao
            config={scoringPorTime[timeSelecionado]}
            onChange={(next) =>
              setScoringPorTime((prev) => ({
                ...prev,
                [timeSelecionado]: next as PerformanceHubScoringPorTime[typeof timeSelecionado],
              }))
            }
            onSalvar={() => undefined}
          />
        ) : null}
      </div>

      {avaliacaoEmEdicao && modalModo === "analisar_feedback" ? (
        <ModalAnalisarFeedbackPerformanceHub
          avaliacao={avaliacaoEmEdicao}
          variantTime={avaliacaoEmEdicao.time}
          config={scoringConfigParaTime(scoringPorTime, avaliacaoEmEdicao.time)}
          estudios={cadastro.estudios}
          onClose={() => setAvaliacaoEmEdicao(null)}
          onAprovar={async () => {
            await persistirAvaliacao({ ...avaliacaoEmEdicao, status: "concluida" });
            setAvaliacaoEmEdicao(null);
          }}
          onSolicitarFeedback={async (texto) => {
            await persistirAvaliacao({
              ...avaliacaoEmEdicao,
              status: "em_analise",
              solicitacaoFeedbackTexto: texto,
            });
            setAvaliacaoEmEdicao(null);
          }}
        />
      ) : avaliacaoEmEdicao ? (
        <ModalAvaliarPerformanceHub
          avaliacao={avaliacaoEmEdicao}
          variantTime={avaliacaoEmEdicao.time}
          config={scoringConfigParaTime(scoringPorTime, avaliacaoEmEdicao.time)}
          modo={modalModo}
          estudios={cadastro.estudios}
          mesas={cadastro.mesas}
          getPrefill={cadastro.getPrefill}
          onClose={() => setAvaliacaoEmEdicao(null)}
          onSalvar={(payload) => {
            void (async () => {
              const atualizado = {
                ...aplicarPayload(avaliacaoEmEdicao, payload),
                status: statusAposSalvarRascunho(avaliacaoEmEdicao),
              };
              const salvo = await persistirAvaliacao(atualizado);
              setAvaliacaoEmEdicao(salvo);
            })();
          }}
          onConcluir={(payload) => {
            void (async () => {
              const concluida = {
                ...aplicarPayload(avaliacaoEmEdicao, payload),
                status: statusAposConcluirModal(avaliacaoEmEdicao.time),
              };
              await persistirAvaliacao(concluida);
              setAvaliacaoEmEdicao(null);
            })();
          }}
        />
      ) : null}
    </div>
  );
}
