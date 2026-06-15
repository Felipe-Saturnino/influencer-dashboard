import type { CSSProperties } from "react";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { FONT } from "../../../constants/theme";
import {
  HIERARCHY_LINES,
  KPI_LINES,
  PIPELINE_COLOR,
  PIPELINE_TAB_LABEL,
  type PipelineTab,
  type StatusFolha,
  type StatusPipeline,
} from "./constants";
import type { PipelineMarcaRow } from "./types";
import { countByConsolidadoFolha, countByPipeline } from "./helpers";

const hierGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
};

export function ConsolidadoPipeline({
  tab,
  rows,
  kpiFolha,
  onKpiClick,
  t,
}: {
  tab: PipelineTab;
  rows: PipelineMarcaRow[];
  kpiFolha: StatusFolha | null;
  onKpiClick: (folha: StatusFolha | null) => void;
  t: { text: string; textMuted: string; cardBorder: string; inputBg: string };
}) {
  if (tab === "todos") {
    const pipelines: StatusPipeline[] = ["disponiveis", "conexao", "negociacao", "fechado"];
    return (
      <div className="app-grid-kpi-4" style={hierGrid}>
        {pipelines.map((pipe) => {
          const cor = PIPELINE_COLOR[pipe];
          const total = countByPipeline(rows, pipe);
          const lines = HIERARCHY_LINES[pipe];
          return (
            <div
              key={pipe}
              style={{
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  fontFamily: FONT_TITLE,
                  fontWeight: 800,
                  fontSize: 13,
                  textTransform: "uppercase",
                  borderBottom: `1px solid ${t.cardBorder}`,
                  borderLeft: `3px solid ${cor}`,
                  color: cor,
                }}
              >
                {PIPELINE_TAB_LABEL[pipe === "disponiveis" ? "disponiveis" : pipe]}
                <span
                  style={{
                    display: "block",
                    fontSize: 22,
                    marginTop: 4,
                    fontFamily: FONT.body,
                  }}
                >
                  {total}
                </span>
              </div>
              {lines.map((line) => (
                <div
                  key={line.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 16px",
                    fontSize: 13,
                    fontFamily: FONT.body,
                    color: t.text,
                    borderBottom: `1px solid color-mix(in srgb, ${t.cardBorder} 60%, transparent)`,
                  }}
                >
                  <span>{line.label}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {countByConsolidadoFolha(rows, line.key, "hierarchy")}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  const lines = KPI_LINES[tab];
  const cor = PIPELINE_COLOR[tab === "disponiveis" ? "disponiveis" : (tab as StatusPipeline)];

  return (
    <div className="app-grid-kpi-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
      {lines.map((line) => {
        const active = kpiFolha === line.key;
        return (
          <button
            key={line.key}
            type="button"
            aria-pressed={active}
            onClick={() => onKpiClick(active ? null : line.key)}
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
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: t.textMuted }}>
              {line.label}
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
              {countByConsolidadoFolha(rows, line.key, "kpi")}
            </div>
          </button>
        );
      })}
    </div>
  );
}
