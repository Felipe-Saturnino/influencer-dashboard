export type BancaStatus = "solicitado" | "aprovado" | "liberado";
export type BancaStatusConta = "liberada" | "bloqueada";

export interface BancaRowDb {
  id: string;
  influencer_id: string;
  operadora_slug: string;
  id_operadora_exibicao: string | null;
  valor: number;
  status: BancaStatus;
  solicitado_em: string;
  aprovado_em: string | null;
  aprovado_por: string | null;
  liberado_em: string | null;
  liberado_por: string | null;
}

/** Dados de `influencer_perfil` + e-mail usados na Banca. */
export type BancaPerfilMapRow = {
  nome: string;
  cpf: string;
  email: string;
  banca_status_conta: BancaStatusConta;
  banca_data_bloqueio: string | null;
  banca_data_desbloqueio: string | null;
  perfil_status: string | null;
};

export const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const STATUS_BANCA: Record<BancaStatus, { label: string; color: string }> = {
  solicitado: { label: "Solicitado", color: "#f59e0b" },
  aprovado:   { label: "Aprovado",   color: "#6b7fff" },
  liberado:   { label: "Liberado",   color: "#10b981" },
};
