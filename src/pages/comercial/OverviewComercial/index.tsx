import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { FiltroBarCampoSelect } from "../../../components/FiltroBarCampoSelect";
import { FilterBarIcons, FILTRO_BAR_ICON_PROPS } from "../../../lib/filterBarIconCatalog";
import {
  FiltroSemanticoTabPill,
  SectionTitle,
} from "../../../components/dashboard";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  COMERCIAL_FILTRO_ARIA,
  COMERCIAL_FILTRO_TODOS,
  COMERCIAL_FILTRO_TODOS_LABEL,
  PIPELINE_COLOR,
  PIPELINE_TAB_LABEL,
  PIPELINE_COMERCIAL_NOMES,
  STATUS_PRODUTO_COLOR,
  STATUS_PRODUTO_ORDEM,
  type StatusPipeline,
} from "../PipelineB2B/constants";
import {
  buildComercialFiltroExtraOptions,
  buildPipelineComerciais,
  mapContatoFromDb,
  normalizeRetificacoes,
} from "../PipelineB2B/helpers";
import type { ComercialOpcao } from "../PipelineB2B/types";
import { GeoDistributionBlock } from "./GeoDistributionBlock";
import { OverviewPipelineFunnel } from "./OverviewPipelineFunnel";
import { MovimentacaoHoverCard } from "./MovimentacaoHoverCard";
import {
  UF_FILTRO_ARIA_LABEL,
  UF_FILTRO_OPTIONS,
  UF_FILTRO_TODAS,
  UF_FILTRO_TODAS_LABEL,
  buildMovimentacaoDetalhe,
  buildNovasMarcas,
  carteiraPorComercial,
  countProdutoByStatus,
  countSiteAtivo,
  countUniqueEmpresas,
  filterOverviewRows,
  formatDataBr,
  marcasPorUf,
  maxProdutoCount,
  pipelineFunnelCounts,
  STATUS_PRODUTO_LABEL,
  type HistoricoOverviewRow,
  type OverviewMarcaRow,
  type OverviewPipelineFilter,
} from "./helpers";

const PIPELINE_STAGES: StatusPipeline[] = ["disponiveis", "conexao", "negociacao", "fechado"];

function mapOverviewRow(
  raw: Record<string, unknown>,
  comercialNames: Record<string, string>,
): OverviewMarcaRow {
  const empresaRaw = raw.empresa as Record<string, unknown>;
  const contatosRaw = (raw.contatos as Record<string, unknown>[] | null) ?? [];
  const produtosRaw = (raw.produtos as Record<string, unknown>[] | null) ?? [];
  const comercialId = raw.comercial_user_id ? String(raw.comercial_user_id) : null;
  const rawComercialNome = comercialId ? comercialNames[comercialId] ?? null : null;
  const comercialNomeCanonico =
    rawComercialNome &&
    (PIPELINE_COMERCIAL_NOMES as readonly string[]).includes(rawComercialNome)
      ? rawComercialNome
      : null;

  return {
    id: String(raw.id),
    nome: String(raw.nome ?? ""),
    dominio: raw.dominio ? String(raw.dominio) : null,
    status_dominio: raw.status_dominio === "ok" ? "ok" : "inativo",
    status_pipeline: raw.status_pipeline as OverviewMarcaRow["status_pipeline"],
    status_folha: raw.status_folha as OverviewMarcaRow["status_folha"],
    comercial_user_id: comercialId,
    comercial_nome: comercialNomeCanonico,
    agregadora: raw.agregadora ? String(raw.agregadora) : null,
    ultimo_contato: raw.ultimo_contato ? String(raw.ultimo_contato) : null,
    ultima_comunicacao: raw.ultima_comunicacao ? String(raw.ultima_comunicacao) : null,
    created_at: raw.created_at ? String(raw.created_at) : null,
    empresa: {
      id: String(empresaRaw.id),
      razao_social: String(empresaRaw.razao_social ?? ""),
      cnpj: String(empresaRaw.cnpj ?? ""),
      portaria: empresaRaw.portaria ? String(empresaRaw.portaria) : null,
      portaria_retificacoes: normalizeRetificacoes(empresaRaw.portaria_retificacoes),
      requerimento_numero: empresaRaw.requerimento_numero ? String(empresaRaw.requerimento_numero) : null,
      requerimento_ano: empresaRaw.requerimento_ano ? String(empresaRaw.requerimento_ano) : null,
      cidade: empresaRaw.cidade ? String(empresaRaw.cidade) : null,
      estado: empresaRaw.estado ? String(empresaRaw.estado) : null,
    },
    contatos: contatosRaw.map(mapContatoFromDb),
    produtos: produtosRaw.map((p) => ({
      produto: p.produto as "mesa_dedicada" | "mesa_network",
      status_produto: p.status_produto as OverviewMarcaRow["produtos"][0]["status_produto"],
    })),
  };
}

