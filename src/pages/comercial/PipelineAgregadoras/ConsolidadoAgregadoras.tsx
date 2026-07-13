import {
  STATUS_PIPELINE_AGREGADORA_COLOR,
  STATUS_PIPELINE_AGREGADORA_LABEL,
  STATUS_PIPELINE_AGREGADORA_ORDEM,
  type StatusPipelineAgregadora,
} from "./constants";
import type { AgregadoraRow } from "./types";
import { countByStatusPipeline } from "./helpers";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";

export function ConsolidadoAgregadoras({
  rows,
  kpiStatus,
  onKpiClick,
  t,
}: {
  rows: AgregadoraRow[];
  kpiStatus: StatusPipelineAgregadora | null;
  onKpiClick: (status: StatusPipelineAgregadora | null) => void;
  t: { textMuted: string; cardBorder: string; inputBg: string };
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
      {STATUS_PIPELINE_AGREGADORA_ORDEM.map((status) => {
        const cor = STATUS_PIPELINE_AGREGADORA_COLOR[status];
        const active = kpiStatus === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => onKpiClick(active ? null : status)}
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
              {STATUS_PIPELINE_AGREGADORA_LABEL[status]}
            </div>
            <div
              style={{
                fontFamily: FONT_TITLE,
                fontSize: 28,
                fontWeight: 800,
                marginTop: 4,
                color: cor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {countByStatusPipeline(rows, status)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
