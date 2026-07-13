import type { StatusPipelineAgregadora } from "./constants";

export type ComercialOpcao = {
  id: string | null;
  name: string;
};

export type AgregadoraRow = {
  id: string;
  nome: string;
  site: string;
  jogos: number | null;
  status_pipeline: StatusPipelineAgregadora;
  comercial_user_id: string | null;
  comercial_nome: string | null;
  ultimo_contato: string | null;
};

export type AgregadoraHistorico = {
  id: string;
  agregadora_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
  usuario_id: string | null;
  usuario_nome: string | null;
};
