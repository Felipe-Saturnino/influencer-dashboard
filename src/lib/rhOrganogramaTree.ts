import { nomeLiderImediatoTime } from "./rhOrganogramaLiderImediato";
import type {
  RhOrgDiretoria,
  RhOrgDiretoriaComFilhos,
  RhOrgGerencia,
  RhOrgGerenciaComFilhos,
  RhOrgOrganogramaGrupoPrestador,
  RhOrgTime,
  RhOrgTimeOpcao,
} from "../types/rhOrganograma";

export function montarArvoreOrganograma(
  diretorias: RhOrgDiretoria[],
  gerencias: RhOrgGerencia[],
  times: RhOrgTime[],
): RhOrgDiretoriaComFilhos[] {
  const gPorD = new Map<string, RhOrgGerencia[]>();
  gerencias.forEach((g) => {
    const arr = gPorD.get(g.diretoria_id) ?? [];
    arr.push(g);
    gPorD.set(g.diretoria_id, arr);
  });
  const tPorG = new Map<string, RhOrgTime[]>();
  times.forEach((ti) => {
    const arr = tPorG.get(ti.gerencia_id) ?? [];
    arr.push(ti);
    tPorG.set(ti.gerencia_id, arr);
  });
  const ordenarNome = <T extends { nome: string }>(a: T, b: T) => a.nome.localeCompare(b.nome, "pt-BR");

  return [...diretorias].sort(ordenarNome).map((d) => {
    const gList = (gPorD.get(d.id) ?? []).sort(ordenarNome).map((g): RhOrgGerenciaComFilhos => {
      const tList = (tPorG.get(g.id) ?? []).sort(ordenarNome);
      return { ...g, times: tList };
    });
    return { ...d, gerencias: gList };
  });
}

function nomeLivreOuFuncMap(
  nomePorFuncionarioId: Map<string, string>,
  fid: string | null | undefined,
  livre: string | null | undefined,
): string {
  if (fid && nomePorFuncionarioId.has(fid)) return nomePorFuncionarioId.get(fid)!;
  return (livre ?? "").trim();
}

/**
 * Toda a estrutura ativa (diretoria › gerência) para o cadastro de prestador.
 * Ramos sem time ativo aparecem com `times` vazio (optgroup + opção desabilitada na UI).
 */
export function buildGruposOrganogramaPrestador(
  arvore: RhOrgDiretoriaComFilhos[],
  nomePorFuncionarioId: Map<string, string>,
): RhOrgOrganogramaGrupoPrestador[] {
  const grupos: RhOrgOrganogramaGrupoPrestador[] = [];
  const emptyGer = "Nenhuma gerência cadastrada — inclua em RH → Organograma.";
  const emptyTime = "Nenhum time ativo — cadastre um time em RH → Organograma.";

  arvore.forEach((d) => {
    if (d.status !== "ativo") return;
    if (d.gerencias.length === 0) {
      grupos.push({
        key: `d-${d.id}-sem-ger`,
        label: d.nome,
        times: [],
        emptyLabel: emptyGer,
      });
      return;
    }
    d.gerencias.forEach((g) => {
      if (g.status !== "ativo") return;
      const times: RhOrgTimeOpcao[] = [];
      g.times.forEach((ti) => {
        if (ti.status !== "ativo") return;
        const gestor = nomeLiderImediatoTime(d, g, ti, (fid, livre) =>
          nomeLivreOuFuncMap(nomePorFuncionarioId, fid, livre),
        ).trim() || "—";
        times.push({
          timeId: ti.id,
          timeNome: ti.nome,
          gerenciaNome: g.nome,
          diretoriaNome: d.nome,
          label: `${d.nome} › ${g.nome} › ${ti.nome}`,
          gestorNome: gestor,
        });
      });
      grupos.push({
        key: `d-${d.id}-g-${g.id}`,
        label: `${d.nome} › ${g.nome}`,
        times,
        emptyLabel: emptyTime,
      });
    });
  });

  return grupos.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

/** Times ativos cuja diretoria e gerência estão ativas — lista flat (filtros, buscas). */
export function flattenTimesAtivosParaSelect(
  arvore: RhOrgDiretoriaComFilhos[],
  nomePorFuncionarioId: Map<string, string>,
): RhOrgTimeOpcao[] {
  const flat = buildGruposOrganogramaPrestador(arvore, nomePorFuncionarioId).flatMap((gr) => gr.times);
  return flat.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function contarTimesAtivosFilhosDeGerencia(arvore: RhOrgDiretoriaComFilhos[], gerenciaId: string): number {
  for (const d of arvore) {
    const g = d.gerencias.find((x) => x.id === gerenciaId);
    if (g) return g.times.filter((t) => t.status === "ativo").length;
  }
  return 0;
}

export function contarGerenciasAtivasFilhasDeDiretoria(arvore: RhOrgDiretoriaComFilhos[], diretoriaId: string): number {
  const d = arvore.find((x) => x.id === diretoriaId);
  return d ? d.gerencias.filter((g) => g.status === "ativo").length : 0;
}

export function contarTimesAtivosSobDiretoria(arvore: RhOrgDiretoriaComFilhos[], diretoriaId: string): number {
  const d = arvore.find((x) => x.id === diretoriaId);
  if (!d) return 0;
  let n = 0;
  d.gerencias.forEach((g) => {
    if (g.status === "ativo") n += g.times.filter((t) => t.status === "ativo").length;
  });
  return n;
}

/** Todos os times (ativos ou inativos) sob a gerência — para exclusão em cascata no cliente. */
export function coletarIdsTimesDaGerencia(arvore: RhOrgDiretoriaComFilhos[], gerenciaId: string): string[] {
  for (const d of arvore) {
    const g = d.gerencias.find((x) => x.id === gerenciaId);
    if (g) return g.times.map((t) => t.id);
  }
  return [];
}

/** Times e gerências sob a diretoria — ordem de delete: times → gerências → diretoria. */
/** Diretoria que contém o nó (gerência ou time) — para navegação a partir da visão “todas”. */
export function encontrarDiretoriaIdPorCtx(
  arvore: RhOrgDiretoriaComFilhos[],
  ctx: { nivel: "diretoria" | "gerencia" | "time"; id: string },
): string | null {
  if (ctx.nivel === "diretoria") return ctx.id;
  for (const d of arvore) {
    if (ctx.nivel === "gerencia") {
      if (d.gerencias.some((g) => g.id === ctx.id)) return d.id;
    } else {
      for (const g of d.gerencias) {
        if (g.times.some((ti) => ti.id === ctx.id)) return d.id;
      }
    }
  }
  return null;
}

export function coletarIdsTimesEGerenciasDaDiretoria(
  arvore: RhOrgDiretoriaComFilhos[],
  diretoriaId: string,
): { timeIds: string[]; gerenciaIds: string[] } {
  const d = arvore.find((x) => x.id === diretoriaId);
  if (!d) return { timeIds: [], gerenciaIds: [] };
  const gerenciaIds: string[] = [];
  const timeIds: string[] = [];
  for (const g of d.gerencias) {
    gerenciaIds.push(g.id);
    for (const ti of g.times) timeIds.push(ti.id);
  }
  return { timeIds, gerenciaIds };
}
