import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { isoDateBrasilFromInstant } from "../../../lib/dateBrasil";

/** Horários agendados no GitHub Actions (America/Sao_Paulo) — ver `.github/workflows/*.yml`. */
export const HORARIO_AGENDADO_BR = {
  cda: 4,
  social: 6,
  spinRss: 6,
  comercialSpa: 7,
  comercialDominio: 8,
  /** Enriquecimento cidade/UF — cron 8h30 BRT; checagem após 9h para evitar falso positivo antes do job. */
  comercialCnpj: 9,
  emailDiretoria: 6,
  emailAgenda: 6,
} as const;

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

export function nomeIntegracaoStatusTecnicoUi(slug: string, nome: string): string {
  if (slug === "comercial_spa_lista") return LABEL_UI_COMERCIAL_SPA_LISTA;
  if (slug === "comercial_dominio_validacao") return LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO;
  if (slug === "comercial_cnpj_enriquecimento") return LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE;
  if (slug === "cs_atendimento_outlook") return LABEL_UI_CS_ATENDIMENTO_OUTLOOK;
  return nome;
}

export const ERRO_SYNC_CDA =
  "Não foi possível sincronizar os dados CDA. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_SOCIAL =
  "Não foi possível disparar o sync de Social Media. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_SPIN_RSS =
  "Não foi possível sincronizar o feed Spin na Rede. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_CS_OUTLOOK =
  "Não foi possível ingerir e-mails do CS Atendimento. Verifique a Edge Function, secrets do Graph e tente novamente.";
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
