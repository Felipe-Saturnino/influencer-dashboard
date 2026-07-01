export type RhSolicitacaoStatus = "em_analise" | "aprovado" | "rejeitado";
export type RhSolicitacaoTipo = "atestado" | "vagas" | "reuniao_rh";
export type RhSolicitacaoAbonoRemunerado = "sim" | "nao";

export type RhSolicitacaoFiltroStatus = RhSolicitacaoStatus | "todos";
export type RhSolicitacaoFiltroTipo = RhSolicitacaoTipo | "todas";

export interface RhSolicitacaoRow {
  id: string;
  created_at: string;
  updated_at: string;
  tipo: RhSolicitacaoTipo;
  status: RhSolicitacaoStatus;
  descricao: string;
  observacao_rh: string | null;
  motivo_rejeicao: string | null;
  atestado_inicio: string | null;
  atestado_fim: string | null;
  atestado_storage_path: string | null;
  atestado_file_name: string | null;
  rh_vaga_id: string | null;
  atendido_em: string | null;
  abono_remunerado: RhSolicitacaoAbonoRemunerado | null;
  rh_calendario_acao_id: string | null;
  reuniao_dia_iso: string | null;
  calendario_acao:
    | { payload: { turno?: string; dia_iso?: string; motivo?: string } | null }
    | { payload: { turno?: string; dia_iso?: string; motivo?: string } | null }[]
    | null;
  solicitante: { id: string; nome: string } | { id: string; nome: string }[] | null;
  vaga: { id: string; titulo: string } | { id: string; titulo: string }[] | null;
}
