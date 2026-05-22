export const MSG_SEM_PERMISSAO = "Você não tem permissão para visualizar esta página.";

export const ERRO_SYNC_CDA =
  "Não foi possível sincronizar os dados CDA. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_SOCIAL =
  "Não foi possível disparar o sync de Social Media. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_SPIN_RSS =
  "Não foi possível sincronizar o feed Spin na Rede. Verifique a Edge Function e tente novamente.";
export const ERRO_SYNC_LOBBY_BLAZE =
  "Não foi possível executar o monitor Lobby Blaze. Verifique a Edge Function e tente novamente.";
export const ERRO_EMAIL_DIRETORIA =
  "Não foi possível enviar o relatório para a diretoria. Verifique a função e tente novamente.";
export const ERRO_EMAIL_AGENDA =
  "Não foi possível enviar o e-mail de agenda. Verifique a função e tente novamente.";

export const ERRO_REDE_EDGE =
  "Não foi possível chegar à Edge Function (rede, firewall, bloqueador ou CORS). Abra F12 → Rede, confira se a função está publicada no Supabase e tente novamente.";

export const MODAL_OVERLAY_BG = "rgba(0,0,0,0.65)";

export function ctaGradientStatus(
  brand: { useBrand: boolean },
  disabled: boolean,
  cinza: string,
): string {
  if (disabled) return cinza;
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
}

export function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
}
