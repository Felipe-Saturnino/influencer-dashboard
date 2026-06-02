import type { BancaRowDb } from "./bancaJogoTypes";
import { MESES_NOMES } from "./bancaJogoTypes";
import type { BlocoFiltros } from "./bancaJogoFiltros";

export function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function mascaraCPF(cpf: string): string {
  const d = (cpf ?? "").replace(/\D/g, "");
  if (d.length < 11) return "—";
  return "***.***.***-**";
}

export function formatarCPFVisivel(cpf: string): string {
  const d = (cpf ?? "").replace(/\D/g, "");
  if (d.length !== 11) return (cpf ?? "").trim() || "—";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function gerarMeses(): { value: string; label: string }[] {
  const lista: { value: string; label: string }[] = [{ value: "", label: "Total" }];
  const agora = new Date();
  const inicio = new Date(2025, 11, 1);
  const cur = new Date(agora.getFullYear(), agora.getMonth(), 1);
  while (cur >= inicio) {
    lista.push({
      value: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
      label: `${MESES_NOMES[cur.getMonth()]} ${cur.getFullYear()}`,
    });
    cur.setMonth(cur.getMonth() - 1);
  }
  return lista;
}

export function periodoDoMes(mes: string): { inicio: string; fim: string } | null {
  if (!mes) return null;
  const [ano, m] = mes.split("-").map(Number);
  const ultimo = new Date(ano, m, 0).getDate();
  return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

export function diaISO(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function rowNoMesSolicitacao(r: BancaRowDb, periodo: { inicio: string; fim: string } | null, historico: boolean) {
  if (historico || !periodo) return true;
  const d = diaISO(r.solicitado_em);
  return d >= periodo.inicio && d <= periodo.fim;
}

export function rowInteressaConsolidado(r: BancaRowDb, periodo: { inicio: string; fim: string } | null, historico: boolean) {
  if (historico || !periodo) return true;
  const s = diaISO(r.solicitado_em);
  const l = diaISO(r.liberado_em);
  if (s >= periodo.inicio && s <= periodo.fim) return true;
  if (l && l >= periodo.inicio && l <= periodo.fim) return true;
  return false;
}

export function rowPassaFiltrosComunsBanca(r: BancaRowDb, filtros: BlocoFiltros): boolean {
  if (!filtros.podeVerInfluencer(r.influencer_id)) return false;
  if (filtros.filterInfluencers.length > 0 && !filtros.filterInfluencers.includes(r.influencer_id)) return false;
  if (filtros.filtroOp?.length) {
    if (!r.operadora_slug || !filtros.filtroOp.includes(r.operadora_slug)) return false;
  } else if (filtros.filterOperadora && filtros.filterOperadora !== "todas") {
    if (r.operadora_slug !== filtros.filterOperadora) return false;
  }
  return true;
}

/** KPIs e consolidado: influencer, operadora e janela de período (solicitado_em / liberado_em). */
export function rowPassaFiltrosKpiBanca(
  r: BancaRowDb,
  filtros: BlocoFiltros,
  periodo: { inicio: string; fim: string } | null,
  historico: boolean,
): boolean {
  if (!rowPassaFiltrosComunsBanca(r, filtros)) return false;
  return rowInteressaConsolidado(r, periodo, historico);
}
