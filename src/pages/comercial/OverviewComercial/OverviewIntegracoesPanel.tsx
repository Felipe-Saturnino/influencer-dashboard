import { useMemo, type CSSProperties } from "react";
import { SectionTitle } from "../../../components/dashboard";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useApp } from "../../../context/AppContext";
import { OverviewBarList } from "./OverviewBarList";
import { OverviewKpiButton } from "./OverviewKpiButton";
import {
  computeIntegracaoSla,
  countIntegracaoByStatus,
  formatSlaDuracao,
  integracaoAgregadorBars,
  integracaoCaminhoBars,
  integracaoTipoBars,
  STATUS_INTEGRACAO_COLOR,
  STATUS_INTEGRACAO_KPI_LABEL,
  STATUS_INTEGRACAO_LABEL,
  STATUS_INTEGRACAO_ORDEM,
  type OverviewIntegracaoHistorico,
  type OverviewIntegracaoRow,
} from "./helpersIntegracoes";

const SLA_SUB: Record<(typeof STATUS_INTEGRACAO_ORDEM)[number], string> = {
  nao_iniciado: "Criação → Em andamento",
  em_andamento: "Em andamento → Concluído",
  concluido: "Criação → Concluído",
};

export function OverviewIntegracoesPanel({
  rows,
  historico,
  pageBox,
  t,
}: {
  rows: OverviewIntegracaoRow[];
  historico: OverviewIntegracaoHistorico[];
  pageBox: CSSProperties;
  t: { text: string; textMuted: string; cardBorder: string; inputBg: string };
}) {
  const brand = useDashboardBrand();
  const { navigateTo } = useApp();

  const tipoBars = useMemo(() => integracaoTipoBars(rows), [rows]);
  const caminhoBars = useMemo(() => integracaoCaminhoBars(rows), [rows]);
  const agregadorBars = useMemo(() => integracaoAgregadorBars(rows), [rows]);
  const sla = useMemo(() => computeIntegracaoSla(rows, historico), [rows, historico]);

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
          <SectionTitle sub="Tempo médio até a próxima etapa do funil">SLA por etapa</SectionTitle>
          <div className="app-grid-kpi-3">
            {STATUS_INTEGRACAO_ORDEM.map((st) => (
              <OverviewKpiButton
                key={st}
                label={STATUS_INTEGRACAO_LABEL[st]}
                valueText={formatSlaDuracao(sla[st])}
                hint={SLA_SUB[st]}
                accent={STATUS_INTEGRACAO_COLOR[st]}
                t={t}
              />
            ))}
          </div>
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
