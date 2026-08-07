/** Tipos do domínio Estúdio → Incidentes → aba Sinais (`sm_sinais`). */

export type SmSinalFuncionarioEmbed = {
  id: string;
  nome: string;
  staff_nickname: string | null;
};

export type SmSinalMesaEmbed = {
  id: string;
  nome_mesa: string | null;
  numero_mesa: string | null;
  tipo_jogo: string | null;
};

export type SmSinalEstudioEmbed = {
  slug: string;
  nome: string;
};

export type SmSinalRow = {
  id: string;
  signal_id: string;
  ambiente: string;
  issued_at: string;
  taken_at: string | null;
  timer_stopped_at: string;
  issued_at_brt: string;
  taken_at_brt: string | null;
  timer_stopped_at_brt: string;
  dia_brt: string;
  table_id: string;
  game_type: string | null;
  signal_type: string;
  resolution_conclusion: string | null;
  creator_id: string | null;
  creator_screen_name: string | null;
  creator_type: string | null;
  creator_funcionario_id: string | null;
  resolver_id: string;
  resolver_screen_name: string | null;
  resolver_funcionario_id: string | null;
  mesa_id: string | null;
  estudio_slug: string | null;
  mesa: SmSinalMesaEmbed | null;
  estudio: SmSinalEstudioEmbed | null;
  creator: SmSinalFuncionarioEmbed | null;
  resolver: SmSinalFuncionarioEmbed | null;
};

export type SmSinalStaffOption = {
  id: string;
  nome: string;
  nickname: string | null;
};
