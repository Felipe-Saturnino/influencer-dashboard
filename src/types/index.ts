// ─── ROLES ───────────────────────────────────────────────────────────────────
export type Role = "admin" | "gestor" | "executivo" | "influencer" | "operador";

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
  | "gestao_usuarios"
  | "configuracoes"
  | "ajuda";

// ─── PLATAFORMA / LIVE STATUS ────────────────────────────────────────────────
export type Plataforma = "Twitch" | "YouTube" | "Instagram" | "TikTok" | "Kick";
export type LiveStatus = "agendada" | "realizada" | "nao_realizada";

// ─── LIVE ────────────────────────────────────────────────────────────────────
export interface Live {
  id:               string;
  influencer_id:    string;
  influencer_name?: string;
  titulo:           string;
  data:             string;
  horario:          string;
  plataforma:       Plataforma;
  status:           LiveStatus;
  link?:            string;
  observacao?:      string;
  created_by:       string;
  created_at?:      string;
  updated_at?:      string;
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
export type UtmAliasStatus = "pendente" | "mapeado" | "ignorado";

export interface UtmAlias {
  id:               string;
  utm_source:       string;
  influencer_id:    string | null;
  influencer_name?: string;
  status:           UtmAliasStatus;
  primeiro_visto:   string;
  ultimo_visto:     string;
  total_ftds:       number;
  total_deposit:    number;
  ggr:              number;
  mapeado_por:      string | null;
  mapeado_em:       string | null;
  atualizado_em?:   string;
  criado_em?:       string;
}

// ─── PERMISSOES ──────────────────────────────────────────────────────────────
// Valores sem acento para compatibilidade com TypeScript/Vite no Cloudflare
// "sim"      = acesso total
// "nao"      = sem acesso
// "proprios" = acesso apenas aos dados do proprio escopo
export type PermissaoValor = "sim" | "nao" | "proprios" | null;

export interface RolePermission {
  id:          string;
  role:        Role;
  page_key:    PageKey;
  can_view:    PermissaoValor;
  can_criar:   PermissaoValor;
  can_editar:  PermissaoValor;
  can_excluir: PermissaoValor;
  created_at?: string;
  updated_at?: string;
}

// ─── ESCOPOS DE USUÁRIO ───────────────────────────────────────────────────────
export type ScopeType = "influencer" | "operadora";

export interface UserScope {
  id:         string;
  user_id:    string;
  scope_type: ScopeType;
  scope_ref:  string;
  created_at?: string;
}

// ─── USUÁRIO COMPLETO (para Gestão de Usuários) ───────────────────────────────
export interface UsuarioCompleto {
  id:              string;
  name:            string;
  email:           string;
  role:            Role;
  created_at?:     string;
  last_sign_in_at?: string | null;
  scopes?:         UserScope[];
}
