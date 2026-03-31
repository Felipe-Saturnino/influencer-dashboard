// ─── ROLES ───────────────────────────────────────────────────────────────────
export type Role = "admin" | "gestor" | "executivo" | "influencer" | "operador" | "agencia"; // ✅ agencia adicionado

// ─── USER ────────────────────────────────────────────────────────────────────
export interface User {
  id:    string;
  name:  string;
  email: string;
  role:  Role;
  ativo?: boolean;
  must_change_password?: boolean;
}

// ─── PAGE KEYS ───────────────────────────────────────────────────────────────
export type PageKey =
  | "home"
  | "dash_overview"
  | "dash_overview_influencer"
  | "dash_conversao"
  | "dash_financeiro"
  | "mesas_spin"
  | "dash_midias_sociais"
  | "agenda"
  | "resultados"
  | "feedback"
  | "influencers"
  | "scout"
  | "financeiro"
  | "banca_jogo"
  | "gestao_links"
  | "campanhas"
  | "gestao_usuarios"
  | "gestao_operadoras" // ✅ adicionado para Etapa 5
  | "gestao_dealers"
  | "central_notificacoes"
  | "status_tecnico"
  | "roteiro_mesa"
  | "playbook_influencers"
  | "links_materiais"
  | "configuracoes"
  | "ajuda";

// ─── PLATAFORMA / LIVE STATUS ────────────────────────────────────────────────
export type Plataforma = "Twitch" | "YouTube" | "Instagram" | "TikTok" | "Kick" | "Discord" | "WhatsApp" | "Telegram";
export type LiveStatus = "agendada" | "realizada" | "nao_realizada";

// ─── LIVE ────────────────────────────────────────────────────────────────────
export interface Live {
  id:               string;
  influencer_id:    string;
  influencer_name?: string;
  operadora_slug?:  string;
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
  operadora_slug:   string;
  influencer_name?: string;
  horas_realizadas: number;
  cache_hora:       number;
  total:            number;
  status:           PagamentoStatus;
  aprovado_por?:    string;
  pago_em?:         string;
  criado_em?:       string;
}

// ─── CAMPANHA ─────────────────────────────────────────────────────────────────
export interface Campanha {
  id:              string;
  nome:            string;
  operadora_slug?: string | null;
  ativo:           boolean;
  created_at?:     string;
  updated_at?:     string;
}

// ─── UTM ALIAS ───────────────────────────────────────────────────────────────
export type UtmAliasStatus = "pendente" | "mapeado" | "ignorado";

export interface UtmAlias {
  id:               string;
  utm_source:       string;
  operadora_slug?:  string;
  influencer_id:    string | null;
  campanha_id:      string | null;
  influencer_name?: string;
  campanha_nome?:   string;
  status:           UtmAliasStatus;
  primeiro_visto:   string;
  ultimo_visto:     string;
  total_ftds:       number;
  total_deposit:    number;
  total_withdrawal?: number;
  /** @deprecated Use total_deposit - total_withdrawal. Coluna removida do banco. */
  ggr?:             number;
  mapeado_por:      string | null;
  mapeado_em:       string | null;
  atualizado_em?:   string;
  criado_em?:       string;
}

// ─── PERMISSOES ──────────────────────────────────────────────────────────────
// "sim" = acesso total | "nao" = sem acesso | "proprios" = apenas dados do proprio escopo
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

// ─── ESCOPOS DE USUARIO ───────────────────────────────────────────────────────
// "influencer"   → scope_ref = UUID do influencer
// "operadora"    → scope_ref = slug da operadora (ex: "blaze")
// "agencia_par"  → scope_ref = "uuid_influencer:slug_operadora" (ex: "abc-123:blaze")
// "gestor_tipo"  → scope_ref = operacoes | marketing | afiliados | geral
export type ScopeType = "influencer" | "operadora" | "agencia_par" | "gestor_tipo";

export type GestorTipoSlug = "operacoes" | "marketing" | "afiliados" | "geral";

export interface UserScope {
  id:          string;
  user_id:     string;
  scope_type:  ScopeType;
  scope_ref:   string;
  created_at?: string;
}

// ─── DEALER ──────────────────────────────────────────────────────────────────
export type DealerGenero = "feminino" | "masculino";
export type DealerTurno = "manha" | "tarde" | "noite";
export type DealerJogo = "blackjack" | "roleta" | "baccarat" | "mesa_vip";

export interface Dealer {
  id:               string;
  nome_real:        string;
  nickname:         string;
  fotos:            string[];
  genero:           DealerGenero;
  turno:            DealerTurno;
  jogos:            DealerJogo[];
  operadora_slug:   string | null;
  perfil_influencer: string | null;
  status?:          "aprovado" | "pendente";
  vip?:             boolean;
  created_at?:      string;
  updated_at?:      string;
}

// ─── OPERADORA ───────────────────────────────────────────────────────────────
// ✅ Novo tipo — espelha a tabela public.operadoras
export interface Operadora {
  slug:           string;
  nome:           string;
  ativo:          boolean;
  criado_em?:     string;
  /** Brandguide: cor principal (ex: #7c3aed) */
  cor_primaria?:    string | null;
  /** Brandguide: cor secundária */
  cor_secundaria?:  string | null;
  /** Brandguide: cor de destaque */
  cor_accent?:      string | null;
  /** Brandguide: cor de fundo */
  cor_background?:  string | null;
  /** Brandguide: cor dos textos */
  cor_textos?:      string | null;
  /** Brandguide: cor dos ícones */
  cor_icones?:      string | null;
  /** Brandguide: URL do logo */
  logo_url?:        string | null;
  /** Brandguide: URL da fonte customizada (.woff2, .woff, .ttf) */
  font_url?:        string | null;
}

// ─── OPERADORA PAGES ─────────────────────────────────────────────────────────
/** Páginas que operadores de cada operadora podem acessar (todos veem o mesmo) */
export interface OperadoraPage {
  id:             string;
  operadora_slug: string;
  page_key:       PageKey;
  created_at?:    string;
}

/** Páginas habilitadas por tipo de gestor (aba Gestores) */
export interface GestorTipoPage {
  id:                 string;
  gestor_tipo_slug:   GestorTipoSlug;
  page_key:           PageKey;
  created_at?:        string;
}

// ─── INFLUENCER OPERADORA ────────────────────────────────────────────────────
// ✅ Novo tipo — espelha a tabela public.influencer_operadoras
export interface InfluencerOperadora {
  influencer_id:   string;
  operadora_slug:  string;
  operadora_nome?: string; // join opcional com operadoras.nome
  id_operadora?:   string;
  ativo:           boolean;
  criado_em?:      string;
  atualizado_em?:  string;
}

// ─── USUARIO COMPLETO (para Gestao de Usuarios) ───────────────────────────────
export interface UsuarioCompleto {
  id:               string;
  name:             string;
  email:            string;
  role:             Role;
  ativo?:           boolean;
  created_at?:      string;
  last_sign_in_at?: string | null;
  scopes?:          UserScope[];
}


