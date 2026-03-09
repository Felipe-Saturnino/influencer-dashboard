// ─── ROLES ───────────────────────────────────────────────────────────────────
export type Role = "admin" | "influencer";

// ─── USER ────────────────────────────────────────────────────────────────────
export interface User {
  id:    string;
  name:  string;
  email: string;
  role:  Role;
}

// ─── PAGE KEYS ───────────────────────────────────────────────────────────────
export type PageKey =
  | "dash_overview"
  | "dash_conversao"
  | "dash_financeiro"
  | "agenda"
  | "resultados"
  | "feedback"
  | "influencers"
  | "financeiro"
  | "gestao_links"
  | "configuracoes"
  | "ajuda";

// ─── PLATAFORMA / LIVE STATUS ────────────────────────────────────────────────
export type Plataforma = "Twitch" | "YouTube" | "Instagram" | "TikTok" | "Kick";
export type LiveStatus = "agendada" | "realizada" | "nao_realizada";

// ─── LIVE ────────────────────────────────────────────────────────────────────
export interface Live {
  id:            string;
  influencer_id: string;
  influencer_name?: string;
  titulo:        string;
  data:          string;
  horario:       string;
  plataforma:    Plataforma;
  status:        LiveStatus;
  link?:         string;
  observacao?:   string;
  created_by:    string;
  created_at?:   string;
  updated_at?:   string;
}

// ─── LIVE RESULTADO ──────────────────────────────────────────────────────────
export interface LiveResultado {
  id:            string;
  live_id:       string;
  duracao_horas: number;
  duracao_min:   number;
  media_views:   number;
  max_views?:    number;
  created_at?:   string;
  updated_at?:   string;
}

// ─── PAGAMENTO STATUS ────────────────────────────────────────────────────────
export type PagamentoStatus = "em_analise" | "a_pagar" | "pago" | "perfil_incompleto";

// ─── CICLO PAGAMENTO ─────────────────────────────────────────────────────────
export interface CicloPagamento {
  id:          string;
  data_inicio: string;
  data_fim:    string;
  fechado_em?: string;
  criado_em?:  string;
}

// ─── PAGAMENTO ───────────────────────────────────────────────────────────────
export interface Pagamento {
  id:               string;
  ciclo_id:         string;
  influencer_id:    string;
  influencer_name?: string;
  horas_realizadas: number;
  cache_hora:       number;
  total:            number;
  status:           PagamentoStatus;
  aprovado_por?:    string;
  pago_em?:         string;
  criado_em?:       string;
}

// ─── UTM ALIAS ───────────────────────────────────────────────────────────────
export type UtmAliasStatus = "pendente" | "mapeado" | "descartado";

export interface UtmAlias {
  id:             string;
  utm_source:     string;
  influencer_id?: string;
  status:         UtmAliasStatus;
  criado_em?:     string;
}
