/**
 * Diagnóstico operacional da plataforma (Status Técnico).
 * Fonte única para a app React, Vitest e Edge `platform-health-check`
 * (`supabase/functions/platform-health-check/platformHealthDiagnostics.ts` — manter alinhado).
 */

export type DiagnosticSeverity = "ok" | "aviso" | "erro";

export const TIPO_DIAGNOSTICO_RESUMO = "diagnostico_plataforma";
export const TIPO_DIAGNOSTICO_OK = "diagnostico_ok";
export const TIPO_DIAGNOSTICO_AVISO = "diagnostico_aviso";
export const TIPO_DIAGNOSTICO_ERRO = "diagnostico_erro";

export interface TechLogInsertRow {
  integracao_slug: string | null;
  tipo: string;
  descricao: string;
}

/** Secrets e flags lidos do ambiente (Edge Functions → Secrets). */
export interface PlatformHealthSecretsSnapshot {
  cdaConfigurado: boolean;
  /** Conta TAP Afiliados — `CDA_AFILIADOS_API_KEY`. */
  cdaAfiliadosConfigurado: boolean;
  githubSocialConfigurado: boolean;
  /** `RESEND_API_KEY` — obrigatória para qualquer envio Resend. */
  resendApiKeyConfigurado: boolean;
  /** `RESEND_FROM_SISTEMA` — transacionais (boas-vindas, reset). */
  resendFromSistemaConfigurado: boolean;
  /** `RESEND_FROM_RELATORIOS` ou legado `RESEND_FROM`. */
  resendFromRelatoriosConfigurado: boolean;
  /** `SENHA_PADRAO` — mín. 8 caracteres (criar usuário / reset admin). */
  senhaPadraoValida: boolean;
  /** `RELATORIO_DIRETORIA_DESTINATARIOS` — lista não vazia com @. */
  destinatariosRelatorioConfigurado: boolean;
  /** `EMAIL_AGENDA_DESTINATARIOS` — lista não vazia com @. */
  destinatariosAgendaConfigurado: boolean;
  /** Data Export API — `RS_API_KEY` (+ `RS_API_URL` opcional). */
  revenueSentinelConfigurado: boolean;
}

export type PlatformHealthJobKind =
  | "cda"
  | "social"
  | "rss"
  | "email"
  | "comercialSpa"
  | "comercialDominio"
  | "comercialCnpj"
  | "revenueSentinel"
  | "lobby"
  | "outro";

export interface PlatformHealthIntegrationSnapshot {
  slug: string | null;
  nome: string;
  integracaoSlugFk: string | null;
  ultimoStatus: "ok" | "falha" | "success" | "error" | null;
  ultimoEm: string | null;
  okHoje: boolean;
  teveHistorico: boolean;
  erros24h: number;
  /** Taxa de falha no lote de sync_logs (0–100). */
  taxaErroPct?: number | null;
  /** Lobby: última coleta OK há mais de 24h. */
  atrasoLobby24h?: boolean;
  jobKind?: PlatformHealthJobKind;
}

/** Probe extra (smoke de infra, ping vivo, conflito de catálogo). */
export interface PlatformHealthExtraProbe {
  nome: string;
  severidade: DiagnosticSeverity;
  descricao: string;
  integracaoSlugFk: string | null;
}

export interface PlatformHealthSnapshot {
  hojeIso: string;
  passouHorarioCda: boolean;
  passouHorarioSocial: boolean;
  passouHorarioComercialSpa?: boolean;
  passouHorarioComercialDominio?: boolean;
  passouHorarioComercialCnpj?: boolean;
  passouHorarioRevenueSentinel?: boolean;
  secrets: PlatformHealthSecretsSnapshot;
  integracoes: PlatformHealthIntegrationSnapshot[];
  extras?: PlatformHealthExtraProbe[];
}

/** Horários de corte alinhados a Status Técnico / `HORARIO_AGENDADO_BR`. */
export const DIAGNOSTICO_HORARIO_CORTE = {
  cda: 8,
  social: 6,
  comercialSpa: 7,
  comercialDominio: 8,
  comercialCnpj: 9,
  revenueSentinel: 8,
} as const;

