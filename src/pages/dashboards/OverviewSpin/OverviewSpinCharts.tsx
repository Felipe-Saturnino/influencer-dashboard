import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FONT } from "../../../constants/theme";
import type { useApp } from "../../../context/AppContext";
import type { JogoComparativoKey, KpiJogoKey } from "./overviewSpinLogic";
import { TooltipComparativoJogo, TooltipDetalheOperadoras } from "./overviewSpinChartTooltips";

type Theme = ReturnType<typeof useApp>["theme"];
type TooltipTheme = { cardBg: string; cardBorder: string; text: string };
type KpiConfig = { label: string; somavel: boolean; tipoGrafico: "barra" | "linha" };

export function OverviewSpinDetalhamentoChart(props: {
  dados: Record<string, unknown>[];
  slugs: string[];
  cores: Map<string, string>;
  slugToNome: (slug: string) => string;
  kpi: KpiJogoKey;
  config: KpiConfig;
  isBRL: boolean;
  tooltipTheme: TooltipTheme;
  t: Theme;
}) {
  const { dados, slugs, cores, slugToNome, kpi, config, isBRL, tooltipTheme, t } = props;
  const dadosChart = dados as Record<string, string | number | null>[];
  return (
    <ResponsiveContainer width="100%" height="100%">
      {config.tipoGrafico === "barra" ? (
        <BarChart data={dadosChart} margin={{ top: 8, right: 16, left: 8, bottom: 4 }} barCategoryGap="30%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} opacity={0.5} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }} interval="preserveStartEnd" tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
            width={isBRL ? 72 : 44}
            tickFormatter={(v: number) => (isBRL ? `R$${(v / 1000).toFixed(0)}K` : v.toLocaleString("pt-BR"))}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<TooltipDetalheOperadoras theme={tooltipTheme} kpiGraficoDetalhe={kpi} somavel={config.somavel} isBRL={isBRL} />} />
          <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
          {slugs.map((slug) => (
            <Bar key={slug} dataKey={slug} name={slugToNome(slug)} fill={cores.get(slug) ?? "var(--brand-action, #7c3aed)"} radius={[4, 4, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      ) : (
        <LineChart data={dadosChart} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} opacity={0.5} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }} interval="preserveStartEnd" tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
            width={isBRL ? 72 : 44}
            tickFormatter={(v: number) =>
              isBRL ? `R$${(v / 1000).toFixed(0)}K` : kpi === "margin_pct" ? `${v.toFixed(0)}%` : v.toLocaleString("pt-BR")
            }
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<TooltipDetalheOperadoras theme={tooltipTheme} kpiGraficoDetalhe={kpi} somavel={config.somavel} isBRL={isBRL} />} />
          <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
          {slugs.map((slug) => (
            <Line key={slug} type="monotone" name={slugToNome(slug)} dataKey={slug} stroke={cores.get(slug) ?? "var(--brand-action, #7c3aed)"} strokeWidth={2} dot={{ r: 2 }} connectNulls />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export function OverviewSpinComparativoJogoChart(props: {
  dados: Record<string, string | number | null>[];
  jogos: { key: JogoComparativoKey; label: string; cor: string }[];
  kpi: KpiJogoKey;
  config: KpiConfig;
  isBRL: boolean;
  tooltipTheme: TooltipTheme;
  t: Theme;
}) {
  const { dados, jogos, kpi, config, isBRL, tooltipTheme, t } = props;
  return (
    <ResponsiveContainer width="100%" height="100%">
      {config.tipoGrafico === "barra" ? (
        <BarChart data={dados} margin={{ top: 8, right: 16, left: 8, bottom: 4 }} barCategoryGap="30%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} opacity={0.5} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }} interval="preserveStartEnd" tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
            width={isBRL ? 72 : 44}
            tickFormatter={(v: number) => (isBRL ? `R$${(v / 1000).toFixed(0)}K` : v.toLocaleString("pt-BR"))}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<TooltipComparativoJogo theme={tooltipTheme} kpiGrafico={kpi} somavel={config.somavel} isBRL={isBRL} />} />
          <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
          {jogos.map((jogo) => (
            <Bar key={jogo.key} dataKey={jogo.label} fill={jogo.cor} radius={[4, 4, 0, 0]} maxBarSize={32} />
          ))}
        </BarChart>
      ) : (
        <LineChart data={dados} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} opacity={0.5} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }} interval="preserveStartEnd" tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
            width={isBRL ? 72 : 44}
            tickFormatter={(v: number) =>
              isBRL ? `R$${(v / 1000).toFixed(0)}K` : kpi === "margin_pct" ? `${v.toFixed(0)}%` : v.toLocaleString("pt-BR")
            }
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<TooltipComparativoJogo theme={tooltipTheme} kpiGrafico={kpi} somavel={config.somavel} isBRL={isBRL} />} />
          <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
          {jogos.map((jogo) => (
            <Line key={jogo.key} type="monotone" name={jogo.label} dataKey={jogo.label} stroke={jogo.cor} strokeWidth={2} dot={{ r: 2 }} connectNulls />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
