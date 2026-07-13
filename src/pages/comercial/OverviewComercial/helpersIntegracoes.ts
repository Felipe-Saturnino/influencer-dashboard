import {
  STATUS_INTEGRACAO_COLOR,
  STATUS_INTEGRACAO_KPI_LABEL,
  STATUS_INTEGRACAO_LABEL,
  STATUS_INTEGRACAO_ORDEM,
  TIPO_INTEGRACAO_LABEL,
  TIPO_INTEGRACAO_ORDEM,
  type StatusIntegracao,
  type TipoIntegracao,
} from "../Integracao/constants";

export type OverviewIntegracaoRow = {
  id: string;
  operador_nome: string;
  tipo: TipoIntegracao;
  status: StatusIntegracao;
  caminho: string | null;
  agregadora: string | null;
};

export type IntegracaoStatusFilter = StatusIntegracao | "todos";

export function filterOverviewIntegracoes(
  rows: OverviewIntegracaoRow[],
  statusFiltro: IntegracaoStatusFilter,
): OverviewIntegracaoRow[] {
  if (statusFiltro === "todos") return rows;
  return rows.filter((r) => r.status === statusFiltro);
}

export function countIntegracaoByStatus(
  rows: OverviewIntegracaoRow[],
  status: StatusIntegracao,
): number {
  return rows.filter((r) => r.status === status).length;
}

export function integracaoFunnelLevels(rows: OverviewIntegracaoRow[]) {
  return STATUS_INTEGRACAO_ORDEM.map((s) => ({
    id: s,
    label: STATUS_INTEGRACAO_LABEL[s],
    count: countIntegracaoByStatus(rows, s),
    color: STATUS_INTEGRACAO_COLOR[s],
  }));
}

function taxa(from: number, to: number): number | null {
  if (from <= 0) return null;
  return (to / from) * 100;
}

export function integracaoFunnelTaxas(rows: OverviewIntegracaoRow[]) {
  const c = Object.fromEntries(
    STATUS_INTEGRACAO_ORDEM.map((s) => [s, countIntegracaoByStatus(rows, s)]),
  ) as Record<StatusIntegracao, number>;
  return [
    {
      label: "Não Iniciado → Em andamento",
      taxa: taxa(c.nao_iniciado, c.em_andamento),
      color: STATUS_INTEGRACAO_COLOR.em_andamento,
    },
    {
      label: "Em andamento → Concluído",
      taxa: taxa(c.em_andamento, c.concluido),
      color: STATUS_INTEGRACAO_COLOR.concluido,
    },
    {
      label: "Não Iniciado → Concluído",
      taxa: taxa(c.nao_iniciado, c.concluido),
      color: STATUS_INTEGRACAO_COLOR.concluido,
      highlight: true,
    },
  ];
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

export { STATUS_INTEGRACAO_KPI_LABEL, STATUS_INTEGRACAO_COLOR, STATUS_INTEGRACAO_ORDEM };
