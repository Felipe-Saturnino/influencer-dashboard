import type { RhOrgDiretoriaComFilhos, RhOrgGerenciaComFilhos, RhOrgTime } from "../types/rhOrganograma";

type NomeResp = (funcId: string | null | undefined, nomeLivre: string | null | undefined) => string;

/** Nome exibido do líder imediato da gerência; se vazio, usa o diretor(a) da diretoria. */
export function nomeLiderImediatoGerencia(d: RhOrgDiretoriaComFilhos, g: RhOrgGerenciaComFilhos, nomeResponsavel: NomeResp): string {
  const local = nomeResponsavel(g.gerente_funcionario_id, g.gerente_nome_livre);
  if (local) return local;
  return nomeResponsavel(d.diretor_funcionario_id, d.diretor_nome_livre);
}

/** Nome exibido do líder imediato do time; se vazio, herda gerência → diretoria. */
export function nomeLiderImediatoTime(
  d: RhOrgDiretoriaComFilhos,
  g: RhOrgGerenciaComFilhos,
  ti: RhOrgTime,
  nomeResponsavel: NomeResp,
): string {
  const local = nomeResponsavel(ti.lider_funcionario_id, ti.lider_nome_livre);
  if (local) return local;
  return nomeLiderImediatoGerencia(d, g, nomeResponsavel);
}

/** Primeiro e último nome (tabela Gestão de Prestadores — coluna Líder imediato). */
export function nomeLiderPrimeiroUltimoParaTabela(nome: string | null | undefined): string {
  const t = String(nome ?? "").trim();
  if (!t || t === "—") return "—";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
