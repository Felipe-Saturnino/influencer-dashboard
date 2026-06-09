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
}

export interface PlatformHealthIntegrationSnapshot {
  slug: string | null;
  nome: string;
  integracaoSlugFk: string | null;
  ultimoStatus: "ok" | "falha" | "success" | "error" | null;
  ultimoEm: string | null;
  okHoje: boolean;
  teveHistorico: boolean;
  erros24h: number;
}

export interface PlatformHealthSnapshot {
  hojeIso: string;
  passouHorarioCda: boolean;
  passouHorarioSocial: boolean;
  secrets: PlatformHealthSecretsSnapshot;
  integracoes: PlatformHealthIntegrationSnapshot[];
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
    let severidade: DiagnosticSeverity = "ok";
    let detalhe = "Última execução dentro do esperado.";

    if (!integ.teveHistorico && !integ.ultimoEm) {
      severidade = "aviso";
      detalhe = "Sem histórico de execução registrado.";
    } else if (integ.ultimoStatus === "falha" || integ.ultimoStatus === "error") {
      severidade = "erro";
      detalhe = "Última execução com falha.";
    } else if (integ.erros24h > 0) {
      severidade = "aviso";
      detalhe = `${integ.erros24h} ocorrência(s) de erro nas últimas 24 horas.`;
    } else if (integ.teveHistorico && !integ.okHoje) {
      const atraso =
        integ.nome.includes("CDA") && snapshot.passouHorarioCda
          ? "Job diário (4h BRT) ainda não registrou sucesso hoje."
          : (integ.nome.includes("Social") || integ.nome.includes("RSS") || integ.nome.includes("E-mail")) &&
              snapshot.passouHorarioSocial
            ? "Job agendado (6h BRT) ainda não registrou sucesso hoje."
            : "Sem sucesso registrado na data civil de hoje.";
      severidade = "aviso";
      detalhe = atraso;
    }

    countSeverity(severidade, counters);

    pushProbe(out, {
      nome: integ.nome,
      severidade,
      descricao: detalhe,
      integracaoSlugFk: integ.integracaoSlugFk,
    });
  }

  const { ok, aviso, erro } = counters;
  const resumo =
    erro > 0
      ? `Diagnóstico manual concluído: ${erro} falha(s), ${aviso} atenção(ões), ${ok} OK. Revise as linhas abaixo.`
      : aviso > 0
        ? `Diagnóstico manual concluído: ${ok} OK, ${aviso} atenção(ões). Nenhuma falha crítica.`
        : `Diagnóstico manual concluído: ${ok} verificação(ões) OK. Nenhuma falha ou atenção.`;

  out.unshift({
    integracao_slug: null,
    tipo: TIPO_DIAGNOSTICO_RESUMO,
    descricao: resumo.slice(0, 2000),
  });

  return out;
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
