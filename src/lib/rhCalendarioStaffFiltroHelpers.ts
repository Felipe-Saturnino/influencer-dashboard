import type { RhFuncionario } from "../types/rhFuncionario";

/** Multi → uma opção (filtros Time/Staff no Calendário e páginas derivadas). */
export function normalizarSelecaoUnica(prev: string[], ids: string[]): string[] {
  if (ids.length === 0) return [];
  if (ids.length === 1) return ids;
  const pset = new Set(prev);
  const added = ids.find((x) => !pset.has(x));
  return [added ?? ids[ids.length - 1]!];
}

export type StaffTimeRow = { id: string; nome: string; gerencia_id: string; gerencia_nome: string };

/** Id sintético no multiselect (não é uuid de `rh_org_times`). */
export const TREINAMENTO_FILTRO_ID = "rh-cal-filtro-treinamento";

/** Ordem e rótulos exibidos no filtro (nome do time; Treinamento = gerência Treinamento). */
export const CALENDARIO_TIMES_FILTRO_ORDEM = [
  "Customer Service",
  "Service Manager",
  "Game Presenter",
  "Performance Coach",
  "Shift Leader",
  "Shuffler",
  "Treinamento",
] as const;

export function normalizarNomeCalFiltro(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function timeRowPorRotuloCanonica(times: StaffTimeRow[], rotulo: string): StaffTimeRow | undefined {
  const target = normalizarNomeCalFiltro(rotulo);
  return times.find((x) => normalizarNomeCalFiltro(x.nome) === target);
}

export function prestadorAtendeFiltroTime(
  p: RhFuncionario,
  opts: {
    filtroAtivo: boolean;
    filtroTimeIdsReais: Set<string>;
    treinamentoSelecionado?: boolean;
    treinamentoGerenciaId?: string | null;
    treinamentoTimeIds?: Set<string>;
  },
): boolean {
  if (!opts.filtroAtivo) return true;
  if (p.org_time_id && opts.filtroTimeIdsReais.has(p.org_time_id)) return true;
  if (opts.treinamentoSelecionado && opts.treinamentoGerenciaId) {
    if (p.org_gerencia_id === opts.treinamentoGerenciaId) return true;
    if (p.org_time_id && opts.treinamentoTimeIds?.has(p.org_time_id)) return true;
  }
  return false;
}
