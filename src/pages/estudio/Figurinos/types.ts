export type RhFigurinoStatus = "available" | "borrowed" | "maintenance" | "discarded";

/** Aba de UI — `fixed` filtra status `borrowed` com withdrawal_type = fixo. */
export type FigurinosAba = RhFigurinoStatus | "fixed";

export type RhFigurinoCondition = "good" | "damaged" | "needs_cleaning";

export type RhEmprestimoStatus = "active" | "returned";

/** Retirada ativa: empréstimo reembolsável vs uso fixo. */
export type RhWithdrawalType = "emprestar" | "fixo";

export type RhReturnCondition = "good" | "needs_cleaning" | "damaged";

/** Linha da relação N:N com estúdios (embed Supabase). */
export interface RhFigurinoPecaEstudio {
  estudio_slug: string;
}

/** Legado — mantido para peças antigas / sync operadora. */
export interface RhFigurinoPecaOperadora {
  operadora_slug: string;
}

export interface RhFigurinoPeca {
  id: string;
  rh_figurino_peca_estudios?: RhFigurinoPecaEstudio[];
  rh_figurino_peca_operadoras?: RhFigurinoPecaOperadora[];
  code: string;
  barcode: string;
  name: string;
  category: string;
  size: string;
  genero: string;
  cor: string;
  description: string | null;
  status: RhFigurinoStatus;
  condition: RhFigurinoCondition;
  purchase_date: string | null;
  maintenance_reason: string | null;
  maintenance_entered_at: string | null;
  maintenance_entered_by: string | null;
  discarded_at: string | null;
  discard_reason: string | null;
  discarded_by: string | null;
  atende_todos_estudios?: boolean;
  atende_staff?: boolean;
  created_at: string;
  updated_at: string;
}

export interface RhFigurinoEmprestimo {
  id: string;
  item_id: string;
  borrower_name: string;
  borrower_ref: string | null;
  /** Ausente em linhas antigas; tratar como `emprestar`. */
  withdrawal_type?: RhWithdrawalType;
  loaned_by: string;
  loaned_at: string;
  returned_at: string | null;
  return_condition: RhReturnCondition | null;
  return_notes: string | null;
  returned_by: string | null;
  status: RhEmprestimoStatus;
}

export interface RhFigurinoStatusHist {
  id: string;
  item_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string;
  notes: string | null;
  changed_at: string;
}
