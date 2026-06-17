export type MesaSpinCadastroRow = {
  id: string;
  operadora_slug: string;
  estudio_slug: string | null;
  nome_mesa: string;
  tipo_jogo: string;
  numero_mesa: string | null;
  mesa_identificacao: string;
  mesa_identificacao_operadora: string | null;
  created_at: string;
  updated_at: string;
  /** PostgREST pode devolver objeto ou array de 1 elemento conforme hint da FK. */
  operadoras: { nome: string } | { nome: string }[] | null;
  estudios_spin: { nome: string } | { nome: string }[] | null;
};

export type EstudioSpinRow = {
  id: string;
  slug: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  estudios_spin_operadoras: { operadora_slug: string; operadoras: { nome: string } | { nome: string }[] | null }[];
};

export type MesaOperadoraIdentRow = {
  mesa_id: string;
  operadora_slug: string;
  mesa_identificacao_operadora: string | null;
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

export function nomeEstudioJoin(row: MesaSpinCadastroRow): string | undefined {
  const e = row.estudios_spin;
  if (e == null) return undefined;
  if (Array.isArray(e)) return e[0]?.nome;
  return e.nome;
}

export function nomesOperadorasEstudio(row: EstudioSpinRow): string[] {
  return (row.estudios_spin_operadoras ?? [])
    .map((j) => {
      const o = j.operadoras;
      if (o == null) return j.operadora_slug;
      if (Array.isArray(o)) return o[0]?.nome ?? j.operadora_slug;
      return o.nome;
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function tipoJogoInitial(edit: MesaSpinCadastroRow | null): { preset: string; outro: string } {
  if (!edit?.tipo_jogo) return { preset: "Blackjack", outro: "" };
  const tj = edit.tipo_jogo.trim();
  if ((TIPOS_JOGO as readonly string[]).includes(tj)) return { preset: tj, outro: "" };
  return { preset: "Outro", outro: tj };
}
