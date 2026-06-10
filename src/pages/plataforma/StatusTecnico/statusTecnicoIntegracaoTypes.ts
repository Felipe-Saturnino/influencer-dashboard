import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import type { SortDir } from "../../../components/dashboard";

export type IntegracaoSortCol = "integracao" | "ultimoSync" | "registros" | "erros" | "status";

export type StatusIntegracaoSyncTipo =
  | "cda"
  | "social"
  | "spin_rss"
  | "lobby_blaze"
  | "lobby_cda"
  | "email"
  | "email_agenda"
  | "email_track"
  | "none";

export interface StatusIntegracaoRow {
  slug: string;
  nome: string;
  ultimoSync: string | null;
  registrosHoje: number;
  erros: number;
  status: "ok" | "warning" | "falha";
  syncTipo: StatusIntegracaoSyncTipo;
}

export type StatusIntegracaoTableHeaders = {
  col1: string;
  col2: string;
  col3: string;
};

function statusIntegracaoRank(s: string | null | undefined) {
  if (s === "ok") return 0;
  if (s === "warning") return 1;
  if (s === "falha") return 2;
  return 3;
}

export function ordenarLinhasIntegracao(
  rows: StatusIntegracaoRow[],
  sort: { col: IntegracaoSortCol; dir: SortDir },
): StatusIntegracaoRow[] {
  const arr = [...rows];
  const { col, dir } = sort;
  arr.sort((a, b) => {
    let c = 0;
    switch (col) {
      case "integracao":
        c = compareLocaleTexto(a.nome ?? "", b.nome ?? "", dir);
        break;
      case "ultimoSync": {
        const ta = a.ultimoSync ? String(a.ultimoSync) : "";
        const tb = b.ultimoSync ? String(b.ultimoSync) : "";
        c = compareLocaleTexto(ta, tb, dir);
        break;
      }
      case "registros":
        c = compareNumber(Number(a.registrosHoje), Number(b.registrosHoje), dir);
        break;
      case "erros":
        c = compareNumber(Number(a.erros), Number(b.erros), dir);
        break;
      case "status":
        c = compareNumber(statusIntegracaoRank(a.status), statusIntegracaoRank(b.status), dir);
        break;
      default:
        c = 0;
    }
    if (c !== 0) return c;
    return compareLocaleTexto(a.nome ?? "", b.nome ?? "", "asc");
  });
  return arr;
}
