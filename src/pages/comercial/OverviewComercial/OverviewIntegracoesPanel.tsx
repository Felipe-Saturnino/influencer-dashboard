import { useMemo, type CSSProperties } from "react";
import { SectionTitle } from "../../../components/dashboard";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useApp } from "../../../context/AppContext";
import { OverviewBarList } from "./OverviewBarList";
import { OverviewGenericFunnel } from "./OverviewGenericFunnel";
import { OverviewKpiButton } from "./OverviewKpiButton";
import {
  countIntegracaoByStatus,
  integracaoAgregadorBars,
  integracaoCaminhoBars,
  integracaoFunnelLevels,
  integracaoFunnelTaxas,
  integracaoTipoBars,
  STATUS_INTEGRACAO_COLOR,
  STATUS_INTEGRACAO_KPI_LABEL,
  type OverviewIntegracaoRow,
} from "./helpersIntegracoes";

export function OverviewIntegracoesPanel({
  rows,
  pageBox,
  t,
}: {
  rows: OverviewIntegracaoRow[];
  pageBox: CSSProperties;
  t: { text: string; textMuted: string; cardBorder: string; inputBg: string };
}) {
  const brand = useDashboardBrand();
  const { navigateTo } = useApp();

  const levels = useMemo(() => integracaoFunnelLevels(rows), [rows]);
  const taxas = useMemo(() => integracaoFunnelTaxas(rows), [rows]);
  const tipoBars = useMemo(() => integracaoTipoBars(rows), [rows]);
  const caminhoBars = useMemo(() => integracaoCaminhoBars(rows), [rows]);
  const agregadorBars = useMemo(() => integracaoAgregadorBars(rows), [rows]);

  const kpiOrder = [
    { key: "total" as const, value: rows.length, accent: brand.primary },
    {
      key: "nao_iniciado" as const,
      value: countIntegracaoByStatus(rows, "nao_iniciado"),
      accent: STATUS_INTEGRACAO_COLOR.nao_iniciado,
    },
    {
      key: "em_andamento" as const,
      value: countIntegracaoByStatus(rows, "em_andamento"),
      accent: STATUS_INTEGRACAO_COLOR.em_andamento,
    },
    {
      key: "concluido" as const,
      value: countIntegracaoByStatus(rows, "concluido"),
      accent: STATUS_INTEGRACAO_COLOR.concluido,
    },
  ];

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="Clique para abrir Integração">KPIs consolidados</SectionTitle>
        <div className="app-grid-kpi-4">
          {kpiOrder.map((kpi) => (
            <OverviewKpiButton
              key={kpi.key}
              label={
                kpi.key === "total"
                  ? STATUS_INTEGRACAO_KPI_LABEL.total
                  : STATUS_INTEGRACAO_KPI_LABEL[kpi.key]
              }
              value={kpi.value}
              hint="Integrações"
              accent={kpi.accent}
              onClick={() => {
                if (kpi.key === "total") navigateTo("comercial_integracao", "Todos");
                else if (kpi.key === "nao_iniciado") {
                  navigateTo("comercial_integracao", "NaoIniciados");
                } else if (kpi.key === "em_andamento") {
                  navigateTo("comercial_integracao", "EmAndamento");
                } else navigateTo("comercial_integracao", "Concluidos");
              }}
              t={t}
            />
          ))}
        </div>
      </div>

      <div className="app-grid-2">
        <div style={pageBox}>
          <SectionTitle sub="Status da integração">Funil do pipeline</SectionTitle>
          <OverviewGenericFunnel
            levels={levels}
            taxas={taxas}
            ariaLabel="Funil do pipeline de integrações"
          />
        </div>
        <div style={pageBox}>
          <SectionTitle sub="Dedicada x Network">Produto</SectionTitle>
          <OverviewBarList items={tipoBars} t={t} />
        </div>
      </div>

      <div className="app-grid-2">
        <div style={pageBox}>
          <SectionTitle sub="Quantidade por valor de caminho">Caminho</SectionTitle>
          <OverviewBarList items={caminhoBars} t={t} />
        </div>
        <div style={pageBox}>
          <SectionTitle sub="Quantidade por agregador">Agregadores</SectionTitle>
          <OverviewBarList items={agregadorBars} t={t} />
        </div>
      </div>
    </>
  );
}
