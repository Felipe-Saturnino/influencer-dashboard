import { FONT } from "../../../constants/theme";
import { fmtBRL } from "../../../lib/dashboardHelpers";

export type OverviewSpinChartTooltipTheme = {
  cardBg: string;
  cardBorder: string;
  text: string;
};

type RechartsTooltipPayload = {
  name?: string;
  value?: unknown;
  color?: string;
  payload?: Record<string, unknown>;
};

export function TooltipComparativoJogo({
  active,
  payload,
  label,
  theme,
  kpiGrafico,
  somavel,
  isBRL,
}: {
  active?: boolean;
  payload?: RechartsTooltipPayload[];
  label?: string;
  theme: OverviewSpinChartTooltipTheme;
  kpiGrafico: string;
  somavel: boolean;
  isBRL: boolean;
}) {
  if (!active || !payload?.length) return null;
  const full = payload[0]?.payload;
  const totalOficial = full?.Total;
  const totalSomavelFallback = payload.reduce((s, p) => {
    const n = Number(p.value);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);
  const totalSomavel =
    totalOficial != null && Number.isFinite(Number(totalOficial))
      ? Number(totalOficial)
      : totalSomavelFallback;
  const formatar = (v: number) =>
    isBRL
      ? fmtBRL(v)
      : kpiGrafico === "margin_pct"
        ? `${v.toFixed(1)}%`
        : v.toLocaleString("pt-BR");

  const mostrarRodapeTotal =
    somavel ||
    kpiGrafico === "margin_pct" ||
    kpiGrafico === "bet_size" ||
    kpiGrafico === "arpu";

  const valorRodape =
    totalOficial != null && Number.isFinite(Number(totalOficial))
      ? Number(totalOficial)
      : null;

  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        color: theme.text,
        fontFamily: FONT.body,
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, color: theme.text }}>{label}</div>
      {payload.map((p) => (
        <div
          key={String(p.name)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 4,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.color,
                flexShrink: 0,
              }}
            />
            {p.name}
          </span>
          <span style={{ fontWeight: 600 }}>
            {p.value != null && p.value !== "" ? formatar(Number(p.value)) : "—"}
          </span>
        </div>
      ))}
      {mostrarRodapeTotal && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginTop: 6,
            paddingTop: 6,
            borderTop: `1px solid ${theme.cardBorder}`,
          }}
        >
          <span style={{ fontWeight: 700, color: theme.text }}>Total</span>
          <span style={{ fontWeight: 700, color: theme.text }}>
            {somavel
              ? formatar(totalSomavel)
              : valorRodape != null
                ? formatar(valorRodape)
                : "—"}
          </span>
        </div>
      )}
    </div>
  );
}

export function TooltipDetalheOperadoras({
  active,
  payload,
  label,
  theme,
  kpiGraficoDetalhe,
  somavel,
  isBRL,
}: {
  active?: boolean;
  payload?: RechartsTooltipPayload[];
  label?: string;
  theme: OverviewSpinChartTooltipTheme;
  kpiGraficoDetalhe: string;
  somavel: boolean;
  isBRL: boolean;
}) {
  if (!active || !payload?.length) return null;
  const full = payload[0]?.payload as Record<string, unknown> | undefined;
  const totalOficial = full?.Total != null && Number.isFinite(Number(full.Total)) ? Number(full.Total) : null;
  const totalSomavelFallback = payload.reduce((s, p) => {
    const n = Number(p.value);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);
  const totalSomavel =
    totalOficial != null && Number.isFinite(Number(totalOficial)) ? totalOficial : totalSomavelFallback;
  const formatar = (v: number) =>
    isBRL
      ? fmtBRL(v)
      : kpiGraficoDetalhe === "margin_pct"
        ? `${v.toFixed(1)}%`
        : v.toLocaleString("pt-BR");

  const mostrarRodapeTotal =
    somavel ||
    kpiGraficoDetalhe === "margin_pct" ||
    kpiGraficoDetalhe === "bet_size" ||
    kpiGraficoDetalhe === "arpu";

  const valorRodape = totalOficial;

  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        color: theme.text,
        fontFamily: FONT.body,
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, color: theme.text }}>{label}</div>
      {payload.map((p) => (
        <div
          key={String(p.name)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 4,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.color,
                flexShrink: 0,
              }}
            />
            {p.name}
          </span>
          <span style={{ fontWeight: 600 }}>
            {p.value != null && p.value !== "" ? formatar(Number(p.value)) : "—"}
          </span>
        </div>
      ))}
      {mostrarRodapeTotal && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginTop: 6,
            paddingTop: 6,
            borderTop: `1px solid ${theme.cardBorder}`,
          }}
        >
          <span style={{ fontWeight: 700, color: theme.text }}>Total</span>
          <span style={{ fontWeight: 700, color: theme.text }}>
            {somavel
              ? formatar(totalSomavel)
              : valorRodape != null
                ? formatar(valorRodape)
                : "—"}
          </span>
        </div>
      )}
    </div>
  );
}
