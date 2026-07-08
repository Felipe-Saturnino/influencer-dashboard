export type CsChamadoStatus = "aberto" | "em_andamento" | "arquivado";
export type CsChamadoOrigem = "site_spin" | "email";
export type CsChamadoAtuacao = "operador" | "provedor" | "parceria" | "agregador" | "jogador" | "outros";
export type CsChamadoHistoricoTipo =
  | "abertura"
  | "inicio_atendimento"
  | "anotacao"
  | "alteracao_status"
  | "arquivamento";

export type CsChamadoFiltroStatus = CsChamadoStatus | "todos";
export type CsChamadoFiltroAtendente = "todos" | "nenhum" | string;

export interface CsChamadoHistoricoRow {
  id: string;
  chamado_id: string;
  tipo_acao: CsChamadoHistoricoTipo;
  usuario_id: string | null;
  usuario_nome: string;
  anotacao: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  created_at: string;
}

export interface CsChamadoProfileEmbed {
  id: string;
  name: string | null;
}

export interface CsChamadoRow {
  id: string;
  protocolo: string;
  origem: CsChamadoOrigem;
  status: CsChamadoStatus;
  nome_completo: string;
  telefone: string | null;
  email: string;
  atuacao: CsChamadoAtuacao;
  empresa: string | null;
  mensagem: string;
  /** Preenchido quando origem = email (assunto do e-mail recebido). */
  assunto?: string | null;
  /** Anexos do e-mail (origem = email). */
  anexos?: CsChamadoEmailAnexo[] | null;
  inicio_atendimento_em: string | null;
  arquivado_em: string | null;
  atendente_id: string | null;
  created_at: string;
  updated_at: string;
  atendente?: CsChamadoProfileEmbed | CsChamadoProfileEmbed[] | null;
  historico?: CsChamadoHistoricoRow[] | null;
}

export interface CsChamadoEmailAnexo {
  id: string;
  nome: string;
  /** URL direta (preview/mock) ou resolvida após signed URL. */
  url?: string | null;
  /** Caminho no Storage Supabase (integração Outlook). */
  storage_path?: string | null;
  content_type?: string | null;
}

export interface CsAtendenteFiltroOption {
  profileId: string;
  nome: string;
}
