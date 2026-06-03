import {
  ArrowUpDown,
  ChartColumnBig,
  CircleDollarSign,
  Hash,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CSSProperties } from "react";
import KpiCard from "../../../components/dashboard/KpiCard";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { SkeletonKpiCard } from "../../../components/dashboard";
import { BRAND } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import {
  KPI_UAP_VS_LEGENDA,
  fmtPct,
  nKpi,
} from "./overviewSpinLogic";
import type { KpiExibirSnapshot } from "./useOverviewSpinKpiExibir";

type Props = {
  contentBoxStyle: CSSProperties;
  loading: boolean;
  historico: boolean;
  modoAgregadoTodasOperadoras: boolean;
  kpiExibir: KpiExibirSnapshot | null;
  kpiAntExibir: KpiExibirSnapshot | null;
  isHistoricoKpi: boolean;
};

export function OverviewSpinKpisConsolidados({
  contentBoxStyle,
  loading,
  historico,
  modoAgregadoTodasOperadoras,
  kpiExibir,
  kpiAntExibir,
  isHistoricoKpi,
}: Props) {
  return (
    <div style={contentBoxStyle}>
      <SectionTitle
        sub={
          historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"
        }
      >
        KPIs Consolidados
      </SectionTitle>
      {loading ? (
        modoAgregadoTodasOperadoras ? (
          <>
            <div className="app-grid-kpi-3" style={{ gap: 12, marginBottom: 12 }}>
              {[0, 1, 2].map((i) => (
                <SkeletonKpiCard key={`a-${i}`} />
              ))}
            </div>
            <div className="app-grid-kpi-4" style={{ gap: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonKpiCard key={`b-${i}`} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonKpiCard key={i} />
              ))}
            </div>
            <div className="app-grid-kpi-3" style={{ gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <SkeletonKpiCard key={i} />
              ))}
            </div>
          </>
        )
      ) : modoAgregadoTodasOperadoras ? (
        <>
          <div className="app-grid-kpi-3" style={{ gap: 12, marginBottom: 12 }}>
            <KpiCard
              label="GGR"
              value={kpiExibir?.ggr != null ? fmtBRL(kpiExibir.ggr) : "—"}
              icon={<TrendingUp size={16} />}
              accentColor={nKpi(kpiExibir?.ggr) >= 0 ? BRAND.verde : BRAND.vermelho}
              atual={nKpi(kpiExibir?.ggr)}
              anterior={nKpi(kpiAntExibir?.ggr)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Turnover"
              value={kpiExibir?.turnover != null ? fmtBRL(kpiExibir.turnover) : "—"}
              icon={<ArrowUpDown size={16} />}
              accentVar="--brand-contrast"
              accentColor={BRAND.roxoVivo}
              atual={nKpi(kpiExibir?.turnover)}
              anterior={nKpi(kpiAntExibir?.turnover)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Margem"
              value={kpiExibir?.margin_pct != null ? fmtPct(kpiExibir.margin_pct) : "—"}
              icon={<Percent size={16} />}
              accentColor={BRAND.amarelo}
              atual={nKpi(kpiExibir?.margin_pct)}
              anterior={nKpi(kpiAntExibir?.margin_pct)}
              isHistorico={isHistoricoKpi}
            />
          </div>
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            <KpiCard
              label="Apostas"
              value={kpiExibir?.bets != null ? kpiExibir.bets.toLocaleString("pt-BR") : "—"}
              icon={<Hash size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={BRAND.azul}
              atual={nKpi(kpiExibir?.bets)}
              anterior={nKpi(kpiAntExibir?.bets)}
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Aposta média"
              value={kpiExibir?.bet_size != null ? fmtBRL(kpiExibir.bet_size) : "—"}
              icon={<ChartColumnBig size={16} />}
              accentVar="--brand-contrast"
              accentColor={BRAND.ciano}
              atual={nKpi(kpiExibir?.bet_size)}
              anterior={nKpi(kpiAntExibir?.bet_size)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="UAP"
              value={kpiExibir?.uap != null ? kpiExibir.uap.toLocaleString("pt-BR") : "—"}
              icon={<Users size={16} />}
              accentVar="--brand-icon-color"
              accentColor={BRAND.roxo}
              atual={nKpi(kpiExibir?.uap)}
              anterior={nKpi(kpiAntExibir?.uap)}
              isHistorico={isHistoricoKpi}
              vsLegendaSuffix={KPI_UAP_VS_LEGENDA}
            />
            <KpiCard
              label="ARPU"
              value={kpiExibir?.arpu != null ? fmtBRL(kpiExibir.arpu) : "—"}
              icon={<CircleDollarSign size={16} />}
              accentVar="--brand-icon-color"
              accentColor={BRAND.roxoVivo}
              atual={nKpi(kpiExibir?.arpu)}
              anterior={nKpi(kpiAntExibir?.arpu)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
          </div>
        </>
      ) : (
        <>
          <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
            <KpiCard
              label="GGR"
              value={kpiExibir?.ggr != null ? fmtBRL(kpiExibir.ggr) : "—"}
              icon={<TrendingUp size={16} />}
              accentColor={nKpi(kpiExibir?.ggr) >= 0 ? BRAND.verde : BRAND.vermelho}
              atual={nKpi(kpiExibir?.ggr)}
              anterior={nKpi(kpiAntExibir?.ggr)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Turnover"
              value={kpiExibir?.turnover != null ? fmtBRL(kpiExibir.turnover) : "—"}
              icon={<ArrowUpDown size={16} />}
              accentVar="--brand-contrast"
              accentColor={BRAND.roxoVivo}
              atual={nKpi(kpiExibir?.turnover)}
              anterior={nKpi(kpiAntExibir?.turnover)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Apostas"
              value={kpiExibir?.bets != null ? kpiExibir.bets.toLocaleString("pt-BR") : "—"}
              icon={<Hash size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={BRAND.azul}
              atual={nKpi(kpiExibir?.bets)}
              anterior={nKpi(kpiAntExibir?.bets)}
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Margem"
              value={kpiExibir?.margin_pct != null ? fmtPct(kpiExibir.margin_pct) : "—"}
              icon={<Percent size={16} />}
              accentColor={BRAND.amarelo}
              atual={nKpi(kpiExibir?.margin_pct)}
              anterior={nKpi(kpiAntExibir?.margin_pct)}
              isHistorico={isHistoricoKpi}
            />
          </div>
          <div className="app-grid-kpi-3" style={{ gap: 12 }}>
            <KpiCard
              label="Aposta média"
              value={kpiExibir?.bet_size != null ? fmtBRL(kpiExibir.bet_size) : "—"}
              icon={<ChartColumnBig size={16} />}
              accentVar="--brand-contrast"
              accentColor={BRAND.ciano}
              atual={nKpi(kpiExibir?.bet_size)}
              anterior={nKpi(kpiAntExibir?.bet_size)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="UAP"
              value={kpiExibir?.uap != null ? kpiExibir.uap.toLocaleString("pt-BR") : "—"}
              icon={<Users size={16} />}
              accentVar="--brand-icon-color"
              accentColor={BRAND.roxo}
              atual={nKpi(kpiExibir?.uap)}
              anterior={nKpi(kpiAntExibir?.uap)}
              isHistorico={isHistoricoKpi}
              vsLegendaSuffix={KPI_UAP_VS_LEGENDA}
            />
            <KpiCard
              label="ARPU"
              value={kpiExibir?.arpu != null ? fmtBRL(kpiExibir.arpu) : "—"}
              icon={<CircleDollarSign size={16} />}
              accentVar="--brand-icon-color"
              accentColor={BRAND.roxoVivo}
              atual={nKpi(kpiExibir?.arpu)}
              anterior={nKpi(kpiAntExibir?.arpu)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
          </div>
        </>
      )}
    </div>
  );
}
