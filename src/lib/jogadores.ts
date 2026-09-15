/** Origem de aquisição do jogador. TAP grava `tap_utm` + utm_source em `origem`. */
export const JOGADOR_ORIGEM_TIPO = {
  tapUtm: "tap_utm",
  campanha: "campanha",
  afiliado: "afiliado",
  direto: "direto",
  rsAttribution: "rs_attribution",
} as const;

export type JogadorOrigemTipo = (typeof JOGADOR_ORIGEM_TIPO)[keyof typeof JOGADOR_ORIGEM_TIPO];

export const JOGADOR_ORIGEM_SEM_UTM = "sem_utm";

export type JogadorCdaConta = "influencers" | "afiliados";

/** Dimensão `jogadores`. GGR/turnover/rodadas Spin ficam nulos até o job Revenue Sentinel. */
export type JogadorRow = {
  id: string;
  operadora_slug: string;
  ext_customer_id: string;
  registration_id: string | null;
  origem_tipo: JogadorOrigemTipo;
  origem: string;
  cda_conta: JogadorCdaConta | null;
  influencer_id: string | null;
  registrado_em: string | null;
  primeira_atividade: string | null;
  ultima_atividade: string | null;
  player_id_bko: string | null;
  identity_key: string | null;
  jogou_spin: boolean | null;
  jogou_outros: boolean | null;
  primeira_rodada_spin: string | null;
  ultima_rodada_spin: string | null;
  rodadas_spin: number;
  apostas_spin: number;
  ggr_spin: number | null;
  turnover_spin: number | null;
  rodadas_por_jogo: Record<string, number>;
  rodadas_por_mesa: Array<{
    estudio?: string;
    mesa?: string;
    rodadas?: number;
    ggr?: number;
    turnover?: number;
  }>;
  created_at: string;
  atualizado_em: string;
};

export type JogadorMetricaDiariaRow = {
  jogador_id: string | null;
  data: string;
  operadora_slug: string;
  origem_tipo: JogadorOrigemTipo;
  origem: string;
  ext_customer_id: string;
  registration_id: string | null;
  cda_conta: JogadorCdaConta | null;
  influencer_id: string | null;
  visit_count: number;
  registration_count: number;
  ftd_count: number;
  ftd_total: number;
  deposit_count: number;
  deposit_total: number;
  withdrawal_count: number;
  withdrawal_total: number;
  rodadas_spin: number;
  apostas_spin: number;
  ggr_spin: number | null;
  turnover_spin: number | null;
  jogou_spin: boolean | null;
  jogou_outros: boolean | null;
  rodadas_por_jogo: Record<string, number>;
  rodadas_por_mesa: JogadorRow["rodadas_por_mesa"];
  fonte: "tap" | "rs";
  created_at: string;
};
