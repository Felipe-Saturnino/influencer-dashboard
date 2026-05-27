/** Valor persistido quando o informativo vale para todas as operadoras (perfil Operador). */
export const INFORMATIVO_OPERADOR_ESCOPO_TODOS = "todos";

export const INFORMATIVO_OPERADOR_ESCOPO_TODOS_LABEL = "Todos";

export type OperadoraAtivaOption = { slug: string; nome: string };

export function perfisIncluemOperador(perfis: string[]): boolean {
  return perfis.includes("operador");
}

export function labelOperadorEscopoInformativo(
  escopo: string | null | undefined,
  operadorasPorSlug?: Map<string, string>,
): string {
  if (!escopo) return "—";
  if (escopo === INFORMATIVO_OPERADOR_ESCOPO_TODOS) return INFORMATIVO_OPERADOR_ESCOPO_TODOS_LABEL;
  return operadorasPorSlug?.get(escopo) ?? escopo;
}

export function validarOperadorEscopoInformativo(
  perfis: string[],
  operadorEscopo: string | null,
): string | undefined {
  if (!perfisIncluemOperador(perfis)) return undefined;
  const v = (operadorEscopo ?? "").trim();
  if (!v) return "Selecione a operadora para o perfil Operador.";
  return undefined;
}
