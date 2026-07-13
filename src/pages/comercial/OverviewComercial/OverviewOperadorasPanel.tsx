import { SectionTitle } from "../../../components/dashboard";
import { FONT } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  PIPELINE_COLOR,
  STATUS_PRODUTO_COLOR,
  STATUS_PRODUTO_ORDEM,
  type StatusPipeline,
} from "../PipelineB2B/constants";
import type { ComercialOpcao } from "../PipelineB2B/types";
import { GeoDistributionBlock } from "./GeoDistributionBlock";
import { OverviewPipelineFunnel } from "./OverviewPipelineFunnel";
import { MovimentacaoHoverCard } from "./MovimentacaoHoverCard";
import { OverviewKpiButton } from "./OverviewKpiButton";
import {
  buildMovimentacaoDetalhe,
  buildNovasMarcas,
  carteiraPorComercial,
  countProdutoByStatus,
  countSiteAtivo,
  countUniqueEmpresas,
  formatDataBr,
  marcasPorUf,
  maxProdutoCount,
  pipelineFunnelCounts,
  STATUS_PRODUTO_LABEL,
  type HistoricoOverviewRow,
  type OverviewMarcaRow,
} from "./helpers";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { CSSProperties } from "react";
import { useMemo } from "react";

export function OverviewOperadorasPanel({
  filtered,
  comerciais,
  historico,
  pageBox,
  t,
  onGoPipeline,
}: {
  filtered: OverviewMarcaRow[];
  comerciais: ComercialOpcao[];
  historico: HistoricoOverviewRow[];
  pageBox: CSSProperties;
  t: {
    text: string;
    textMuted: string;
    cardBorder: string;
    inputBg: string;
  };
  onGoPipeline: (tabSlug?: string) => void;
}) {
  const brand = useDashboardBrand();
  const grad = getCtaCriarGradient(brand);

  const funnel = useMemo(() => pipelineFunnelCounts(filtered), [filtered]);
  const funnelCounts = useMemo(
    () =>
      Object.fromEntries(funnel.map((f) => [f.stage, f.count])) as Record<StatusPipeline, number>,
    [funnel],
  );
  const dedicadaCounts = useMemo(
    () => countProdutoByStatus(filtered, "mesa_dedicada"),
    [filtered],
  );
  const networkCounts = useMemo(
    () => countProdutoByStatus(filtered, "mesa_network"),
    [filtered],
  );
  const maxDed = maxProdutoCount(dedicadaCounts);
  const maxNet = maxProdutoCount(networkCounts);
  const porUf = useMemo(() => marcasPorUf(filtered), [filtered]);
  const carteira = useMemo(
    () => carteiraPorComercial(filtered, comerciais),
    [filtered, comerciais],
  );
  const maxCarteira = Math.max(1, ...carteira.map((c) => c.count));
  const novasMarcas = useMemo(
    () => buildNovasMarcas(filtered, comerciais),
    [filtered, comerciais],
  );
  const filteredMarcaIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  const movimentacao = useMemo(
    () => buildMovimentacaoDetalhe(historico, filteredMarcaIds),
    [historico, filteredMarcaIds],
  );

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="Clique para abrir o Pipeline B2B detalhado">
          KPIs consolidados
        </SectionTitle>
        <div className="app-grid-kpi-5">
          <OverviewKpiButton
            label="Empresas"
            value={countUniqueEmpresas(filtered)}
            hint="CNPJs licenciados"
            accent={brand.primary}
            onClick={() => onGoPipeline("Todos")}
            t={t}
          />
          <OverviewKpiButton
            label="Marcas"
            value={filtered.length}
            hint="No pipeline"
            accent={brand.accent}
            onClick={() => onGoPipeline("Todos")}
            t={t}
          />
          <OverviewKpiButton
            label="Site ativo"
            value={countSiteAtivo(filtered)}
            hint="Domínio OK"
            accent={PIPELINE_COLOR.fechado}
            onClick={() => onGoPipeline("Disponiveis")}
            t={t}
          />
          <OverviewKpiButton
            label="Negociação"
            value={funnelCounts.negociacao}
            hint="Em proposta"
            accent={PIPELINE_COLOR.negociacao}
            onClick={() => onGoPipeline("Negociacao")}
            t={t}
          />
          <OverviewKpiButton
            label="Fechado"
            value={funnelCounts.fechado}
            hint="Assinado / Ativo"
            accent={PIPELINE_COLOR.fechado}
            onClick={() => onGoPipeline("Fechado")}
            t={t}
          />
        </div>
      </div>

      <div className="app-grid-2">
        <div style={pageBox}>
          <SectionTitle sub="Marcas reguladas">Funil do pipeline</SectionTitle>
          <OverviewPipelineFunnel funnel={funnel} funnelCounts={funnelCounts} />
        </div>
        <div style={pageBox}>
          <SectionTitle sub="Status de Dedicada x Network">Produto</SectionTitle>
          <div className="app-grid-2" style={{ gap: 20 }}>
            {(
              [
                ["Dedicada", dedicadaCounts, maxDed],
                ["Network", networkCounts, maxNet],
              ] as const
            ).map(([title, counts, maxVal]) => (
              <div key={title}>
                <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, fontFamily: FONT.body }}>
                  {title}
                </h4>
                {STATUS_PRODUTO_ORDEM.map((st) => (
                  <div
                    key={st}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      fontFamily: FONT.body,
                    }}
                  >
                    <span style={{ width: 110, fontSize: 11, color: t.textMuted }}>
                      {STATUS_PRODUTO_LABEL[st]}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 10,
                        background: t.inputBg,
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(counts[st] / maxVal) * 100}%`,
                          borderRadius: 999,
                          background: STATUS_PRODUTO_COLOR[st],
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    <span style={{ width: 28, fontSize: 11, fontWeight: 700, textAlign: "right" }}>
                      {counts[st]}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    fontFamily: FONT.body,
                  }}
                >
                  <span style={{ width: 110, fontSize: 11, color: t.textMuted }}>Sem Status</span>
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      background: t.inputBg,
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(counts.sem_status / maxVal) * 100}%`,
                        borderRadius: 999,
                        background: "#6b7280",
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span style={{ width: 28, fontSize: 11, fontWeight: 700, textAlign: "right" }}>
                    {counts.sem_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="Clique no estado para ver as marcas com sede na região">
          Distribuição geográfica
        </SectionTitle>
        <GeoDistributionBlock
          porUf={porUf}
          brandPrimary={brand.primary}
          brandAccent={brand.accent}
          t={t}
        />
      </div>

      <div className="app-grid-2">
        <div style={pageBox}>
          <SectionTitle sub="Comercial atribuído a cada Marca">Carteira por comercial</SectionTitle>
          {carteira.length === 0 ? (
            <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
              Nenhuma marca atribuída para os filtros selecionados.
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
                <span style={{ fontSize: 11, color: t.textMuted, width: 90, textAlign: "right" }}>
                  {c.count} marcas
                </span>
              </div>
            ))
          )}
        </div>
        <div style={pageBox}>
          <SectionTitle sub="Marcas cadastradas nos últimos 30 dias">Novas marcas</SectionTitle>
          {novasMarcas.length === 0 ? (
            <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
              Nenhuma marca cadastrada nos últimos 30 dias.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {novasMarcas.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "2px 12px",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                    fontFamily: FONT.body,
                  }}
                >
                  <strong style={{ fontSize: 12 }}>{m.nome}</strong>
                  <span
                    style={{
                      gridColumn: 2,
                      gridRow: "1 / span 2",
                      alignSelf: "start",
                      display: "inline-flex",
                      padding: "3px 9px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      background: `${m.statusCor}22`,
                      color: m.statusCor,
                      border: `1px solid ${m.statusCor}44`,
                    }}
                  >
                    {m.statusLabel}
                  </span>
                  <span style={{ fontSize: 11, color: t.textMuted }}>
                    {m.empresa} · {m.uf}
                  </span>
                  <span style={{ fontSize: 11, color: t.textMuted }}>
                    {formatDataBr(m.created_at)} · {m.comercial}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="Alterações dos últimos 30 dias">Movimentação recente</SectionTitle>
        <div className="app-grid-kpi-4">
          <MovimentacaoHoverCard
            label="→ Negociação"
            value={movimentacao.negociacao.length}
            marcas={movimentacao.negociacao}
            valueColor={PIPELINE_COLOR.negociacao}
            prefixPlus
            t={t}
          />
          <MovimentacaoHoverCard
            label="→ Fechado"
            value={movimentacao.fechado.length}
            marcas={movimentacao.fechado}
            valueColor={PIPELINE_COLOR.fechado}
            prefixPlus
            t={t}
          />
          <MovimentacaoHoverCard
            label="Sem interesse"
            value={movimentacao.semInteresse.length}
            marcas={movimentacao.semInteresse}
            valueColor="#e84025"
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
    </>
  );
}
