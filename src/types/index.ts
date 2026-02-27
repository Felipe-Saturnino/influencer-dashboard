export type Role = "admin" | "influencer";

export interface User {
  id:    string;
  name:  string;
  email: string;
  role:  Role;
}

export type PageKey =
  | "dashboard"
  | "agenda"
  | "resultados"
  | "feedback"
  | "influencers"
  | "configuracoes"
  | "ajuda";

export type Plataforma = "Twitch" | "YouTube" | "Instagram" | "TikTok" | "Kick";
export type LiveStatus = "agendada" | "realizada" | "nao_realizada";

export interface LiveResultado {
  id?:           string;
  live_id:       string;
  duracao_horas: number;
  duracao_min:   number;
  media_views:   number;
  max_views:     number;
  observacao?:   string;
}

export interface Live {
  id:               string;
  influencer_id:    string;
  influencer_name?: string;
  created_by?:      string;
  titulo:           string;
  data:             string;
  horario:          string;
  plataforma:       Plataforma;
  status:           LiveStatus;
  link?:            string;
  created_at?:      string;
}

// ── Financeiro ─────────────────────────────────────────────────────
export interface CicloPagamento {
  id:          string;
  data_inicio: string; // ISO date
  data_fim:    string;
  fechado_em:  string | null;
  criado_em?:  string;
}

export interface Pagamento {
  id:               string;
  ciclo_id:         string;
  influencer_id:    string;
  influencer_name?: string; // join com profiles
  horas_realizadas: number;
  cache_hora:       number;
  total:            number;
  status:           PagamentoStatus;
  aprovado_por:     string | null;
  pago_em:          string | null;
  criado_em?:       string;
}

export type PagamentoStatus =
  | 'em_analise'
  | 'a_pagar'
  | 'pago'
  | 'perfil_incompleto';
