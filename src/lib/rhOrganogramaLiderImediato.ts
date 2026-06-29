import type {
  RhOrgDiretoriaComFilhos,
  RhOrgGerenciaComFilhos,
  RhOrgTime,
} from "../types/rhOrganograma";

export type PrestadorOrganogramaRef = {
  org_time_id?: string | null;
  org_gerencia_id?: string | null;
  org_diretoria_id?: string | null;
};

export function localizarNoOrganogramaPrestador(
  row: PrestadorOrganogramaRef,
  arvore: RhOrgDiretoriaComFilhos[],
): { d: RhOrgDiretoriaComFilhos; g?: RhOrgGerenciaComFilhos; ti?: RhOrgTime } | null {
  for (const d of arvore) {
    if (d.status !== "ativo") continue;
    if (row.org_time_id) {
      for (const g of d.gerencias) {
        if (g.status !== "ativo") continue;
        const ti = g.times.find((x) => x.id === row.org_time_id && x.status === "ativo");
        if (ti) return { d, g, ti };
      }
    } else if (row.org_gerencia_id) {
      const g = d.gerencias.find((x) => x.id === row.org_gerencia_id && x.status === "ativo");
      if (g) return { d, g };
    } else if (row.org_diretoria_id && d.id === row.org_diretoria_id) {
      return { d };
    }
  }
  return null;
}

/** Cadeia ascendente de líderes (ids únicos): time → gerência → diretoria. */
export function cadeiaLideresFuncionarioIdsPrestador(
  row: PrestadorOrganogramaRef,
  arvore: RhOrgDiretoriaComFilhos[],
): string[] {
  const no = localizarNoOrganogramaPrestador(row, arvore);
  if (!no) return [];

  const candidatos: (string | null | undefined)[] = [];
  const { d, g, ti } = no;

  if (ti && g) {
    candidatos.push(ti.lider_funcionario_id, g.gerente_funcionario_id, d.diretor_funcionario_id);
  } else if (g) {
    candidatos.push(g.gerente_funcionario_id, d.diretor_funcionario_id);
  } else {
    candidatos.push(d.diretor_funcionario_id);
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const fid of candidatos) {
    if (fid && !seen.has(fid)) {
      seen.add(fid);
      ids.push(fid);
    }
  }
  return ids;
}

export function usuarioEhLiderNaCadeiaPresenca(
  meuFuncionarioId: string | null | undefined,
  cadeiaLiderIds: string[],
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  if (!meuFuncionarioId) return false;
  return cadeiaLiderIds.includes(meuFuncionarioId);
}

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
