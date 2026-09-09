export type RhSolicitacaoStatus = "em_analise" | "aprovado" | "rejeitado" | "aplicado";
export type RhSolicitacaoTipo =
  | "atestado"
  | "vagas"
  | "reuniao_rh"
  | "reuniao_lideranca"
  | "feedback";
export type RhSolicitacaoAbonoRemunerado = "sim" | "nao";

export type RhSolicitacaoFiltroStatus = RhSolicitacaoStatus | "todos";
export type RhSolicitacaoFiltroTipo = RhSolicitacaoTipo | "todas";

export type RhSolicitacaoAba = "atestados" | "reunioes" | "vagas" | "feedback";

export type RhSolicitacaoFeedbackOrigem = "controle_turno" | "solicitacoes";

export type RhSolicitacaoFeedbackRecomendacao =
  | "orientacao"
  | "alinhamento"
  | "notif_descumprimento"
  | "notif_suspensao"
  | "persistencia";

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
  atendido_por: string | null;
  abono_remunerado: RhSolicitacaoAbonoRemunerado | null;
  rh_calendario_acao_id: string | null;
  reuniao_dia_iso: string | null;
  feedback_recomendacao: RhSolicitacaoFeedbackRecomendacao | null;
  feedback_origem: RhSolicitacaoFeedbackOrigem | null;
  escala_ct_feedback_id: string | null;
  lideranca_nome: string | null;
  evidencias_storage_paths: string[] | null;
  calendario_acao:
    | { payload: { turno?: string; dia_iso?: string; motivo?: string } | null }
    | { payload: { turno?: string; dia_iso?: string; motivo?: string } | null }[]
    | null;
  solicitante:
    | {
        id: string;
        nome: string;
        org_time?: { nome: string } | { nome: string }[] | null;
      }
    | {
        id: string;
        nome: string;
        org_time?: { nome: string } | { nome: string }[] | null;
      }[]
    | null;
  atendente: { id: string; name: string } | { id: string; name: string }[] | null;
  vaga: { id: string; titulo: string } | { id: string; titulo: string }[] | null;
}
