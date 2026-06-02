export type MesaSpinCadastroRow = {
  id: string;
  operadora_slug: string;
  nome_mesa: string;
  tipo_jogo: string;
  numero_mesa: string | null;
  mesa_identificacao: string;
  mesa_identificacao_operadora: string | null;
  created_at: string;
  updated_at: string;
  /** PostgREST pode devolver objeto ou array de 1 elemento conforme hint da FK. */
  operadoras: { nome: string } | { nome: string }[] | null;
};

export const TIPOS_JOGO = ["Blackjack", "Roleta", "Baccarat", "Futebol Brasileiro", "Poker", "Outro"] as const;

export function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
}

export function nomeOperadoraJoin(row: MesaSpinCadastroRow): string | undefined {
  const o = row.operadoras;
  if (o == null) return undefined;
  if (Array.isArray(o)) return o[0]?.nome;
  return o.nome;
}

export function tipoJogoInitial(edit: MesaSpinCadastroRow | null): { preset: string; outro: string } {
  if (!edit?.tipo_jogo) return { preset: "Blackjack", outro: "" };
  const tj = edit.tipo_jogo.trim();
  if ((TIPOS_JOGO as readonly string[]).includes(tj)) return { preset: tj, outro: "" };
  return { preset: "Outro", outro: tj };
}
