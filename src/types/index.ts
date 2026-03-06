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
  | "financeiro"
  | "gestao_links"
  | "configuracoes"
  | "ajuda";

export type Plataforma = "Twitch" | "YouTube" | "Instagram" | "TikTok" | "Kick";

export type LiveStatus = "agendada" | "realizada" | "nao_realizada";

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

export interface LiveResultado {
  id?:           string;
  live_id:       string;
  duracao_horas: number;
  duracao_min:   number;
  media_views:   number;
  max_views:     number;
  observacao?:   string;
}

// ─── Financeiro ───────────────────────────────────────────────────────────────

export type PagamentoStatus =
  | "em_analise"
  | "a_pagar"
  | "perfil_incompleto"
  | "pago";

export interface CicloPagamento {
  id:          string;
  data_inicio: string;
  data_fim:    string;
  fechado_em:  string | null;
  criado_em?:  string;
}

export interface Pagamento {
  id:               string;
  ciclo_id:         string;
  influencer_id:    string;
  influencer_name?: string;
  horas_realizadas: number;
  cache_hora:       number;
  total:            number;
  status:           PagamentoStatus;
  aprovado_por:     string | null;
  pago_em:          string | null;
  criado_em?:       string;
}

// ─── Gestão de Links ─────────────────────────────────────────────────────────

export type UtmAliasStatus = "pendente" | "mapeado" | "ignorado";

export interface UtmAlias {
  id:                  string;
  utm_source:          string;
  influencer_id:       string | null;
  influencer_name?:    string;
  status:              UtmAliasStatus;
  total_visits:        number;
  total_registrations: number;
  total_ftds:          number;
  total_deposit:       number;
  total_withdrawal:    number;
  ggr:                 number;
  primeiro_visto:      string;
  ultimo_visto:        string;
  mapeado_por:         string | null;
  mapeado_em:          string | null;
}
