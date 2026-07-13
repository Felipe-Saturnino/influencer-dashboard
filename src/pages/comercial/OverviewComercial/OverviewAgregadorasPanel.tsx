import { useMemo, type CSSProperties } from "react";
import { SectionTitle } from "../../../components/dashboard";
import { FONT } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useApp } from "../../../context/AppContext";
import {
  STATUS_PIPELINE_AGREGADORA_COLOR,
  STATUS_PIPELINE_AGREGADORA_LABEL,
  STATUS_PIPELINE_AGREGADORA_ORDEM,
} from "../PipelineAgregadoras/constants";
import type { ComercialOpcao } from "../PipelineB2B/types";
import { OverviewGenericFunnel } from "./OverviewGenericFunnel";
import { OverviewKpiButton } from "./OverviewKpiButton";
import { MovimentacaoHoverCard } from "./MovimentacaoHoverCard";
import {
  agregadoraFunnelLevels,
  agregadoraFunnelTaxas,
  buildAgregadoraMovimentacao,
  carteiraAgregadorasPorComercial,
  countAgregadoraByStatus,
  type OverviewAgregadoraHistorico,
  type OverviewAgregadoraRow,
} from "./helpersAgregadoras";

export function OverviewAgregadorasPanel({
  rows,
  historico,
  comerciais,
  pageBox,
  t,
}: {
  rows: OverviewAgregadoraRow[];
  historico: OverviewAgregadoraHistorico[];
  comerciais: ComercialOpcao[];
  pageBox: CSSProperties;
  t: { text: string; textMuted: string; cardBorder: string; inputBg: string };
}) {
  const brand = useDashboardBrand();
  const { navigateTo } = useApp();
  const grad = getCtaCriarGradient(brand);

  const levels = useMemo(() => agregadoraFunnelLevels(rows), [rows]);
  const taxas = useMemo(() => agregadoraFunnelTaxas(rows), [rows]);
  const carteira = useMemo(
    () => carteiraAgregadorasPorComercial(rows, comerciais),
    [rows, comerciais],
  );
  const maxCarteira = Math.max(1, ...carteira.map((c) => c.count));
  const movimentacao = useMemo(() => buildAgregadoraMovimentacao(historico), [historico]);

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="Clique para abrir o Pipeline Agregadoras">
          KPIs consolidados
        </SectionTitle>
        <div className="app-grid-kpi-4">
          {STATUS_PIPELINE_AGREGADORA_ORDEM.map((status) => (
            <OverviewKpiButton
              key={status}
              label={STATUS_PIPELINE_AGREGADORA_LABEL[status]}
              value={countAgregadoraByStatus(rows, status)}
              accent={STATUS_PIPELINE_AGREGADORA_COLOR[status]}
              onClick={() => {
                if (status === "disponiveis") navigateTo("comercial_pipeline_agregadoras", "Todos");
                else if (status === "conexao") navigateTo("comercial_pipeline_agregadoras", "Conexao");
                else if (status === "negociacao") {
                  navigateTo("comercial_pipeline_agregadoras", "Negociacao");
                } else navigateTo("comercial_pipeline_agregadoras", "Fechado");
              }}
              t={t}
            />
          ))}
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="Agregadoras no funil">Funil do pipeline</SectionTitle>
        <OverviewGenericFunnel
          levels={levels}
          taxas={taxas}
          ariaLabel="Funil do pipeline de agregadoras"
        />
      </div>

      <div className="app-grid-2">
        <div style={pageBox}>
          <SectionTitle sub="Comercial atribuído a cada agregadora">
            Carteira por comercial
          </SectionTitle>
          {carteira.length === 0 ? (
            <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
              Nenhuma agregadora atribuída para os filtros selecionados.
            </p>
          ) : (
            carteira.map((c) => (
              <div
                key={c.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  fontFamily: FONT.body,
                }}
              >
                <span
                  style={{
                    width: 120,
                    fontSize: 12,
                    fontWeight: 600,
                    color: c.userId ? t.text : t.textMuted,
                  }}
                >
                  {c.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 22,
                    background: t.inputBg,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(c.count / maxCarteira) * 100}%`,
                      borderRadius: 6,
                      background: c.userId ? grad : "#9ca3af",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: t.textMuted, width: 110, textAlign: "right" }}>
                  {c.count} agregadoras
                </span>
              </div>
            ))
          )}
        </div>
        <div style={pageBox}>
          <SectionTitle sub="Alterações dos últimos 30 dias">Movimentação recente</SectionTitle>
          <div className="app-grid-2" style={{ gap: 12, marginBottom: 12 }}>
            <MovimentacaoHoverCard
              label="→ Conexão"
              value={movimentacao.conexao.length}
              marcas={movimentacao.conexao}
              valueColor={STATUS_PIPELINE_AGREGADORA_COLOR.conexao}
              prefixPlus
              t={t}
            />
            <MovimentacaoHoverCard
              label="→ Negociação"
              value={movimentacao.negociacao.length}
              marcas={movimentacao.negociacao}
              valueColor={STATUS_PIPELINE_AGREGADORA_COLOR.negociacao}
              prefixPlus
              t={t}
            />
          </div>
          <div className="app-grid-2" style={{ gap: 12 }}>
            <MovimentacaoHoverCard
              label="→ Fechado"
              value={movimentacao.fechado.length}
              marcas={movimentacao.fechado}
              valueColor={STATUS_PIPELINE_AGREGADORA_COLOR.fechado}
              prefixPlus
              t={t}
            />
            <MovimentacaoHoverCard
              label="Alterações totais"
              value={movimentacao.total.length}
              marcas={movimentacao.total}
              valueColor={brand.primary}
              t={t}
            />
          </div>
        </div>
      </div>
    </>
  );
}
