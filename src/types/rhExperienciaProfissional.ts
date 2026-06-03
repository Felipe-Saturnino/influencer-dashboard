export type RhExperienciaHistoricoAcao = "criar" | "editar" | "excluir";

export interface RhFuncionarioExperiencia {
  id: string;
  rh_funcionario_id: string;
  cargo: string;
  empresa: string;
  /** Primeiro dia do mês (YYYY-MM-DD). */
  mes_ano_inicio: string;
  /** Primeiro dia do mês ou null. */
  mes_ano_fim: string | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

export type RhExperienciaPayload = {
  cargo: string;
  empresa: string;
  mes_ano_inicio: string;
  mes_ano_fim: string | null;
  descricao: string | null;
};
