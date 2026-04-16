export type RhFigurinoStatus = "available" | "borrowed" | "maintenance" | "discarded";

export type RhFigurinoCondition = "good" | "damaged" | "needs_cleaning";

export type RhEmprestimoStatus = "active" | "returned";

export type RhReturnCondition = "good" | "needs_cleaning" | "damaged";

export interface RhFigurinoPeca {
  id: string;
  operadora_slug: string;
  code: string;
  barcode: string;
  name: string;
  category: string;
  size: string;
  color: string | null;
  description: string | null;
  status: RhFigurinoStatus;
  condition: RhFigurinoCondition;
  purchase_date: string | null;
  purchase_price: number | null;
  maintenance_reason: string | null;
  maintenance_entered_at: string | null;
  discarded_at: string | null;
  discard_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RhFigurinoEmprestimo {
  id: string;
  item_id: string;
  borrower_name: string;
  borrower_ref: string | null;
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
