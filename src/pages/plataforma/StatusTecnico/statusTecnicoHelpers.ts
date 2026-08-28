import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { hojeIsoBrasil, isoDateBrasilFromInstant } from "../../../lib/dateBrasil";

/** Horários a partir dos quais Status Técnico exige “ok hoje” (America/Sao_Paulo). */
export const HORARIO_AGENDADO_BR = {
  /**
   * Cron: pg_cron Supabase ~4h BRT (principal). GitHub Actions só manual.
   * Checagem após 8h evita falso positivo cedo demais.
   */
  cda: 8,
  social: 6,
  spinRss: 6,
  comercialSpa: 7,
  comercialDominio: 8,
  /** Enriquecimento cidade/UF — cron 8h30 BRT; checagem após 9h para evitar falso positivo antes do job. */
  comercialCnpj: 9,
  emailDiretoria: 6,
  emailAgenda: 6,
} as const;

/**
 * Slugs com alerta/KPI “ok hoje” — buscados à parte do topo global de `sync_logs`.
 * Jobs horários (CS Outlook, painel, lobby) empurram diários para fora de um `limit` único.
 */
export const SYNC_LOG_SLUGS_GARANTIDOS = [
  "casa_apostas",
  "casa_apostas_afiliados",
  "spin_na_rede_rss",
  "painel_noticias_rss",
  "comercial_spa_lista",
  "comercial_dominio_validacao",
  "comercial_cnpj_enriquecimento",
  "lobby_blaze",
  "lobby_cda",
  "lobby_esportiva",
  "lobby_jonbet",
  "cs_atendimento_outlook",
] as const;