/** Edge Functions publicadas — smoke OPTIONS (sem disparar lógica). */
export const DIAGNOSTICO_EDGE_FUNCTIONS = [
  "platform-health-check",
  "sync-metricas-cda",
  "trigger-social-kpis",
  "sync-spin-na-rede-rss",
  "sync-painel-noticias-rss",
  "sync-comercial-spa-lista",
  "validate-comercial-dominios",
  "enrich-comercial-cnpj",
  "sync-revenue-sentinel",
  "ingest-cs-atendimento-outlook",
  "monitor-lobby-blaze",
  "monitor-lobby-cda",
  "monitor-lobby-esportiva",
  "monitor-lobby-jonbet",
  "monitor-lobby-bateu",
  "monitor-lobby-rico",
  "monitor-lobby-brx",
  "monitor-lobby-donald",
  "monitor-lobby-betponto",
  "criar-usuario",
  "criar-usuario-scout",
  "criar-afiliado-network",
  "sync-rh-prestador-auth-user",
  "atualizar-perfil",
  "admin-usuario-acao",
  "recuperar-senha",
  "aprovar-pagamento",
  "prestador-ponto",
  "prospecto-scout-site",
  "prospecto-afiliados-network-site",
  "prospecto-cs-atendimento-site",
  "prospecto-vaga-candidatura-site",
  "sync-vagas-carreiras-site",
  "relatorio-diario-diretoria",
  "email-agenda-diaria",
  "rh-calendario-ics",
  "purge-academy-performance-hub-videos",
] as const;

/** Slugs de job que o diagnóstico deve buscar em `sync_logs` (um fetch por slug). */
export const DIAGNOSTICO_SYNC_SLUGS = [
  "casa_apostas",
  "casa_apostas_afiliados",
  "spin_na_rede_rss",
  "painel_noticias_rss",
  "comercial_spa_lista",
  "comercial_dominio_validacao",
  "comercial_cnpj_enriquecimento",
  "revenue_sentinel",
  "cs_atendimento_outlook",
  "lobby_blaze",
  "lobby_cda",
  "lobby_esportiva",
  "lobby_jonbet",
  "lobby_bateu",
  "lobby_rico",
  "lobby_brx",
  "lobby_donald",
  "lobby_betponto",
] as const;

export const DIAGNOSTICO_LOBBY_OPERADORAS = [
  "blaze",
  "casa_apostas",
  "esportiva_bet",
  "jonbet",
  "bateu_bet",
  "rico_bet",
  "brx_bet",
  "donald_bet",
  "betponto_bet",
] as const;

export const DIAGNOSTICO_CRON_JOBS = [
  "daily-sync-metricas-cda-influencers",
  "daily-sync-metricas-cda-afiliados",
  "daily-relatorio-diario-diretoria",
  "daily-email-agenda-diaria",
  "daily-sync-spin-na-rede-rss",
  "daily-sync-comercial-spa-lista",
  "daily-validate-comercial-dominios",
  "daily-enrich-comercial-cnpj",
  "daily-sync-revenue-sentinel",
  "ingest-cs-atendimento-outlook-5min",
] as const;

export const DIAGNOSTICO_STORAGE_BUCKETS = [
  "cs-atendimento-email",
  "canal-denuncias-spin",
  "academy-performance-hub-videos",
  "academy-portal-assets",
  "rh-portal-assets",
  "estudio-incidentes",
  "marketing-fotos-gerais",
  "rh-vaga-candidaturas",
] as const;

export const DIAGNOSTICO_BRASIL_API_CNPJ_PING = "00000000000191";
export const DIAGNOSTICO_SPA_LISTA_URL =
  "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/empresas-autorizadas";

export const DIAGNOSTICO_PING_TIMEOUT_MS = 8000;
export const DIAGNOSTICO_OPTIONS_TIMEOUT_MS = 4000;
export const DIAGNOSTICO_CONCURRENCY = 4;
export const DIAGNOSTICO_BUDGET_MS = 45_000;

