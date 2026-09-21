import { supabase } from "../../../lib/supabase";
import {
  hojeIsoBrasil,
  inicioDiaBrasilUtcIso,
  passouHorarioAgendadoBr,
  subDiasIso,
} from "../../../lib/dateBrasil";
import {
  HORARIO_AGENDADO_BR,
  LOBBY_OPERADORA_POR_INTEGRACAO,
  SYNC_LOG_SLUGS_GARANTIDOS,
  lobbyIntegracaoStatusOk,
  mesclarSyncLogsPorExecucao,
  pipelineSucessoNoDia,
  syncLogOkNoDia,
  type LobbyExecucaoMonitorRow,
} from "./statusTecnicoHelpers";

/** Total de integrações no KPI «Integrações Ativas» (Status Técnico / Home Admin). */
export const TOTAL_INTEGRACOES_STATUS_TECNICO = 20;

const LOBBY_INTEGRACAO_SLUGS = Object.keys(LOBBY_OPERADORA_POR_INTEGRACAO);
const LOBBY_OPERADORA_SLUGS = [...new Set(Object.values(LOBBY_OPERADORA_POR_INTEGRACAO))];

export type SyncLogIntegracaoKpi = {
  id: string;
  integracao_slug: string;
  status: string;
  executado_em: string;
  registros_inseridos?: number | null;
  registros_atualizados?: number | null;
  erros_count?: number | null;
};

export type PipelineRunIntegracaoKpi = {
  status: string;
  run_date?: string;
  created_at?: string;
};

export type TechLogIntegracaoKpi = {
  tipo: string;
  created_at: string;
};

export type IntegracoesAtivasKpiInput = {
  syncLogs: SyncLogIntegracaoKpi[];
  lobbyExecucoes: LobbyExecucaoMonitorRow[];
  pipelineRuns: PipelineRunIntegracaoKpi[];
  techLogs: TechLogIntegracaoKpi[];
  emailCountHojeDiretoria: number;
  emailCountHojeAgenda: number;
  emailUltimoDiretoria: string | null;
  emailUltimoAgenda: string | null;
  hojeIso?: string;
};

function logsDoSlug(logs: SyncLogIntegracaoKpi[], slug: string): SyncLogIntegracaoKpi[] {
  return logs.filter((l) => l.integracao_slug === slug);
}

function diarioStatusOk(
  logs: SyncLogIntegracaoKpi[],
  hojeIso: string,
  passouHorario: boolean,
): boolean {
  const okHoje = syncLogOkNoDia(logs, hojeIso);
  const ultimo = logs[0];
  return okHoje || (!passouHorario && ultimo?.status === "ok");
}

/**
 * Mesma regra do card «INTEGRAÇÕES ATIVAS» em Status Técnico.
 * Conta quantas das 20 integrações estão OK (ok hoje ou último OK antes do horário agendado).
 */
export function computeIntegracoesAtivasCount(input: IntegracoesAtivasKpiInput): {
  ativas: number;
  total: number;
} {
  const hojeIso = input.hojeIso ?? hojeIsoBrasil();
  const passouCda = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.cda);
  const passouSocial = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.social);
  const passouComercialSpa = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.comercialSpa);
  const passouComercialDominio = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.comercialDominio);
  const passouComercialCnpj = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.comercialCnpj);
  const passouRevenueSentinel = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.revenueSentinel);

  const syncLogs = [...input.syncLogs].sort((a, b) =>
    b.executado_em.localeCompare(a.executado_em),
  );

  const cdaStatusOk = diarioStatusOk(logsDoSlug(syncLogs, "casa_apostas"), hojeIso, passouCda);
  const cdaAfiliadosStatusOk = diarioStatusOk(
    logsDoSlug(syncLogs, "casa_apostas_afiliados"),
    hojeIso,
    passouCda,
  );
  const spinNaRedeRssStatusOk = diarioStatusOk(
    logsDoSlug(syncLogs, "spin_na_rede_rss"),
    hojeIso,
    passouSocial,
  );
  const comercialSpaStatusOk = diarioStatusOk(
    logsDoSlug(syncLogs, "comercial_spa_lista"),
    hojeIso,
    passouComercialSpa,
  );
  const comercialDominioStatusOk = diarioStatusOk(
    logsDoSlug(syncLogs, "comercial_dominio_validacao"),
    hojeIso,
    passouComercialDominio,
  );
  const comercialCnpjStatusOk = diarioStatusOk(
    logsDoSlug(syncLogs, "comercial_cnpj_enriquecimento"),
    hojeIso,
    passouComercialCnpj,
  );
  const revenueSentinelStatusOk = diarioStatusOk(
    logsDoSlug(syncLogs, "revenue_sentinel"),
    hojeIso,
    passouRevenueSentinel,
  );

  const lobbyFlags = LOBBY_INTEGRACAO_SLUGS.map((slug) =>
    lobbyIntegracaoStatusOk(
      slug,
      logsDoSlug(syncLogs, slug).map((l) => ({
        status: l.status,
        executado_em: l.executado_em,
        registros_inseridos: l.registros_inseridos,
        registros_atualizados: l.registros_atualizados,
        erros_count: l.erros_count,
      })),
      input.lobbyExecucoes,
    ),
  );

  const ultimoPipelineRun = input.pipelineRuns.reduce<PipelineRunIntegracaoKpi | null>((max, r) => {
    if (!max) return r;
    return String(r.created_at ?? "") > String(max.created_at ?? "") ? r : max;
  }, null);
  const socialOkHoje = pipelineSucessoNoDia(input.pipelineRuns, hojeIso);
  const socialStatusOk =
    socialOkHoje || (!passouSocial && ultimoPipelineRun?.status === "success");

  const ultimoTechLogDiretoria = input.techLogs
    .filter((l) => l.tipo === "relatorio_diretoria")
    .reduce<string | null>((max, l) => {
      if (!max) return l.created_at;
      return l.created_at > max ? l.created_at : max;
    }, null);
  const ultimoTechLogAgenda = input.techLogs
    .filter((l) => l.tipo === "email_agenda_diaria")
    .reduce<string | null>((max, l) => {
      if (!max) return l.created_at;
      return l.created_at > max ? l.created_at : max;
    }, null);

  const emailStatusDiretoriaOk =
    input.emailCountHojeDiretoria > 0 ||
    (!passouSocial &&
      !!input.emailUltimoDiretoria &&
      (!ultimoTechLogDiretoria || input.emailUltimoDiretoria >= ultimoTechLogDiretoria));
  const emailStatusAgendaOk =
    input.emailCountHojeAgenda > 0 ||
    (!passouSocial &&
      !!input.emailUltimoAgenda &&
      (!ultimoTechLogAgenda || input.emailUltimoAgenda >= ultimoTechLogAgenda));

  const flags = [
    cdaStatusOk,
    cdaAfiliadosStatusOk,
    socialStatusOk,
    spinNaRedeRssStatusOk,
    comercialSpaStatusOk,
    comercialDominioStatusOk,
    comercialCnpjStatusOk,
    revenueSentinelStatusOk,
    ...lobbyFlags,
    emailStatusDiretoriaOk,
    emailStatusAgendaOk,
  ];

  return {
    ativas: flags.filter(Boolean).length,
    total: TOTAL_INTEGRACOES_STATUS_TECNICO,
  };
}

