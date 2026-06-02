import type { Role } from "../../../types";

// ── Constantes ─────────────────────────────────────────────────────────────────

export const MESES_NOMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export const STATUS_PAG: Record<string, { label: string; color: string }> = {
  em_analise: { label: "Em análise", color: "#f59e0b" },
  a_pagar: { label: "Aguard. pagamento", color: "#a78bfa" },
  pago: { label: "Pago", color: "#22c55e" },
};

export const STATUS_INFLUENCER: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "#22c55e" },
  inativo: { label: "Inativo", color: "#f59e0b" },
  cancelado: { label: "Cancelado", color: "#e84025" },
};
