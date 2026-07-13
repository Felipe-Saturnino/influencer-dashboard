import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import type { SortDir } from "../../../components/dashboard";
import {
  PRIORIDADE_ORDEM,
  STATUS_INTEGRACAO_LABEL,
  STATUS_INTEGRACAO_ORDEM,
  TIPO_INTEGRACAO_LABEL,
  type IntegracaoTab,
  type PrioridadeIntegracao,
  type StatusIntegracao,
  type TableColIntegracao,
  type TipoIntegracao,
} from "./constants";
import type { IntegracaoRow } from "./types";

export function filterIntegracoes(
  rows: IntegracaoRow[],
  tab: IntegracaoTab,
  busca: string,
  prioridadeFiltro: string,
  kpiStatus: StatusIntegracao | null,
): IntegracaoRow[] {
  return rows.filter((row) => {
    if (prioridadeFiltro !== "todas" && row.prioridade !== prioridadeFiltro) return false;
    if (!textoContemBuscaEmAlgum(busca, row.operador_nome, row.caminho, row.pam, row.agregadora)) {
      return false;
    }
    if (kpiStatus && row.status !== kpiStatus) return false;
    if (tab === "todos") return true;
    if (tab === "nao_iniciados") return row.status === "nao_iniciado";
    if (tab === "em_andamento") return row.status === "em_andamento";
    if (tab === "concluidos") return row.status === "concluido";
    return true;
  });
}

function prioridadeRank(p: PrioridadeIntegracao): number {
  return PRIORIDADE_ORDEM.indexOf(p);
}

function statusRank(s: StatusIntegracao): number {
  return STATUS_INTEGRACAO_ORDEM.indexOf(s);
}

export function sortIntegracoes(
  rows: IntegracaoRow[],
  col: TableColIntegracao,
  dir: SortDir,
): IntegracaoRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (col) {
      case "operador":
        return compareLocaleTexto(a.operador_nome, b.operador_nome, dir);
      case "prioridade":
        return compareNumber(prioridadeRank(a.prioridade), prioridadeRank(b.prioridade), dir);
      case "tipo":
        return compareLocaleTexto(TIPO_INTEGRACAO_LABEL[a.tipo], TIPO_INTEGRACAO_LABEL[b.tipo], dir);
      case "caminho":
        return compareLocaleTexto(a.caminho ?? "", b.caminho ?? "", dir);
      case "pam":
        return compareLocaleTexto(a.pam ?? "", b.pam ?? "", dir);
      case "agregadora":
        return compareLocaleTexto(a.agregadora ?? "", b.agregadora ?? "", dir);
      case "status":
        return compareNumber(statusRank(a.status), statusRank(b.status), dir);
      default:
        return 0;
    }
  });
  return copy;
}

export function countByStatus(rows: IntegracaoRow[], status: StatusIntegracao): number {
  return rows.filter((r) => r.status === status).length;
}

export function historicoDisplayValor(campo: string, valor: string | null): string {
  if (valor == null || valor === "") return "—";
  if (campo === "status") {
    return STATUS_INTEGRACAO_LABEL[valor as StatusIntegracao] ?? valor;
  }
  if (campo === "prioridade") {
    const map: Record<string, string> = { baixo: "Baixo", medio: "Médio", alta: "Alta" };
    return map[valor] ?? valor;
  }
  if (campo === "tipo") {
    return TIPO_INTEGRACAO_LABEL[valor as TipoIntegracao] ?? valor;
  }
  return valor;
}

export function fmtDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncarComentario(texto: string | null, max = 48): string {
  if (!texto?.trim()) return "—";
  const t = texto.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