function OverviewKpiButton({
  label,
  value,
  hint,
  accent,
  active,
  onClick,
  t,
}: {
  label: string;
  value: number;
  hint: string;
  accent: string;
  active?: boolean;
  onClick: () => void;
  t: { cardBorder: string; inputBg: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ?? false}
      style={{
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 18,
        padding: "16px 18px",
        background: t.inputBg,
        cursor: "pointer",
        textAlign: "left",
        borderLeft: `3px solid ${accent}`,
        outline: active ? `2px solid ${accent}` : undefined,
        outlineOffset: active ? 2 : undefined,
        fontFamily: FONT.body,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          color: "var(--text-muted, #6b7280)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT_TITLE,
          fontSize: 28,
          fontWeight: 800,
          marginTop: 4,
          fontVariantNumeric: "tabular-nums",
          color: accent,
        }}
      >
        {value.toLocaleString("pt-BR")}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-muted, #6b7280)", marginTop: 6 }}>{hint}</div>
    </button>
  );
}

export default function OverviewComercial() {
  const { theme: t, navigateTo } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("comercial_overview");

  const [comercialFiltro, setComercialFiltro] = useState(COMERCIAL_FILTRO_TODOS);
  const [ufFiltro, setUfFiltro] = useState(UF_FILTRO_TODAS);
  const [pipelineFiltro, setPipelineFiltro] = useState<OverviewPipelineFilter>("todos");
  const [rows, setRows] = useState<OverviewMarcaRow[]>([]);
  const [comerciais, setComerciais] = useState<ComercialOpcao[]>([]);
  const [historico, setHistorico] = useState<HistoricoOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const pageBox = getPageContentBoxStyle(brand, t);
  const filterBox = getPageFilterBoxStyle(brand, t);
  const grad = getCtaCriarGradient(brand);

  const loadData = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [marcasRes, gestoresRes, histRes] = await Promise.all([
      supabase
        .from("comercial_marcas")
        .select(
          `
          id, nome, dominio, status_dominio, status_pipeline, status_folha, comercial_user_id, ultima_comunicacao, created_at,
          empresa:comercial_empresas(id, razao_social, cnpj, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano, cidade, estado),
          contatos:comercial_marca_contatos(id, marca_id, nome, telefones, emails, linkedin, instagram, data_nascimento, ordem),
          produtos:comercial_marca_produtos(produto, status_produto)
        `,
        )
        .order("nome"),
      supabase
        .from("profiles")
        .select("id, name")
        .in("name", [...PIPELINE_COMERCIAL_NOMES])
        .or("ativo.is.null,ativo.eq.true"),
      supabase
        .from("comercial_marca_historico")
        .select("campo, valor_novo, marca_id, marca:comercial_marcas(nome)")
        .gte("created_at", cutoff),
    ]);

    if (marcasRes.error) console.error(marcasRes.error);
    if (gestoresRes.error) console.error(gestoresRes.error);
    if (histRes.error) console.error(histRes.error);

    const comercialList = buildPipelineComerciais(gestoresRes.data ?? []);
    setComerciais(comercialList);
    const names = Object.fromEntries(
      comercialList.flatMap((c) => (c.id ? [[c.id, c.name] as const] : [])),
    );
    setRows((marcasRes.data ?? []).map((r) => mapOverviewRow(r as Record<string, unknown>, names)));

    setHistorico(
      (histRes.data ?? []).map((h) => {
        const raw = h as Record<string, unknown>;
        const marcaRaw = raw.marca as { nome?: string } | null;
        return {
          marca_id: String(raw.marca_id ?? ""),
          marca_nome: String(marcaRaw?.nome ?? "—"),
          campo: String(raw.campo ?? ""),
          valor_novo: raw.valor_novo != null ? String(raw.valor_novo) : null,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(
    () => filterOverviewRows(rows, comercialFiltro, ufFiltro, pipelineFiltro, comerciais),
    [rows, comercialFiltro, ufFiltro, pipelineFiltro, comerciais],
  );

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

  const goPipeline = useCallback(
    (tabSlug?: string) => {
      navigateTo("comercial_pipeline_b2b", tabSlug ?? "Todos");
    },
    [navigateTo],
  );

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div className="app-page-shell app-page-shell--pb64">
      <PageHeader
        icon={<PageMenuIcon pageKey="comercial_overview" />}
        title={getPageMenuLabel("comercial_overview")}
        subtitle="Visão consolidada do funil B2B, produtos Live Cassino e carteira da equipe comercial."
      />

      <div style={filterBox}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            marginBottom: 10,
          }}
        >
          <FiltroBarCampoSelect
            value={comercialFiltro}
            onChange={setComercialFiltro}
            icon={FilterBarIcons.influencer}
            ariaLabel={COMERCIAL_FILTRO_ARIA}
            todasValue={COMERCIAL_FILTRO_TODOS}
            todasLabel={COMERCIAL_FILTRO_TODOS_LABEL}
            extraOptions={buildComercialFiltroExtraOptions(comerciais)}
            options={[]}
            minWidth={200}
          />
          <FiltroBarCampoSelect
            value={ufFiltro}
            onChange={setUfFiltro}
            icon={<MapPin {...FILTRO_BAR_ICON_PROPS} aria-hidden />}
            ariaLabel={UF_FILTRO_ARIA_LABEL}
            todasValue={UF_FILTRO_TODAS}
            todasLabel={UF_FILTRO_TODAS_LABEL}
            options={UF_FILTRO_OPTIONS}
            minWidth={200}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
          }}
        >
          <FiltroSemanticoTabPill
            label="Todos"
            semanticColor={brand.primary}
            active={pipelineFiltro === "todos"}
            onClick={() => setPipelineFiltro("todos")}
          />
          {PIPELINE_STAGES.map((stage) => (
            <FiltroSemanticoTabPill
              key={stage}
              label={PIPELINE_TAB_LABEL[stage]}
              semanticColor={PIPELINE_COLOR[stage]}
              active={pipelineFiltro === stage}
              onClick={() =>
                setPipelineFiltro((prev) => (prev === stage ? "todos" : stage))
              }
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
          }}
        >
          <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
            <Loader2
              size={24}
              className="app-lucide-spin"
              color="var(--brand-primary, #7c3aed)"
              aria-hidden
              style={{ marginBottom: 12 }}
            />
            <div style={{ fontSize: 13 }}>Carregando…</div>
          </div>
        </div>
      ) : (
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
                onClick={() => goPipeline("Todos")}
                t={t}
              />
              <OverviewKpiButton
                label="Marcas"
                value={filtered.length}
                hint="No pipeline"
                accent={brand.accent}
                onClick={() => goPipeline("Todos")}
                t={t}
              />
              <OverviewKpiButton
                label="Site ativo"
                value={countSiteAtivo(filtered)}
                hint="Domínio OK"
                accent={PIPELINE_COLOR.fechado}
                onClick={() => goPipeline("Disponiveis")}
                t={t}
              />
              <OverviewKpiButton
                label="Negociação"
                value={funnelCounts.negociacao}
                hint="Em proposta"
                accent={PIPELINE_COLOR.negociacao}
                onClick={() => goPipeline("Negociacao")}
                t={t}
              />
              <OverviewKpiButton
                label="Fechado"
                value={funnelCounts.fechado}
                hint="Assinado / Ativo"
                accent={PIPELINE_COLOR.fechado}
                onClick={() => goPipeline("Fechado")}
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
                        <span
                          style={{
                            width: 28,
                            fontSize: 11,
                            fontWeight: 700,
                            textAlign: "right",
                          }}
                        >
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
                      <span style={{ width: 110, fontSize: 11, color: t.textMuted }}>
                        Sem Status
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
                            width: `${(counts.sem_status / maxVal) * 100}%`,
                            borderRadius: 999,
                            background: "#6b7280",
                            opacity: 0.85,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          width: 28,
                          fontSize: 11,
                          fontWeight: 700,
                          textAlign: "right",
                        }}
                      >
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
              <SectionTitle sub="Comercial atribuído a cada Marca">
                Carteira por comercial
              </SectionTitle>
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
              <SectionTitle sub="Marcas cadastradas nos últimos 30 dias">
                Novas marcas
              </SectionTitle>
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
            <SectionTitle sub="Alterações dos últimos 30 dias">
              Movimentação recente
            </SectionTitle>
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
      )}
    </div>
  );
}