export function jobKindFromSlug(slug: string | null | undefined): PlatformHealthJobKind {
  if (!slug) return "outro";
  if (slug === "casa_apostas" || slug === "casa_apostas_afiliados") return "cda";
  if (slug === "social_kpis") return "social";
  if (slug.includes("rss") || slug === "spin_na_rede_rss" || slug === "painel_noticias_rss") return "rss";
  if (slug.startsWith("email_")) return "email";
  if (slug === "comercial_spa_lista") return "comercialSpa";
  if (slug === "comercial_dominio_validacao") return "comercialDominio";
  if (slug === "comercial_cnpj_enriquecimento") return "comercialCnpj";
  if (slug === "revenue_sentinel") return "revenueSentinel";
  if (slug.startsWith("lobby_")) return "lobby";
  return "outro";
}

export function classificarHttpSmoke(
  status: number,
  aborted: boolean,
): { severidade: DiagnosticSeverity; detalhe: string } {
  if (aborted) return { severidade: "aviso", detalhe: "Tempo esgotado ao contactar o serviço." };
  if (status === 401 || status === 403) {
    return { severidade: "erro", detalhe: `HTTP ${status} — credencial recusada ou acesso negado.` };
  }
  if (status === 404) {
    return { severidade: "erro", detalhe: "HTTP 404 — recurso ou função não encontrada (não publicada?)." };
  }
  if (status >= 500) {
    return { severidade: "aviso", detalhe: `HTTP ${status} — serviço indisponível no momento.` };
  }
  if (status >= 200 && status < 400) {
    return { severidade: "ok", detalhe: `HTTP ${status}.` };
  }
  return { severidade: "aviso", detalhe: `HTTP ${status}.` };
}

