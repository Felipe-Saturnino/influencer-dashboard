import type { PrioridadeIntegracao, StatusIntegracao, TipoIntegracao } from "./constants";

export type IntegracaoRow = {
  id: string;
  marca_id: string;
  operador_nome: string;
  prioridade: PrioridadeIntegracao;
  tipo: TipoIntegracao;
  caminho: string | null;
  pam: string | null;
  agregadora: string | null;
  status: StatusIntegracao;
  comentario: string | null;
};

export type IntegracaoHistorico = {
  id: string;
  integracao_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
  usuario_id: string | null;
  usuario_nome?: string | null;
};

/** Marca da aba Fechado do Pipeline B2B (Dedicada/Network em Contrato Assinado ou Ativo). */
export type MarcaFechadaOpcao = {
  id: string;
  nome: string;
};
