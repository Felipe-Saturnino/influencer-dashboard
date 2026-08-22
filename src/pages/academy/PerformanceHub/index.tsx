import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
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
import { scoringConfigParaTime } from "../../../lib/academyPerformanceHubScoring";
import { normalizarTextoBusca } from "../../../lib/searchText";
import { getPeriodoHistoricoCompetencias } from "../../../lib/dashboardHelpers";
import { usePerformanceHubCadastro } from "../../../hooks/usePerformanceHubCadastro";
import { usePerformanceHubAvaliacoes } from "../../../hooks/usePerformanceHubAvaliacoes";
import { usePerformanceHubScoringConfig } from "../../../hooks/usePerformanceHubScoringConfig";
import {
  avaliacaoEmAndamentoPorNome,
  avaliacaoPertenceAoEscopoProprios,
  avaliacaoVisivelAbaAvaliacoes,
  isEscopoPropriosPerformanceHub,
  statusAposConcluirModal,
  statusAposSalvarRascunho,
  statusInicialNovaAvaliacao,
  type EscopoPropriosPerformanceHub,
} from "../../../lib/academyPerformanceHubWorkflow";
import { buildPerformanceHubAgenda } from "../../../lib/academyPerformanceHubAgenda";
import { PERFORMANCE_HUB_TIME_DEFAULT } from "../../../lib/academyPerformanceHubConstants";
import { buscarRhFuncionarioIdsPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import { supabase } from "../../../lib/supabase";
import { PerformanceHubFiltroBar } from "./PerformanceHubFiltroBar";
import { PerformanceHubAbaAvaliacoes } from "./PerformanceHubAbaAvaliacoes";
import { PerformanceHubAbaGerenciamento } from "./PerformanceHubAbaGerenciamento";
import { PerformanceHubAbaConfiguracao } from "./PerformanceHubAbaConfiguracao";
import { ModalAvaliarPerformanceHub, type PerformanceHubAvaliacaoFormPayload } from "./ModalAvaliarPerformanceHub";
import { ModalAnalisarFeedbackPerformanceHub } from "./ModalAnalisarFeedbackPerformanceHub";
import { ModalHistoricoPerformanceHub } from "./ModalHistoricoPerformanceHub";
import { registrarHistoricoAvaliacaoPerformanceHub } from "../../../lib/academyPerformanceHubAvaliacoesFetch";

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

function labelMesCarrossel(ano: number, mes: number): string {
  const raw = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function buildMesesCarrossel(
  rows: PerformanceHubAvaliacao[],
  time: PerformanceHubTimeSlug | null,
): MesCarrossel[] {
  const keys = new Set<string>();
  for (const row of rows) {
    if (time != null && row.time !== time) continue;
    const parsed = parseDateBr(row.data);
    if (!parsed) continue;
    keys.add(`${parsed.getFullYear()}-${parsed.getMonth()}`);
  }
  const now = new Date();
  keys.add(`${now.getFullYear()}-${now.getMonth()}`);
  const entries = [...keys].map((key) => {
    const [ano, mes] = key.split("-").map(Number);
    return { ano, mes, label: labelMesCarrossel(ano, mes) };
  });
  entries.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  return entries;
}

/** Índice do mês civil corrente (último da lista se ainda não houver competência atual). */
function idxMesCorrenteCarrossel(meses: MesCarrossel[], ref: Date = new Date()): number {
  if (meses.length === 0) return 0;
  const i = meses.findIndex((m) => m.ano === ref.getFullYear() && m.mes === ref.getMonth());
  return i >= 0 ? i : meses.length - 1;
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
  const { name: nomeEfetivo, email: emailEfetivo, role: roleEfetivo } = useIdentidadeEfetiva();
  const brand = useDashboardBrand();
  const perm = usePermission("academy_performance_hub");
  const cadastro = usePerformanceHubCadastro();
  const avaliacoesDb = usePerformanceHubAvaliacoes();
  const scoringDb = usePerformanceHubScoringConfig();
  const [aba, setAba] = useRouteTab(
    "academy_performance_hub",
    "avaliacoes",
    ["avaliacoes", "gerenciamento", "configuracao"] as const,
  );

  const soProprios = isEscopoPropriosPerformanceHub(perm.canView, perm.canEditarOk);

  const [historico, setHistorico] = useState(false);
  const [timeSelecionado, setTimeSelecionado] = useState<PerformanceHubTimeSlug>(PERFORMANCE_HUB_TIME_DEFAULT);
  const [staffSelecionado, setStaffSelecionado] = useState<string[]>([]);
  const [idxMes, setIdxMes] = useState(0);
  /** Enquanto o usuário não navega o carrossel, sempre recoloca no mês corrente (inclui carga async). */
  const usuarioNavegouCarrossel = useRef(false);
  const { scoringPorTime, setScoringPorTime } = scoringDb;
  const { avaliacoes, setAvaliacoes, persistirAvaliacao } = avaliacoesDb;
  const [avaliacaoEmEdicao, setAvaliacaoEmEdicao] = useState<PerformanceHubAvaliacao | null>(null);
  const [modalModo, setModalModo] = useState<PerformanceHubModalModo>("ver");
  const [escopoProprios, setEscopoProprios] = useState<EscopoPropriosPerformanceHub>({
    staffIds: new Set(),
    nomes: [],
  });

  useEffect(() => {
    if (perm.loading) return;
    const next = initialTab(perm.canEditarOk, perm.canCriarOk, aba);
    if (next !== aba) setAba(next);
  }, [perm.loading, perm.canEditarOk, perm.canCriarOk, aba, setAba]);

  useEffect(() => {
    if (!soProprios) {
      setEscopoProprios({ staffIds: new Set(), nomes: nomeEfetivo ? [nomeEfetivo] : [] });
      return;
    }
    let cancelado = false;
    void (async () => {
      const nomes = new Set<string>();
      if (nomeEfetivo?.trim()) nomes.add(nomeEfetivo.trim());
      const staffIds = new Set<string>();
      try {
        const ids = await buscarRhFuncionarioIdsPorEmailLogin(emailEfetivo);
        for (const id of ids) staffIds.add(id);
        if (ids.length > 0) {
          const { data, error } = await supabase.from("rh_funcionarios").select("id, nome").in("id", ids);
          if (!error && data) {
            for (const row of data as { id: string; nome: string | null }[]) {
              staffIds.add(row.id);
              const n = row.nome?.trim();
              if (n) nomes.add(n);
            }
          }
        }
      } catch (err) {
        console.error("Performance Hub: falha ao resolver escopo Próprios", err);
      }
      if (cancelado) return;
      setEscopoProprios({ staffIds, nomes: [...nomes] });
    })();
    return () => {
      cancelado = true;
    };
  }, [soProprios, emailEfetivo, nomeEfetivo]);

  const mesesCarrossel = useMemo(
    () => buildMesesCarrossel(avaliacoes, soProprios ? null : timeSelecionado),
    [avaliacoes, timeSelecionado, soProprios],
  );

  useEffect(() => {
    usuarioNavegouCarrossel.current = false;
  }, [timeSelecionado]);

  useEffect(() => {
    if (mesesCarrossel.length === 0) return;
    if (!usuarioNavegouCarrossel.current) {
      setIdxMes(idxMesCorrenteCarrossel(mesesCarrossel));
      return;
    }
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
      if (soProprios) {
        if (!avaliacaoPertenceAoEscopoProprios(row, escopoProprios)) return false;
      } else {
        if (row.time !== timeSelecionado) return false;
        if (perm.canView === "proprios" && nomeEfetivo && !nomeCoincideUsuario(row.avaliadoNome, nomeEfetivo)) {
          return false;
        }
      }
      if (historico && !isAvaliacaoNoHistorico(row)) return false;
      if (!historico && !isAvaliacaoNoMes(row, mesSelecionado)) return false;
      if (!soProprios && selectedStaffName && row.avaliadoNome !== selectedStaffName) return false;
      return true;
    });
  }, [
    avaliacoes,
    timeSelecionado,
    historico,
    mesSelecionado,
    staffSelecionado,
    cadastro,
    perm.canView,
    nomeEfetivo,
    soProprios,
    escopoProprios,
  ]);

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
    setModalModo("analisar_aguardando");
    setAvaliacaoEmEdicao(row);
  }

  function handleHistoricoAvaliacao(row: PerformanceHubAvaliacao) {
    setModalModo("historico");
    setAvaliacaoEmEdicao(row);
  }

  function handleAplicarFeedback(row: PerformanceHubAvaliacao) {
    setModalModo("aplicar_feedback");
    setAvaliacaoEmEdicao(row);
  }

  function handleAbrirAvaliacao(row: PerformanceHubAvaliacao) {
    setModalModo("analisar");
    setAvaliacaoEmEdicao(row);
  }

  function handleSolicitarAvaliacaoPorNome(nome: string) {
    const existente = avaliacaoEmAndamentoPorNome(avaliacoes, timeSelecionado, nome);
    if (existente) {
      handleAbrirAvaliacao(existente);
      return;
    }
    const staffId = cadastro.resolveStaffId(nome);
    const nova: PerformanceHubAvaliacao = {
      id: `novo-${Date.now()}`,
      data: new Date().toLocaleDateString("pt-BR"),
      time: timeSelecionado,
      avaliadoNome: nome,
      avaliadoStaffId: staffId,
      avaliadorNome: nomeEfetivo ?? user?.name ?? "Performance Coach",
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
    handleAbrirAvaliacao(nova);
    void persistirAvaliacao(nova).then((salvo) => {
      if (salvo) setAvaliacaoEmEdicao(salvo);
    });
  }

  const nomeUsuarioAcao = nomeEfetivo ?? user?.name ?? "Usuário";

  if (perm.loading || cadastro.loading || avaliacoesDb.loading || scoringDb.loading) {
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
        onToggleHistorico={() => {
          setHistorico((prev) => {
            if (prev) {
              usuarioNavegouCarrossel.current = false;
              setIdxMes(idxMesCorrenteCarrossel(mesesCarrossel));
            }
            return !prev;
          });
        }}
        labelCarrossel={historico ? "Todo o período" : (mesSelecionado?.label ?? "—")}
        carrosselAnteriorDisabled={historico || idxMes <= 0}
        carrosselProximoDisabled={historico || idxMes >= mesesCarrossel.length - 1}
        onCarrosselAnterior={() => {
          usuarioNavegouCarrossel.current = true;
          setIdxMes((prev) => Math.max(0, prev - 1));
        }}
        onCarrosselProximo={() => {
          usuarioNavegouCarrossel.current = true;
          setIdxMes((prev) => Math.min(mesesCarrossel.length - 1, prev + 1));
        }}
        timeSelecionado={timeSelecionado}
        onSelecionarTime={setTimeSelecionado}
        showTimeFilter={!soProprios}
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
            canEditarOk={perm.canEditarOk}
            roleUsuario={roleEfetivo ?? user?.role ?? "prestador"}
            onVer={handleVerAvaliacao}
            onAnalisar={handleAnalisarAvaliacao}
            onHistorico={handleHistoricoAvaliacao}
            onAplicarFeedback={handleAplicarFeedback}
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
            loadError={scoringDb.loadError}
            onSalvar={() => scoringDb.salvar(timeSelecionado, scoringPorTime[timeSelecionado])}
          />
        ) : null}
      </div>

      {avaliacaoEmEdicao && modalModo === "historico" ? (
        <ModalHistoricoPerformanceHub
          avaliacao={avaliacaoEmEdicao}
          onClose={() => setAvaliacaoEmEdicao(null)}
        />
      ) : null}

      {avaliacaoEmEdicao &&
      (modalModo === "analisar_aguardando" ||
        modalModo === "aplicar_feedback" ||
        modalModo === "ver") ? (
        <ModalAnalisarFeedbackPerformanceHub
          avaliacao={avaliacaoEmEdicao}
          variantTime={avaliacaoEmEdicao.time}
          config={scoringConfigParaTime(scoringPorTime, avaliacaoEmEdicao.time)}
          estudios={cadastro.estudios}
          modo={
            modalModo === "analisar_aguardando"
              ? "analisar"
              : modalModo === "aplicar_feedback"
                ? "aplicar"
                : "ver"
          }
          onClose={() => setAvaliacaoEmEdicao(null)}
          onAprovar={async () => {
            const salvo = await persistirAvaliacao({
              ...avaliacaoEmEdicao,
              status: "aprovado",
            });
            if (salvo) {
              await registrarHistoricoAvaliacaoPerformanceHub({
                avaliacaoId: salvo.id,
                acao: "aprovou",
                usuarioNome: nomeUsuarioAcao,
              });
            }
            setAvaliacaoEmEdicao(null);
          }}
          onSolicitarFeedback={async (texto) => {
            const agora = new Date().toISOString();
            const salvo = await persistirAvaliacao({
              ...avaliacaoEmEdicao,
              status: "feedback",
              solicitacaoFeedbackTexto: texto,
              solicitacaoFeedbackPorNome: nomeUsuarioAcao,
              solicitacaoFeedbackEm: agora,
            });
            if (salvo) {
              await registrarHistoricoAvaliacaoPerformanceHub({
                avaliacaoId: salvo.id,
                acao: "solicitou_feedback",
                usuarioNome: nomeUsuarioAcao,
                mensagem: texto,
              });
            }
            setAvaliacaoEmEdicao(null);
          }}
          onAplicarFeedback={async (texto) => {
            const agora = new Date().toISOString();
            const salvo = await persistirAvaliacao({
              ...avaliacaoEmEdicao,
              status: "aprovado",
              aplicacaoFeedbackTexto: texto,
              aplicacaoFeedbackPorNome: nomeUsuarioAcao,
              aplicacaoFeedbackEm: agora,
            });
            if (salvo) {
              await registrarHistoricoAvaliacaoPerformanceHub({
                avaliacaoId: salvo.id,
                acao: "aplicou_feedback",
                usuarioNome: nomeUsuarioAcao,
                mensagem: texto,
              });
            }
            setAvaliacaoEmEdicao(null);
          }}
        />
      ) : null}

      {avaliacaoEmEdicao && modalModo === "analisar" ? (
        <ModalAvaliarPerformanceHub
          avaliacao={avaliacaoEmEdicao}
          variantTime={avaliacaoEmEdicao.time}
          config={scoringConfigParaTime(scoringPorTime, avaliacaoEmEdicao.time)}
          modo="analisar"
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
              const publicada = {
                ...aplicarPayload(avaliacaoEmEdicao, payload),
                status: statusAposConcluirModal(avaliacaoEmEdicao.time),
              };
              const salvo = await persistirAvaliacao(publicada);
              if (salvo) {
                await registrarHistoricoAvaliacaoPerformanceHub({
                  avaliacaoId: salvo.id,
                  acao: "publicada",
                  usuarioNome: nomeUsuarioAcao,
                });
              }
              setAvaliacaoEmEdicao(null);
            })();
          }}
        />
      ) : null}
    </div>
  );
}