export function primeiraUrlDeLista(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const url = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .find((s) => /^https?:\/\//i.test(s));
  return url ?? null;
}

export function githubRepoPath(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const m = v.match(/github\.com\/([^/]+\/[^/]+)(?:\.git)?/i);
  if (m?.[1]) return m[1].replace(/\.git$/i, "");
  if (/^[^/]+\/[^/]+$/.test(v)) return v;
  return null;
}

function trimEnv(get: (key: string) => string | undefined, key: string): string {
  return (get(key) ?? "").trim();
}

/** Alinhado a `isValidFromAddress` em `resendMail.ts`. */
export function isValidResendFromAddress(value: string): boolean {
  return !!value && /@[\w.-]+\.[a-z]{2,}/i.test(value);
}

/** Lista separada por vírgula/ponto-e-vírgula com pelo menos um e-mail. */
export function hasDestinatariosList(value: string): boolean {
  const list = value
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.some((e) => e.includes("@"));
}

/** Lê secrets do ambiente (Deno.env.get ou mock em testes). */
export function readPlatformHealthSecrets(
  get: (key: string) => string | undefined,
): PlatformHealthSecretsSnapshot {
  const fromSistema = trimEnv(get, "RESEND_FROM_SISTEMA");
  const fromRelatorios = trimEnv(get, "RESEND_FROM_RELATORIOS");
  const fromLegacy = trimEnv(get, "RESEND_FROM");
  const senhaPadrao = trimEnv(get, "SENHA_PADRAO");

  return {
    cdaConfigurado: !!(
      trimEnv(get, "CDA_INFLUENCERS_API_KEY") ||
      trimEnv(get, "CDA_USE_REPORTING_API") === "true"
    ),
    cdaAfiliadosConfigurado: !!trimEnv(get, "CDA_AFILIADOS_API_KEY"),
    githubSocialConfigurado: !!(
      trimEnv(get, "GITHUB_TOKEN") && trimEnv(get, "GITHUB_REPO")
    ),
    resendApiKeyConfigurado: !!trimEnv(get, "RESEND_API_KEY"),
    resendFromSistemaConfigurado: isValidResendFromAddress(fromSistema),
    resendFromRelatoriosConfigurado:
      isValidResendFromAddress(fromRelatorios) || isValidResendFromAddress(fromLegacy),
    senhaPadraoValida: senhaPadrao.length >= 8,
    destinatariosRelatorioConfigurado: hasDestinatariosList(
      trimEnv(get, "RELATORIO_DIRETORIA_DESTINATARIOS"),
    ),
    destinatariosAgendaConfigurado: hasDestinatariosList(trimEnv(get, "EMAIL_AGENDA_DESTINATARIOS")),
    revenueSentinelConfigurado: !!trimEnv(get, "RS_API_KEY"),
  };
}

function tipoPorSeveridade(s: DiagnosticSeverity): string {
  if (s === "ok") return TIPO_DIAGNOSTICO_OK;
  if (s === "aviso") return TIPO_DIAGNOSTICO_AVISO;
  return TIPO_DIAGNOSTICO_ERRO;
}

function pushProbe(
  out: TechLogInsertRow[],
  probe: {
    nome: string;
    severidade: DiagnosticSeverity;
    descricao: string;
    integracaoSlugFk: string | null;
  },
): void {
  out.push({
    integracao_slug: probe.integracaoSlugFk,
    tipo: tipoPorSeveridade(probe.severidade),
    descricao: `${probe.nome}: ${probe.descricao}`.slice(0, 2000),
  });
}

function countSeverity(
  severidade: DiagnosticSeverity,
  counters: { ok: number; aviso: number; erro: number },
): void {
  if (severidade === "ok") counters.ok++;
  else if (severidade === "aviso") counters.aviso++;
  else counters.erro++;
}

function probeSecret(
  out: TechLogInsertRow[],
  counters: { ok: number; aviso: number; erro: number },
  probe: {
    nome: string;
    severidade: DiagnosticSeverity;
    descricaoOk: string;
    descricaoFail: string;
    integracaoSlugFk: string | null;
    ok: boolean;
  },
): void {
  const severidade = probe.ok ? "ok" : probe.severidade;
  pushProbe(out, {
    nome: probe.nome,
    severidade,
    descricao: probe.ok ? probe.descricaoOk : probe.descricaoFail,
    integracaoSlugFk: probe.integracaoSlugFk,
  });
  countSeverity(severidade, counters);
}

export function labelTipoTechLog(tipo: string): string {
  const map: Record<string, string> = {
    [TIPO_DIAGNOSTICO_RESUMO]: "Diagnóstico (resumo)",
    [TIPO_DIAGNOSTICO_OK]: "Diagnóstico OK",
    [TIPO_DIAGNOSTICO_AVISO]: "Diagnóstico atenção",
    [TIPO_DIAGNOSTICO_ERRO]: "Diagnóstico falha",
    boas_vindas: "E-mail boas-vindas",
    recuperar_senha: "E-mail reset senha",
    relatorio_diretoria: "E-mail relatório",
    email_agenda_diaria: "E-mail agenda",
  };
  return map[tipo] ?? tipo;
}

export function buildPlatformHealthTechLogs(snapshot: PlatformHealthSnapshot): TechLogInsertRow[] {
  const out: TechLogInsertRow[] = [];
  const counters = { ok: 0, aviso: 0, erro: 0 };
  const s = snapshot.secrets;

  probeSecret(out, counters, {
    nome: "Configuração CDA",
    severidade: "erro",
    descricaoOk: "Credencial ou modo Reporting API presente.",
    descricaoFail: "Credencial da API CDA não configurada nos secrets do projeto.",
    integracaoSlugFk: "casa_apostas",
    ok: s.cdaConfigurado,
  });

  probeSecret(out, counters, {
    nome: "Configuração CDA Afiliados",
    severidade: "erro",
    descricaoOk: "CDA_AFILIADOS_API_KEY presente.",
    descricaoFail: "CDA_AFILIADOS_API_KEY ausente — sync da conta Afiliados falhará.",
    integracaoSlugFk: "casa_apostas_afiliados",
    ok: s.cdaAfiliadosConfigurado,
  });

  probeSecret(out, counters, {
    nome: "Configuração Revenue Sentinel",
    severidade: "erro",
    descricaoOk: "RS_API_KEY presente.",
    descricaoFail: "RS_API_KEY ausente — sync de Jogadores Spin falhará.",
    integracaoSlugFk: "revenue_sentinel",
    ok: s.revenueSentinelConfigurado,
  });

  probeSecret(out, counters, {
    nome: "Configuração Social Media",
    severidade: "aviso",
    descricaoOk: "Secrets do disparo de workflow configurados (GITHUB_TOKEN + GITHUB_REPO).",
    descricaoFail: "Token ou repositório GitHub ausente — sync social manual pode falhar.",
    integracaoSlugFk: null,
    ok: s.githubSocialConfigurado,
  });

  probeSecret(out, counters, {
    nome: "Resend — API Key",
    severidade: "erro",
    descricaoOk: "RESEND_API_KEY configurada.",
    descricaoFail: "RESEND_API_KEY ausente — nenhum e-mail (transacional ou cron) será enviado.",
    integracaoSlugFk: null,
    ok: s.resendApiKeyConfigurado,
  });

  if (s.resendApiKeyConfigurado) {
    probeSecret(out, counters, {
      nome: "E-mail transacional — remetente",
      severidade: "aviso",
      descricaoOk: "RESEND_FROM_SISTEMA configurado (boas-vindas e reset de senha).",
      descricaoFail:
        "RESEND_FROM_SISTEMA ausente — o código usa fallback sistema@data-intelligence.spingaming.com.br; configure a secret no Supabase.",
      integracaoSlugFk: null,
      ok: s.resendFromSistemaConfigurado,
    });

    probeSecret(out, counters, {
      nome: "E-mail cron — remetente",
      severidade: "aviso",
      descricaoOk: "RESEND_FROM_RELATORIOS (ou RESEND_FROM legado) configurado.",
      descricaoFail:
        "RESEND_FROM_RELATORIOS ausente — relatório e agenda usam fallback relatorios@…; configure a secret.",
      integracaoSlugFk: null,
      ok: s.resendFromRelatoriosConfigurado,
    });

    probeSecret(out, counters, {
      nome: "Senha padrão (contas novas / reset)",
      severidade: "erro",
      descricaoOk: "SENHA_PADRAO configurada (mín. 8 caracteres).",
      descricaoFail:
        "SENHA_PADRAO ausente ou com menos de 8 caracteres — criar usuário e reset admin podem falhar.",
      integracaoSlugFk: null,
      ok: s.senhaPadraoValida,
    });

    probeSecret(out, counters, {
      nome: "Destinatários — Relatório Diretoria",
      severidade: "aviso",
      descricaoOk: "RELATORIO_DIRETORIA_DESTINATARIOS configurado.",
      descricaoFail:
        "RELATORIO_DIRETORIA_DESTINATARIOS vazio — cron do relatório não envia em produção (body {}).",
      integracaoSlugFk: null,
      ok: s.destinatariosRelatorioConfigurado,
    });

    probeSecret(out, counters, {
      nome: "Destinatários — Agenda do dia",
      severidade: "aviso",
      descricaoOk: "EMAIL_AGENDA_DESTINATARIOS configurado.",
      descricaoFail:
        "EMAIL_AGENDA_DESTINATARIOS vazio — cron da agenda não envia em produção (body {}).",
      integracaoSlugFk: null,
      ok: s.destinatariosAgendaConfigurado,
    });
  }

  for (const integ of snapshot.integracoes) {
    const avaliado = avaliarJobIntegracao(integ, snapshot);
    countSeverity(avaliado.severidade, counters);
    pushProbe(out, {
      nome: integ.nome,
      severidade: avaliado.severidade,
      descricao: avaliado.detalhe,
      integracaoSlugFk: integ.integracaoSlugFk,
    });
  }

  for (const extra of snapshot.extras ?? []) {
    countSeverity(extra.severidade, counters);
    pushProbe(out, extra);
  }

  const { ok, aviso, erro } = counters;
  const resumo =
    erro > 0
      ? `Diagnóstico da plataforma: ${erro} falha(s), ${aviso} atenção(ões), ${ok} OK. Só problemas aparecem nas linhas seguintes.`
      : aviso > 0
        ? `Diagnóstico da plataforma: ${ok} OK, ${aviso} atenção(ões). Nenhuma falha crítica.`
        : `Diagnóstico da plataforma: ${ok} verificação(ões) OK. Nenhuma falha ou atenção.`;

  out.unshift({
    integracao_slug: null,
    tipo: TIPO_DIAGNOSTICO_RESUMO,
    descricao: resumo.slice(0, 2000),
  });

  return out;
}

function passouCorteDoJob(
  kind: PlatformHealthJobKind,
  snapshot: PlatformHealthSnapshot,
): boolean {
  if (kind === "cda") return snapshot.passouHorarioCda;
  if (kind === "social" || kind === "rss" || kind === "email") return snapshot.passouHorarioSocial;
  if (kind === "comercialSpa") return snapshot.passouHorarioComercialSpa ?? false;
  if (kind === "comercialDominio") return snapshot.passouHorarioComercialDominio ?? snapshot.passouHorarioCda;
  if (kind === "comercialCnpj") return snapshot.passouHorarioComercialCnpj ?? false;
  if (kind === "revenueSentinel") return snapshot.passouHorarioRevenueSentinel ?? snapshot.passouHorarioCda;
  return false;
}

function mensagemAtrasoJob(kind: PlatformHealthJobKind): string {
  if (kind === "cda") return "Job diário (4h BRT) ainda não registrou sucesso hoje.";
  if (kind === "social" || kind === "rss" || kind === "email") {
    return "Job agendado (6h BRT) ainda não registrou sucesso hoje.";
  }
  if (kind === "comercialSpa") return "Job diário (7h30 BRT) ainda não registrou sucesso hoje.";
  if (kind === "comercialDominio") return "Job diário (8h BRT) ainda não registrou sucesso hoje.";
  if (kind === "comercialCnpj") return "Job diário (8h30 BRT) ainda não registrou sucesso hoje.";
  if (kind === "revenueSentinel") return "Job diário (~4h20 BRT) ainda não registrou sucesso hoje.";
  return "Sem sucesso registrado na data civil de hoje.";
}

export function avaliarJobIntegracao(
  integ: PlatformHealthIntegrationSnapshot,
  snapshot: PlatformHealthSnapshot,
): { severidade: DiagnosticSeverity; detalhe: string } {
  const kind = integ.jobKind ?? jobKindFromSlug(integ.slug);
  const taxa = integ.taxaErroPct ?? null;

  if (taxa != null && taxa > 5) {
    return { severidade: "erro", detalhe: `Taxa de erro alta (${taxa.toFixed(1)}%).` };
  }
  if (!integ.teveHistorico && !integ.ultimoEm) {
    return { severidade: "aviso", detalhe: "Sem histórico de execução registrado." };
  }
  if (integ.ultimoStatus === "falha" || integ.ultimoStatus === "error") {
    return { severidade: "erro", detalhe: "Última execução com falha." };
  }
  if (integ.atrasoLobby24h) {
    return { severidade: "aviso", detalhe: "Coleta atrasada (mais de 24h sem execução OK)." };
  }
  if (integ.erros24h > 0) {
    return {
      severidade: "aviso",
      detalhe: `${integ.erros24h} ocorrência(s) de erro nas últimas 24 horas.`,
    };
  }
  if (integ.teveHistorico && !integ.okHoje && passouCorteDoJob(kind, snapshot)) {
    return { severidade: "aviso", detalhe: mensagemAtrasoJob(kind) };
  }
  if (integ.teveHistorico && !integ.okHoje && kind === "lobby") {
    return { severidade: "aviso", detalhe: "Sem sucesso registrado na data civil de hoje." };
  }
  return { severidade: "ok", detalhe: "Última execução dentro do esperado." };
}

/** Grava só o resumo + avisos/falhas — OKs ficam no contador do resumo. */
export function techLogsParaGravar(logs: TechLogInsertRow[]): TechLogInsertRow[] {
  return logs.filter(
    (l) =>
      l.tipo === TIPO_DIAGNOSTICO_RESUMO ||
      l.tipo === TIPO_DIAGNOSTICO_AVISO ||
      l.tipo === TIPO_DIAGNOSTICO_ERRO,
  );
}

export function countDiagnosticSummary(logs: TechLogInsertRow[]): {
  ok: number;
  aviso: number;
  erro: number;
} {
  let ok = 0;
  let aviso = 0;
  let erro = 0;
  for (const l of logs) {
    if (l.tipo === TIPO_DIAGNOSTICO_OK) ok++;
    else if (l.tipo === TIPO_DIAGNOSTICO_AVISO) aviso++;
    else if (l.tipo === TIPO_DIAGNOSTICO_ERRO) erro++;
  }
  return { ok, aviso, erro };
}
