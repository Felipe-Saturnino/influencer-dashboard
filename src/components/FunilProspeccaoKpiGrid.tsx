import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { FONT } from "../constants/theme";
import { FONT_TITLE } from "../lib/dashboardConstants";

export type FunilProspeccaoFilterStatus = "todos" | string;

type FunilProspeccaoKpiGridProps<T extends string> = {
  options: readonly T[];
  labels: Record<T, string>;
  colors: Record<T, string>;
  counts: Record<string, number>;
  filterStatus: FunilProspeccaoFilterStatus;
  onFilterStatusChange: (value: FunilProspeccaoFilterStatus) => void;
};

export function FunilProspeccaoKpiGrid<T extends string>({
  options,
  labels,
  colors,
  counts,
  filterStatus,
  onFilterStatusChange,
}: FunilProspeccaoKpiGridProps<T>) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const funnelCardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  return (
    <div className="app-grid-kpi-4" style={{ width: "100%" }}>
      {options.map((s) => {
        const cor = colors[s];
        const active = filterStatus === s;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={active}
            aria-label={
              active
                ? `Remover filtro por ${labels[s]}`
                : `Filtrar prospectos com status ${labels[s]}`
            }
            onClick={() => onFilterStatusChange(active ? "todos" : s)}
            style={{
              textAlign: "left",
              cursor: "pointer",
              background: active
                ? `color-mix(in srgb, ${cor} 12%, ${brand.blockBg})`
                : brand.blockBg,
              border: active
                ? `1px solid color-mix(in srgb, ${cor} 35%, transparent)`
                : `1px solid ${t.cardBorder}`,
              borderLeft: `3px solid ${cor}`,
              borderRadius: 18,
              padding: "16px 20px",
              boxShadow: funnelCardShadow,
              minWidth: 0,
              width: "100%",
              fontFamily: FONT.body,
              outline: active ? `2px solid ${cor}` : undefined,
              outlineOffset: active ? 2 : undefined,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: brand.accent,
                fontFamily: FONT_TITLE,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {counts[s] ?? 0}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: brand.secondary,
                fontFamily: FONT.body,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginTop: 6,
              }}
            >
              {labels[s]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
