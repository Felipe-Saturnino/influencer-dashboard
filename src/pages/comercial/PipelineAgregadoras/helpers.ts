import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import type { SortDir } from "../../../components/dashboard";
import {
  COMERCIAL_FILTRO_NENHUM,
  COMERCIAL_FILTRO_TODOS,
  PIPELINE_COMERCIAL_NOMES,
  STATUS_PIPELINE_AGREGADORA_LABEL,
  type AgregadoraTab,
  type StatusPipelineAgregadora,
  type TableColAgregadora,
} from "./constants";
import type { AgregadoraRow } from "./types";

export {
  buildPipelineComerciais,
  buildComercialFiltroExtraOptions,
  buildPipelineComercialPopoverOptions,
  pipelineComercialNomePorId,
  pipelineComercialPopoverLabel,
  pipelineComercialPopoverUserId,
  pipelineComercialIsMissingOptionValue,
  fmtDataPipeline,
  fmtDataHora,
  fmtDataNascimento,
  toDateInputValue,
} from "../PipelineB2B/helpers";

export function normalizeAgregadoraSite(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function comercialDisplayAgregadora(row: AgregadoraRow): string {
  return row.comercial_nome ?? "—";
}

export function parseJogosInput(raw: string): { value: number | null; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null };
  const cleaned = trimmed.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return { value: null, error: "Informe a quantidade de jogos como número inteiro." };
  }
  return { value: n };
}

export function filterAgregadoras(
  rows: AgregadoraRow[],
  tab: AgregadoraTab,
  busca: string,
  comercialFiltro: string,
  kpiStatus: StatusPipelineAgregadora | null,
): AgregadoraRow[] {
  return rows.filter((r) => {
    if (kpiStatus) {
      if (r.status_pipeline !== kpiStatus) return false;
    } else if (tab !== "todos" && r.status_pipeline !== tab) {
      return false;
    }

    if (comercialFiltro === COMERCIAL_FILTRO_NENHUM) {
      if (r.comercial_user_id) return false;
    } else if (comercialFiltro !== COMERCIAL_FILTRO_TODOS) {
      if (r.comercial_user_id !== comercialFiltro) return false;
    }

    return textoContemBuscaEmAlgum(busca, r.nome, r.site, r.comercial_nome ?? "");
  });
}

export function sortAgregadoras(
  rows: AgregadoraRow[],
  col: TableColAgregadora,
  dir: SortDir,
): AgregadoraRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case "nome":
        cmp = compareLocaleTexto(a.nome, b.nome, dir);
        break;
      case "site":
        cmp = compareLocaleTexto(a.site, b.site, dir);
        break;
      case "jogos":
        cmp = compareNumber(a.jogos ?? -1, b.jogos ?? -1, dir);
        break;
      case "status":
        cmp = compareLocaleTexto(
          STATUS_PIPELINE_AGREGADORA_LABEL[a.status_pipeline],
          STATUS_PIPELINE_AGREGADORA_LABEL[b.status_pipeline],
          dir,
        );
        break;
      case "comercial":
        cmp = compareLocaleTexto(a.comercial_nome ?? "", b.comercial_nome ?? "", dir);
        break;
      case "ultimo_contato":
        cmp = compareLocaleTexto(a.ultimo_contato ?? "", b.ultimo_contato ?? "", dir);
        break;
      default:
        cmp = 0;
    }
    if (cmp !== 0) return cmp;
    return compareLocaleTexto(a.nome, b.nome, "asc");
  });
}

export function countByStatusPipeline(
  rows: AgregadoraRow[],
  status: StatusPipelineAgregadora,
): number {
  return rows.filter((r) => r.status_pipeline === status).length;
}

export function fmtJogos(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

/** Data `YYYY-MM-DD` → `dd/mm/yyyy` (sem shift de fuso). */
export function fmtUltimoContato(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function historicoDisplayValorAgregadora(
  campo: string,
  valor: string | null | undefined,
): string {
  if (valor == null || valor === "") return "—";
  if (campo === "status_pipeline") {
    return (
      STATUS_PIPELINE_AGREGADORA_LABEL[valor as StatusPipelineAgregadora] ?? valor
    );
  }
  if (campo === "jogos") {
    const n = Number(valor);
    return Number.isFinite(n) ? n.toLocaleString("pt-BR") : valor;
  }
  if (campo === "ultimo_contato") {
    const [y, m, d] = valor.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  if (
    campo === "comercial_user_id" &&
    (PIPELINE_COMERCIAL_NOMES as readonly string[]).includes(valor)
  ) {
    return valor;
  }
  return valor;
}