export function mesclarSyncLogsPorExecucao<T extends { id: string; executado_em: string }>(
  ...listas: (T[] | null | undefined)[]
): T[] {
  const map = new Map<string, T>();
  for (const lista of listas) {
    for (const row of lista ?? []) {
      map.set(row.id, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.executado_em.localeCompare(a.executado_em));
}

export function syncLogOkNoDia(
  logs: { status: string; executado_em?: string | null }[],
  isoDia: string,
): boolean {
  return logs.some(
    (l) => l.status === "ok" && isoDateBrasilFromInstant(l.executado_em) === isoDia,
  );
}

export function pipelineSucessoNoDia(
  runs: { status: string; run_date?: string; created_at?: string }[],
  isoDia: string,
): boolean {
  return runs.some(
    (r) =>
      r.status === "success" &&
      (r.run_date === isoDia || isoDateBrasilFromInstant(r.created_at) === isoDia),
  );
}

export const MSG_SEM_PERMISSAO = "Você não tem permissão para visualizar esta página.";

/** Rótulo na UI de Status Técnico (slug `comercial_spa_lista`); automação/DB mantém nome legado. */
export const LABEL_UI_COMERCIAL_SPA_LISTA = "Lista SPA";

/** Rótulo na UI de Status Técnico (slug `comercial_dominio_validacao`); automação/DB mantém nome legado. */
export const LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO = "Validação de domínios de Marcas";

/** Rótulo na UI de Status Técnico (slug `comercial_cnpj_enriquecimento`). */
export const LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE = "Estado / Cidade";

/** Rótulo na UI de Status Técnico (slug `cs_atendimento_outlook`). */
export const LABEL_UI_CS_ATENDIMENTO_OUTLOOK = "CS - Caixa de Contato (Outlook)";

/** Rótulos de fallback quando a linha ainda não existe em `integrations`. */
export const LABEL_UI_LOBBY_ESPORTIVA = "Lobby Esportiva Bet";
export const LABEL_UI_LOBBY_JONBET = "Lobby Jonbet";

export function nomeIntegracaoStatusTecnicoUi(slug: string, nome: string): string {
  if (slug === "comercial_spa_lista") return LABEL_UI_COMERCIAL_SPA_LISTA;
  if (slug === "comercial_dominio_validacao") return LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO;
  if (slug === "comercial_cnpj_enriquecimento") return LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE;
  if (slug === "cs_atendimento_outlook") return LABEL_UI_CS_ATENDIMENTO_OUTLOOK;
  if (slug === "lobby_esportiva") return LABEL_UI_LOBBY_ESPORTIVA;
  if (slug === "lobby_jonbet") return LABEL_UI_LOBBY_JONBET;
  return nome;
}

export const ERRO_SYNC_CDA =
  "Não foi possível sincronizar os dados CDA. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_CDA_AFILIADOS =
  "Não foi possível sincronizar os dados CDA Afiliados. Verifique CDA_AFILIADOS_API_KEY e a Edge Function.";
export const ERRO_SYNC_SOCIAL =
  "Não foi possível disparar o sync de Social Media. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_SPIN_RSS =
  "Não foi possível sincronizar o feed Spin na Rede. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_PAINEL_RSS =
  "Não foi possível sincronizar o Painel de Notícias. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_CS_OUTLOOK =
  "Não foi possível ingerir e-mails do CS Atendimento. Verifique a Edge Function, secrets do Graph e tente novamente.";

/** Monta mensagem de erro da Edge ingest-cs-atendimento-outlook (Graph / secrets). */
export function formatarErroRespostaCsOutlook(resData: {
  erro?: string;
  azure_erro?: string;
  azure_detalhe?: string;
  avisos_secrets?: string[];
  erros?: string[];
}): string {
  const partes: string[] = [];
  if (resData.erro) partes.push(resData.erro);
  if (resData.azure_detalhe) partes.push(resData.azure_detalhe);
  else if (resData.azure_erro) partes.push(resData.azure_erro);
  if (resData.avisos_secrets?.length) partes.push(...resData.avisos_secrets);
  if (resData.erros?.length) partes.push(...resData.erros);
  return partes.filter(Boolean).join(" — ");
}
export const ERRO_SYNC_COMERCIAL_SPA =
  "Não foi possível sincronizar a lista SPA/MF do Pipeline B2B. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_COMERCIAL_DOMINIO =
  "Não foi possível validar os domínios do Pipeline B2B. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_COMERCIAL_CNPJ =
  "Não foi possível enriquecer cidade/UF dos CNPJs do Pipeline B2B. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_LOBBY_BLAZE =
  "Não foi possível executar o monitor Lobby Blaze. Verifique a Edge Function e tente novamente.";
export const ERRO_EMAIL_DIRETORIA =
  "Não foi possível enviar o relatório para a diretoria. Verifique a função e tente novamente.";
export const ERRO_EMAIL_AGENDA =
  "Não foi possível enviar o e-mail de agenda. Verifique a função e tente novamente.";

export const ERRO_REDE_EDGE =
  "Não foi possível chegar à Edge Function (rede, firewall, bloqueador ou CORS). Abra F12 → Rede, confira se a função está publicada no Supabase e tente novamente.";

export const ERRO_DIAGNOSTICO_PLATAFORMA =
  "Não foi possível executar o diagnóstico da plataforma. Verifique a Edge Function e tente novamente.";

export const MODAL_OVERLAY_BG = "rgba(0,0,0,0.65)";

export function ctaGradientStatus(
  brand: { useBrand: boolean },
  disabled: boolean,
  cinza: string,
): string {
  if (disabled) return cinza;
  return getCtaCriarGradient(brand);
}

export function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
}

/** Slug em `sync_logs` → operadora em `lobby_monitor_execucao` (fonte do Posicionamento). */
export const LOBBY_OPERADORA_POR_INTEGRACAO: Record<string, string> = {
  lobby_blaze: "blaze",
  lobby_cda: "casa_apostas",
  lobby_esportiva: "esportiva_bet",
  lobby_jonbet: "jonbet",
};

export const LOBBY_INTEGRACAO_SLUGS = Object.keys(LOBBY_OPERADORA_POR_INTEGRACAO);

export type LobbyExecucaoMonitorRow = {
  operadora_slug: string;
  executado_em: string;
  status: string;
  mesas_encontradas: number;
};

type SyncLogResumoLobby = {
  status: string;
  executado_em: string;
  registros_inseridos?: number | null;
  registros_atualizados?: number | null;
  erros_count?: number | null;
};

export function isLobbyIntegracaoSlug(slug: string): slug is keyof typeof LOBBY_OPERADORA_POR_INTEGRACAO {
  return slug in LOBBY_OPERADORA_POR_INTEGRACAO;
}

function execucaoLobbyComDados(r: LobbyExecucaoMonitorRow): boolean {
  return (r.status === "ok" || r.status === "parcial") && r.mesas_encontradas > 0;
}

/** Última execução com mesas gravadas (ok/parcial) — lista já ordenada desc por `executado_em`. */
export function ultimaLobbyExecucaoComDados(
  execucoes: LobbyExecucaoMonitorRow[],
  operadoraSlug: string,
): LobbyExecucaoMonitorRow | undefined {
  return execucoes.find((r) => r.operadora_slug === operadoraSlug && execucaoLobbyComDados(r));
}

export function mesasLobbyExecucaoNoDia(
  execucoes: LobbyExecucaoMonitorRow[],
  operadoraSlug: string,
  hojeIso: string,
): number {
  return execucoes
    .filter(
      (r) =>
        r.operadora_slug === operadoraSlug &&
        execucaoLobbyComDados(r) &&
        isoDateBrasilFromInstant(r.executado_em) === hojeIso,
    )
    .reduce((s, r) => s + r.mesas_encontradas, 0);
}

export type StatusIntegracaoLobbyEnriquecido = {
  ultimoSync: string | null;
  registrosHoje: number;
  erros: number;
  status: "ok" | "warning" | "falha";
};

/**
 * Status de integrações Lobby: prioriza `sync_logs`; se ausente ou falha, usa
 * `lobby_monitor_execucao` (mesma fonte do Overview Spin → Posicionamento).
 */
export function enriquecerStatusIntegracaoLobby(
  integracaoSlug: string,
  logsInt: SyncLogResumoLobby[],
  execucoes: LobbyExecucaoMonitorRow[],
  hojeIso: string,
): StatusIntegracaoLobbyEnriquecido {
  const operadora = LOBBY_OPERADORA_POR_INTEGRACAO[integracaoSlug];
  if (!operadora) {
    return { ultimoSync: null, registrosHoje: 0, erros: 0, status: "falha" };
  }

  const ultimoLog = logsInt[0];
  const execOp = execucoes.filter((e) => e.operadora_slug === operadora);
  const ultimaExecDados = ultimaLobbyExecucaoComDados(execOp, operadora);
  const regsLobbyHoje = mesasLobbyExecucaoNoDia(execOp, operadora, hojeIso);

  const syncsHoje = logsInt.filter((l) => isoDateBrasilFromInstant(l.executado_em) === hojeIso);
  const regsSyncHoje = syncsHoje.reduce(
    (s, l) => s + (l.registros_inseridos ?? 0) + (l.registros_atualizados ?? 0),
    0,
  );
  const regsSyncUltimoOk =
    ultimoLog?.status === "ok"
      ? (ultimoLog.registros_inseridos ?? 0) + (ultimoLog.registros_atualizados ?? 0)
      : 0;

  let ultimoSync = ultimoLog?.executado_em ?? null;
  let registrosHoje = regsSyncHoje || regsSyncUltimoOk;
  let erros = ultimoLog?.erros_count ?? 0;
  let status: "ok" | "warning" | "falha" = "ok";

  if (ultimoLog?.status === "ok") {
    status = erros > 0 ? "warning" : "ok";
    if (ultimaExecDados && ultimaExecDados.executado_em > ultimoLog.executado_em) {
      ultimoSync = ultimaExecDados.executado_em;
    }
    if (regsLobbyHoje > registrosHoje) {
      registrosHoje = regsLobbyHoje;
    }
  } else if (ultimaExecDados) {
    ultimoSync = ultimaExecDados.executado_em;
    registrosHoje = regsLobbyHoje || ultimaExecDados.mesas_encontradas;
    status = ultimaExecDados.status === "parcial" ? "warning" : "ok";
    erros = 0;
  } else if (ultimoLog?.status === "falha" || !ultimoLog) {
    status = "falha";
  } else if (ultimoLog.erros_count && ultimoLog.erros_count > 0) {
    status = "warning";
  }

  return { ultimoSync, registrosHoje, erros, status };
}

/** Timestamp mais recente entre sync_logs OK e execução de lobby com dados. */
export function ultimaColetaLobbyOkEm(
  integracaoSlug: string,
  logsInt: SyncLogResumoLobby[],
  execucoes: LobbyExecucaoMonitorRow[],
): string | null {
  const operadora = LOBBY_OPERADORA_POR_INTEGRACAO[integracaoSlug];
  const ultimoLogOk = logsInt.find((l) => l.status === "ok");
  const ultimaExec = operadora
    ? ultimaLobbyExecucaoComDados(
        execucoes.filter((e) => e.operadora_slug === operadora),
        operadora,
      )
    : undefined;

  const candidatos = [ultimoLogOk?.executado_em, ultimaExec?.executado_em].filter(Boolean) as string[];
  if (candidatos.length === 0) return null;
  return candidatos.sort((a, b) => b.localeCompare(a))[0];
}

export function lobbyIntegracaoTemColetaComSucesso(
  integracaoSlug: string,
  logsInt: SyncLogResumoLobby[],
  execucoes: LobbyExecucaoMonitorRow[],
): boolean {
  return ultimaColetaLobbyOkEm(integracaoSlug, logsInt, execucoes) !== null;
}

export function lobbyIntegracaoStatusOk(
  integracaoSlug: string,
  logsInt: SyncLogResumoLobby[],
  execucoes: LobbyExecucaoMonitorRow[],
): boolean {
  return enriquecerStatusIntegracaoLobby(integracaoSlug, logsInt, execucoes, hojeIsoBrasil()).status !==
    "falha";
}

export function agregarLobbyExecucaoPorData(
  execucoes: LobbyExecucaoMonitorRow[],
  operadoraSlug: string,
): Record<string, number> {
  return execucoes.reduce<Record<string, number>>((acc, row) => {
    if (row.operadora_slug !== operadoraSlug || !execucaoLobbyComDados(row)) return acc;
    const d = isoDateBrasilFromInstant(row.executado_em);
    if (!d) return acc;
    acc[d] = (acc[d] ?? 0) + row.mesas_encontradas;
    return acc;
  }, {});
}

function mesclarContagemPorData(
  syncPorData: Record<string, number>,
  execPorData: Record<string, number>,
): Record<string, number> {
  const out = { ...syncPorData };
  for (const [d, n] of Object.entries(execPorData)) {
    out[d] = Math.max(out[d] ?? 0, n);
  }
  return out;
}

/** Mescla volume diário de sync_logs com fallback de lobby_monitor_execucao. */
export function mesclarLobbyFluxoPorData(
  syncPorData: Record<string, number>,
  execucoes: LobbyExecucaoMonitorRow[],
  operadoraSlug: string,
): Record<string, number> {
  return mesclarContagemPorData(syncPorData, agregarLobbyExecucaoPorData(execucoes, operadoraSlug));
}
