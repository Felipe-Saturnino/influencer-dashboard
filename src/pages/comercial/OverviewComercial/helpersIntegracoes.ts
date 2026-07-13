import {
  PRIORIDADE_FILTRO_TODAS,
  STATUS_INTEGRACAO_COLOR,
  STATUS_INTEGRACAO_KPI_LABEL,
  STATUS_INTEGRACAO_LABEL,
  STATUS_INTEGRACAO_ORDEM,
  TIPO_INTEGRACAO_LABEL,
  TIPO_INTEGRACAO_ORDEM,
  type PrioridadeIntegracao,
  type StatusIntegracao,
  type TipoIntegracao,
} from "../Integracao/constants";

export type OverviewIntegracaoRow = {
  id: string;
  operador_nome: string;
  prioridade: PrioridadeIntegracao;
  tipo: TipoIntegracao;
  status: StatusIntegracao;
  caminho: string | null;
  agregadora: string | null;
  created_at: string | null;
};

export type OverviewIntegracaoHistorico = {
  integracao_id: string;
  campo: string;
  valor_novo: string | null;
  created_at: string;
};

export function filterOverviewIntegracoes(
  rows: OverviewIntegracaoRow[],
  prioridadeFiltro: string,
): OverviewIntegracaoRow[] {
  if (prioridadeFiltro === PRIORIDADE_FILTRO_TODAS) return rows;
  return rows.filter((r) => r.prioridade === prioridadeFiltro);
}

export function countIntegracaoByStatus(
  rows: OverviewIntegracaoRow[],
  status: StatusIntegracao,
): number {
  return rows.filter((r) => r.status === status).length;
}

function normalizeStatusHist(valor: string | null): StatusIntegracao | null {
  if (!valor) return null;
  const t = valor.trim().toLowerCase();
  if (t === "em_andamento" || t.includes("andamento")) return "em_andamento";
  if (t === "concluido" || t.includes("conclu")) return "concluido";
  if (t === "nao_iniciado" || t.includes("não inici") || t.includes("nao inici")) {
    return "nao_iniciado";
  }
  return null;
}

function firstStatusEventAt(
  hist: OverviewIntegracaoHistorico[],
  integracaoId: string,
  status: StatusIntegracao,
): number | null {
  const hits = hist
    .filter(
      (h) =>
        h.integracao_id === integracaoId &&
        h.campo === "status" &&
        normalizeStatusHist(h.valor_novo) === status,
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (hits.length === 0) return null;
  const ts = new Date(hits[0].created_at).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Formata duração média de SLA (horas se < 24 h, senão dias). */
export function formatSlaDuracao(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const horas = ms / 3_600_000;
  if (horas < 24) {
    return `${horas.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 0 })} h`;
  }
  const dias = horas / 24;
  return `${dias.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 0 })} d`;
}

/**
 * SLA por etapa:
 * - Não Iniciado: criação → 1ª entrada em Em andamento
 * - Em andamento: 1ª entrada Em andamento → 1ª entrada Concluído
 * - Concluído: criação → 1ª entrada Concluído
 */
export function computeIntegracaoSla(
  rows: OverviewIntegracaoRow[],
  hist: OverviewIntegracaoHistorico[],
): Record<StatusIntegracao, number | null> {
  const naoIniciado: number[] = [];
  const emAndamento: number[] = [];
  const concluido: number[] = [];

  for (const row of rows) {
    const createdTs = row.created_at ? new Date(row.created_at).getTime() : NaN;
    if (Number.isNaN(createdTs)) continue;

    const emAt = firstStatusEventAt(hist, row.id, "em_andamento");
    const conclAt = firstStatusEventAt(hist, row.id, "concluido");

    if (emAt != null && emAt >= createdTs) {
      naoIniciado.push(emAt - createdTs);
    }
    if (emAt != null && conclAt != null && conclAt >= emAt) {
      emAndamento.push(conclAt - emAt);
    }
    if (conclAt != null && conclAt >= createdTs) {
      concluido.push(conclAt - createdTs);
    }
  }

  return {
    nao_iniciado: avg(naoIniciado),
    em_andamento: avg(emAndamento),
    concluido: avg(concluido),
  };
}

export function integracaoTipoBars(rows: OverviewIntegracaoRow[]) {
  return TIPO_INTEGRACAO_ORDEM.map((tipo) => ({
    key: tipo,
    label: TIPO_INTEGRACAO_LABEL[tipo],
    count: rows.filter((r) => r.tipo === tipo).length,
    color: tipo === "mesa_dedicada" ? "#1e36f8" : "#a78bfa",
  }));
}

export function integracaoCaminhoBars(rows: OverviewIntegracaoRow[]) {
  const map = new Map<string, number>();
  let sem = 0;
  for (const r of rows) {
    const k = r.caminho?.trim();
    if (!k) {
      sem += 1;
      continue;
    }
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const items = [...map.entries()]
    .map(([label, count]) => ({
      key: label,
      label,
      count,
      color: "#1e36f8",
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  if (sem > 0) {
    items.push({ key: "__sem__", label: "Sem caminho", count: sem, color: "#6b7280" });
  }
  return items;
}

export function integracaoAgregadorBars(rows: OverviewIntegracaoRow[]) {
  const map = new Map<string, number>();
  let sem = 0;
  for (const r of rows) {
    const k = r.agregadora?.trim();
    if (!k) {
      sem += 1;
      continue;
    }
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const items = [...map.entries()]
    .map(([label, count]) => ({
      key: label,
      label,
      count,
      color: "#a78bfa",
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  if (sem > 0) {
    items.push({ key: "__sem__", label: "Sem agregador", count: sem, color: "#6b7280" });
  }
  return items;
}

export { STATUS_INTEGRACAO_KPI_LABEL, STATUS_INTEGRACAO_COLOR, STATUS_INTEGRACAO_ORDEM, STATUS_INTEGRACAO_LABEL };
