/**
 * Diagnóstico operacional da plataforma (Status Técnico).
 * Fonte única para a app React e Vitest. A Edge Function repete esta lógica em `index.ts` (deploy em ficheiro único).
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

export interface PlatformHealthSecretsSnapshot {
  cdaConfigurado: boolean;
  githubSocialConfigurado: boolean;
  resendConfigurado: boolean;
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

export function labelTipoTechLog(tipo: string): string {
  const map: Record<string, string> = {
    [TIPO_DIAGNOSTICO_RESUMO]: "Diagnóstico (resumo)",
    [TIPO_DIAGNOSTICO_OK]: "Diagnóstico OK",
    [TIPO_DIAGNOSTICO_AVISO]: "Diagnóstico atenção",
    [TIPO_DIAGNOSTICO_ERRO]: "Diagnóstico falha",
  };
  return map[tipo] ?? tipo;
}

export function buildPlatformHealthTechLogs(snapshot: PlatformHealthSnapshot): TechLogInsertRow[] {
  const out: TechLogInsertRow[] = [];
  let ok = 0;
  let aviso = 0;
  let erro = 0;

  if (!snapshot.secrets.cdaConfigurado) {
    pushProbe(out, {
      nome: "Configuração CDA",
      severidade: "erro",
      descricao: "Credencial da API CDA não configurada nos secrets do projeto.",
      integracaoSlugFk: "casa_apostas",
    });
    erro++;
  } else {
    pushProbe(out, {
      nome: "Configuração CDA",
      severidade: "ok",
      descricao: "Credencial ou modo Reporting API presente.",
      integracaoSlugFk: "casa_apostas",
    });
    ok++;
  }

  if (!snapshot.secrets.githubSocialConfigurado) {
    pushProbe(out, {
      nome: "Configuração Social Media",
      severidade: "aviso",
      descricao: "Token ou repositório GitHub ausente — sync social manual pode falhar.",
      integracaoSlugFk: null,
    });
    aviso++;
  } else {
    pushProbe(out, {
      nome: "Configuração Social Media",
      severidade: "ok",
      descricao: "Secrets do disparo de workflow configurados.",
      integracaoSlugFk: null,
    });
    ok++;
  }

  if (!snapshot.secrets.resendConfigurado) {
    pushProbe(out, {
      nome: "Configuração e-mail (Resend)",
      severidade: "aviso",
      descricao: "Chave Resend ausente — relatório e agenda por e-mail podem falhar.",
      integracaoSlugFk: null,
    });
    aviso++;
  } else {
    pushProbe(out, {
      nome: "Configuração e-mail (Resend)",
      severidade: "ok",
      descricao: "Chave Resend configurada.",
      integracaoSlugFk: null,
    });
    ok++;
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

    if (severidade === "ok") ok++;
    else if (severidade === "aviso") aviso++;
    else erro++;

    pushProbe(out, {
      nome: integ.nome,
      severidade,
      descricao: detalhe,
      integracaoSlugFk: integ.integracaoSlugFk,
    });
  }

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
