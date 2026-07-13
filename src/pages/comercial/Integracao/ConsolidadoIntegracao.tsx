import {
  STATUS_INTEGRACAO_COLOR,
  STATUS_INTEGRACAO_KPI_LABEL,
  type StatusIntegracao,
} from "./constants";
import type { IntegracaoRow } from "./types";
import { countByStatus } from "./helpers";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";

type KpiKey = "total" | StatusIntegracao;

const KPI_ORDER: KpiKey[] = ["total", "concluido", "em_andamento", "nao_iniciado"];

export function ConsolidadoIntegracao({
  rows,
  kpiStatus,
  onKpiClick,
  t,
}: {
  rows: IntegracaoRow[];
  kpiStatus: StatusIntegracao | null;
  onKpiClick: (status: StatusIntegracao | null) => void;
  t: { textMuted: string; cardBorder: string; inputBg: string; text: string };
}) {
  return (
    <div
      className="app-grid-kpi-4"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
      }}
    >
      {KPI_ORDER.map((key) => {
        const isTotal = key === "total";
        const cor = isTotal ? "var(--brand-primary, #7c3aed)" : STATUS_INTEGRACAO_COLOR[key];
        const active = isTotal ? false : kpiStatus === key;
        const value = isTotal ? rows.length : countByStatus(rows, key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (isTotal) {
                onKpiClick(null);
                return;
              }
              onKpiClick(active ? null : key);
            }}
            style={{
              textAlign: "left",
              cursor: "pointer",
              background: t.inputBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 18,
              padding: "16px 20px",
              borderLeft: `3px solid ${cor}`,
              outline: active ? `2px solid var(--brand-accent, #1e36f8)` : undefined,
              outlineOffset: active ? 2 : undefined,
              fontFamily: FONT.body,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: t.textMuted,
              }}
            >
              {STATUS_INTEGRACAO_KPI_LABEL[key]}
            </div>
            <div
              style={{
                fontFamily: FONT_TITLE,
                fontSize: 28,
                fontWeight: 800,
                marginTop: 4,
                color: isTotal ? t.text : cor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
          </button>
        );
      })}
    </div>
  );
}