export function fmtIntegracoesAtivasDisplay(ativas: number, total = TOTAL_INTEGRACOES_STATUS_TECNICO): string {
  return `${ativas.toLocaleString("pt-BR")} / ${total.toLocaleString("pt-BR")}`;
}

/**
 * Carga enxuta para Home Admin — mesma regra de Status Técnico, janela ~3 dias.
 */
export async function fetchIntegracoesAtivasKpi(): Promise<{
  ativas: number;
  total: number;
  display: string;
}> {
  const hoje = hojeIsoBrasil();
  const dataInicio = subDiasIso(hoje, 3);
  const syncDesdeUtc = inicioDiaBrasilUtcIso(dataInicio);
  const techDesde = new Date();
  techDesde.setHours(techDesde.getHours() - 96);

  const [syncBatch, lobbyExecRes, pipelineRes, emailsRes, techRes] = await Promise.all([
    Promise.all(
      SYNC_LOG_SLUGS_GARANTIDOS.map((slug) =>
        supabase
          .from("sync_logs")
          .select(
            "id, integracao_slug, status, executado_em, registros_inseridos, registros_atualizados, erros_count",
          )
          .eq("integracao_slug", slug)
          .gte("executado_em", syncDesdeUtc)
          .order("executado_em", { ascending: false })
          .limit(40),
      ),
    ),
    supabase
      .from("lobby_monitor_execucao")
      .select("operadora_slug, executado_em, status, mesas_encontradas")
      .in("operadora_slug", LOBBY_OPERADORA_SLUGS)
      .gte("executado_em", syncDesdeUtc)
      .order("executado_em", { ascending: false })
      .limit(400),
    supabase
      .from("pipeline_runs")
      .select("id, run_date, channel, status, error_msg, created_at")
      .gte("run_date", dataInicio)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("email_envios")
      .select("data, tipo, destinatarios_count, created_at")
      .gte("data", dataInicio)
      .in("tipo", ["relatorio_diretoria", "email_agenda_diaria"]),
    supabase
      .from("tech_logs")
      .select("tipo, created_at")
      .in("tipo", ["relatorio_diretoria", "email_agenda_diaria"])
      .gte("created_at", techDesde.toISOString())
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const syncLogs = mesclarSyncLogsPorExecucao(
    ...syncBatch.map((r) => (r.data ?? []) as SyncLogIntegracaoKpi[]),
  );

  const emailRows = (emailsRes.data ?? []) as {
    data: string;
    tipo: string;
    destinatarios_count: number;
    created_at?: string;
  }[];
  const ultimoPorTipo = (tipo: string) =>
    emailRows
      .filter((r) => r.tipo === tipo)
      .reduce<string | null>((max, row) => {
        if (!row.created_at) return max;
        return !max || row.created_at > max ? row.created_at : max;
      }, null);

  const emailCountHojeDiretoria = emailRows
    .filter((r) => r.data === hoje && r.tipo === "relatorio_diretoria")
    .reduce((s, r) => s + (r.destinatarios_count ?? 0), 0);
  const emailCountHojeAgenda = emailRows
    .filter((r) => r.data === hoje && r.tipo === "email_agenda_diaria")
    .reduce((s, r) => s + (r.destinatarios_count ?? 0), 0);

  const { ativas, total } = computeIntegracoesAtivasCount({
    syncLogs,
    lobbyExecucoes: (lobbyExecRes.data ?? []) as LobbyExecucaoMonitorRow[],
    pipelineRuns: (pipelineRes.data ?? []) as PipelineRunIntegracaoKpi[],
    techLogs: (techRes.data ?? []) as TechLogIntegracaoKpi[],
    emailCountHojeDiretoria,
    emailCountHojeAgenda,
    emailUltimoDiretoria: ultimoPorTipo("relatorio_diretoria"),
    emailUltimoAgenda: ultimoPorTipo("email_agenda_diaria"),
    hojeIso: hoje,
  });

  return { ativas, total, display: fmtIntegracoesAtivasDisplay(ativas, total) };
}
