/** Primeiro e último token do nome (exibição em tabelas e cards). */
export function primeiroUltimoNome(nomeCompleto: string): string {
  const parts = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
