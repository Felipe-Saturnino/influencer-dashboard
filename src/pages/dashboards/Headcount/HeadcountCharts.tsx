import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Theme } from "../../../constants/theme";
import { FONT } from "../../../constants/theme";
import type { HeadcountMetricas } from "../../../lib/headcountMetrics";

const PIE_CORES = ["#1e36f8", "#22c55e", "#f59e0b", "#a78bfa", "#6b7280", "#e84025"] as const;

type Props = {
  metricas: HeadcountMetricas;
  t: Theme;
};

function tooltipStyle(t: Theme) {
  return {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 8,
    fontSize: 12,
    fontFamily: FONT.body,
  };
}

export function HeadcountCharts({ metricas, t }: Props) {
  const dadosDiretoria = metricas.hcPorDiretoria.map((x) => ({
    nome: x.label.length > 14 ? `${x.label.slice(0, 12)}…` : x.label,
    valor: x.valor,
    nomeCompleto: x.label,
  }));

  const dadosContrato = metricas.mixContrato.map((x) => ({
    name: x.label,
    value: x.valor,
  }));

  const dadosSerie = metricas.serieMensal.map((s) => ({
    label: s.label,
    "HC ativo": s.hcAtivoFim,
    Admissões: s.admissoes,
    Desligamentos: s.desligamentos,
  }));

  const dadosOrigem = metricas.origemContratacao.map((x) => ({
    name: x.label,
    value: x.valor,
  }));

  return (
    <div className="app-grid-2" style={{ gap: 14 }}>
      <div style={{ minHeight: 260 }} role="img" aria-label="Gráfico de headcount por diretoria">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dadosDiretoria} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
            <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} />
            <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle(t)}
              formatter={(value: number) => [value, "HC ativo"]}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { nomeCompleto?: string } | undefined;
                return p?.nomeCompleto ?? "";
              }}
            />
            <Bar dataKey="valor" name="HC ativo" fill="var(--brand-action, #7c3aed)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ minHeight: 260 }} role="img" aria-label="Gráfico de mix de contrato">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={dadosContrato}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={80}
              paddingAngle={2}
            >
              {dadosContrato.map((_, i) => (
                <Cell key={dadosContrato[i]?.name ?? i} fill={PIE_CORES[i % PIE_CORES.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle(t)} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT.body }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{ minHeight: 280, gridColumn: "1 / -1" }}
        role="img"
        aria-label="Evolução mensal de headcount, admissões e desligamentos"
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dadosSerie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
            <XAxis dataKey="label" tick={{ fill: t.textMuted, fontSize: 11 }} />
            <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle(t)} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT.body }} />
            <Line type="monotone" dataKey="HC ativo" stroke="var(--brand-action, #7c3aed)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Admissões" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Desligamentos" stroke="#e84025" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {dadosOrigem.length > 0 && (
        <div
          style={{ minHeight: 240, gridColumn: "1 / -1" }}
          role="img"
          aria-label="Origem das contratações no período"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dadosOrigem} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
              <XAxis type="number" tick={{ fill: t.textMuted, fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: t.textMuted, fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle(t)} />
              <Bar dataKey="value" name="Contratações" fill="var(--brand-contrast, #1e36f8)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
