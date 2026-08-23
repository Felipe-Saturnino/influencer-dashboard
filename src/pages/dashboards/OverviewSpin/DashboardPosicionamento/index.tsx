import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Clock,
  Eye,
  Loader2,
  MapPin,
  Minus,
  Network,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../../hooks/useDataTableBlock";
import { FONT } from "../../../../constants/theme";
import {
  dataTableRowHoverHandlers,
  getDataTableStyle,
  getDataTableWrapStyle,
} from "../../../../lib/dataTableStyles";
import SectionTitle from "../../../../components/dashboard/SectionTitle";
import { SkeletonKpiCard, SortTableTh, type SortDir, FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../../components/dashboard";
import { compareLocaleTexto, compareNumber } from "../../../../lib/classificacaoSort";
import {
  type HeatmapHistoricoModo,
  type LobbyPosicaoRow,
  type AlertaPos,
  type CanalEstudioPosicionamento,
  fmtPosicao,
  posicaoBgColor,
  posicaoTextColor,
  deltaPosicao,
  posicaoMediaMesaNoBucket,
  colunasHistoricoPosicionamento,
  execIdsColunaHistorico,
  fmtUltimaAtualizacao,
  SEMANTIC,
  labelMesaPosicionamentoRow,
  filtrarPosicoesPorCanal,
  concorrentesPorJogoDetalhe,
  rankingConcorrentesFromPosicoes,
  visibilidadePorCategoriaDia,
} from "../../../../lib/lobbyMonitorHelpers";
import { useLobbyPosicionamentoData, POS_COMPARACAO_DIFERENTE_DIAS } from "./useLobbyPosicionamentoData";
import {
  operadoraTemCanaisDedicadoENetwork,
  type OverviewSpinCatalogoCanais,
} from "../overviewSpinCatalogo";
import {
  getPageContentBoxShellStyle,
  getPageContentBoxStyle,
  getPageKpiSectionGapStyle,
} from "../../../../lib/pageContentBoxStyles";

interface Props {
  operadoraSlug: string;
  refDate: Date;
  slugToNome?: (slug: string) => string;
  catalogo?: OverviewSpinCatalogoCanais;
}

const VS_ONTEM = "vs ontem (mesmo horário)";
const VS_ULTIMO_HORARIO = "vs último horário";

const CANAIS_POSICIONAMENTO: { id: CanalEstudioPosicionamento; label: string; icon: typeof Building2 }[] = [
  { id: "dedicado", label: "Dedicado", icon: Building2 },
  { id: "network", label: "Network", icon: Network },
];

const HISTORICO_MODOS: { id: HeatmapHistoricoModo; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
];

type CatVisSortCol = "categoria" | "top3" | "top10";
type HistMesaSortCol = "mesa";

function PosicionamentoCanalToggle({
  canal,
  onChange,
}: {
  canal: CanalEstudioPosicionamento;
  onChange: (canal: CanalEstudioPosicionamento) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Canal das mesas"
      onKeyDown={(e) =>
        onFiltroBarTabsKeyDown(
          e,
          CANAIS_POSICIONAMENTO.map((c) => c.id),
          onChange,
          (id) => `tab-pos-canal-${id}`,
        )
      }
      style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
    >
      {CANAIS_POSICIONAMENTO.map((c) => {
        const Icon = c.icon;
        return (
          <FiltroBarTabButton
            key={c.id}
            id={`tab-pos-canal-${c.id}`}
            active={canal === c.id}
            aria-controls={`panel-pos-canal-${c.id}`}
            onClick={() => onChange(c.id)}
            icon={<Icon {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {c.label}
          </FiltroBarTabButton>
        );
      })}
    </div>
  );
}

function PosicionamentoSecaoHeader({
  titulo,
  sub,
  mostrarToggleCanal,
  canalFiltro,
  onCanalFiltro,
}: {
  titulo: string;
  sub?: string;
  mostrarToggleCanal: boolean;
  canalFiltro: CanalEstudioPosicionamento;
  onCanalFiltro: (canal: CanalEstudioPosicionamento) => void;
}) {
  if (!mostrarToggleCanal) {
    return <SectionTitle sub={sub}>{titulo}</SectionTitle>;
  }
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 16,
      }}
    >
      <SectionTitle sub={sub} compact>
        {titulo}
      </SectionTitle>
      <PosicionamentoCanalToggle canal={canalFiltro} onChange={onCanalFiltro} />
    </div>
  );
}

function KpiPosCard({
  label,
  value,
  subValue,
  delta,
  deltaLabel,
  positivo,
  icon,
}: {
  label: string;
  value: string;
  subValue?: string | null;
  delta?: string | null;
  deltaLabel?: string;
  positivo?: boolean | null;
  icon: React.ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const corDelta =
    positivo == null ? t.textMuted : positivo ? SEMANTIC.verde : SEMANTIC.vermelho;

  return (
    <div
      style={{
        ...getPageContentBoxShellStyle(brand, t),
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, var(--brand-action, #7c3aed), transparent)`,
        }}
      />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 22%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--brand-action, #7c3aed)",
            }}
          >
            {icon}
          </span>
          <span
            style={{
              color: t.textMuted,
              fontSize: 10,
              fontFamily: FONT.body,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: t.text,
            fontFamily: FONT.body,
            marginBottom: subValue ? 4 : 6,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        {subValue ? (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: t.textMuted,
              fontFamily: FONT.body,
              marginBottom: 6,
            }}
          >
            {subValue}
          </div>
        ) : null}
        {delta != null && delta !== "" && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: FONT.body }}>
            <span style={{ color: corDelta, fontWeight: 700 }}>{delta}</span>
            <span style={{ color: t.textMuted, fontSize: 10 }}>{deltaLabel ?? "vs anterior"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ConcorrentesCountHover({
  qtd,
  jogos,
}: {
  qtd: number;
  jogos: { name: string; provider_name: string; posicao: number }[];
}) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  if (qtd === 0) {
    return <span style={{ color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>0</span>;
  }
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-label={`Ver ${qtd} concorrentes à frente`}
        aria-haspopup="true"
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          background: "none",
          border: "none",
          cursor: "default",
          padding: 0,
          color: "var(--brand-action, #7c3aed)",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          borderBottom: "1px dotted var(--brand-action, #7c3aed)",
          fontFamily: FONT.body,
          fontSize: "inherit",
        }}
      >
        {qtd}
      </button>
      {open && jogos.length > 0 && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 6,
            zIndex: 20,
            minWidth: 200,
            maxWidth: 280,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.cardBg,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            fontFamily: FONT.body,
            fontSize: 12,
            textAlign: "left",
          }}
        >
          {jogos.map((j) => (
            <div
              key={`${j.posicao}-${j.name}`}
              style={{ marginBottom: 6, color: t.text, lineHeight: 1.35 }}
            >
              <span style={{ color: t.textMuted }}>{fmtPosicao(j.posicao)} · </span>
              {j.name}
              <span style={{ color: t.textMuted }}> — {j.provider_name}</span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

function PosicaoBadge({ posicao }: { posicao: number | null | undefined }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 40,
        padding: "4px 8px",
        borderRadius: 8,
        textAlign: "center",
        fontWeight: 700,
        fontSize: 12,
        fontFamily: FONT.body,
        background: posicaoBgColor(posicao),
        color: posicaoTextColor(posicao),
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {fmtPosicao(posicao)}
    </span>
  );
}

function PosicaoAtualMesasBlock({
  titulo,
  loading,
  semDados,
  erro,
  onRetry,
  mesasOrdenadas,
  prevMap,
  prevDiferenteMap,
  layout = "operadora",
  ultimaExecutadoEm,
  cardStyle,
  mostrarToggleCanal = false,
  canalFiltro = "dedicado",
  onCanalFiltro,
}: {
  titulo: string;
  loading: boolean;
  semDados: boolean;
  erro?: string | null;
  onRetry?: () => void;
  mesasOrdenadas: LobbyPosicaoRow[];
  prevMap: Map<string, number | null>;
  /** Vista consolidada: última posição ≠ atual nos últimos 7 dias. */
  prevDiferenteMap?: Map<string, number | null>;
  /** `consolidado` = Todas Operadoras (mini-tabela Atual / Estúdio / Mesa / Anterior). */
  layout?: "operadora" | "consolidado";
  ultimaExecutadoEm: string | undefined;
  cardStyle: CSSProperties;
  mostrarToggleCanal?: boolean;
  canalFiltro?: CanalEstudioPosicionamento;
  onCanalFiltro?: (canal: CanalEstudioPosicionamento) => void;
}) {
  const { theme: t } = useApp();
  const dataTable = useDataTableBlock();
  const subTitulo = fmtUltimaAtualizacao(ultimaExecutadoEm);
  const header = (
    <PosicionamentoSecaoHeader
      titulo={titulo}
      sub={subTitulo}
      mostrarToggleCanal={mostrarToggleCanal}
      canalFiltro={canalFiltro}
      onCanalFiltro={onCanalFiltro ?? (() => {})}
    />
  );

  if (loading) {
    return (
      <div style={cardStyle}>
        {header}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "24px 0",
            color: t.textMuted,
            fontFamily: FONT.body,
            fontSize: 13,
          }}
        >
          <Loader2 size={16} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
          <span>Carregando…</span>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={cardStyle}>
        {header}
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginTop: 12,
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span>{erro}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={() => onRetry()}
              style={{
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(232,64,37,0.35)",
                background: "transparent",
                color: "#e84025",
                cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (semDados) {
    return (
      <div style={cardStyle}>
        {header}
        <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body, margin: "12px 0 0" }}>
          Sem dados para o período selecionado.
        </p>
      </div>
    );
  }

  if (layout === "consolidado") {
    return (
      <div style={cardStyle}>
        {header}
        <div className="app-table-wrap" style={{ ...getDataTableWrapStyle(), overflowX: "visible" }}>
          <table style={getDataTableStyle({ width: "100%", minWidth: 0, tableLayout: "fixed" })}>
            <caption style={{ display: "none" }}>{`Posição das mesas — ${titulo}`}</caption>
            <thead>
              <tr>
                <th scope="col" style={{ ...dataTable.thHeader, width: "18%" }}>
                  Atual
                </th>
                <th scope="col" style={{ ...dataTable.thHeader, width: "28%" }}>
                  Estúdio
                </th>
                <th scope="col" style={{ ...dataTable.thHeader, width: "36%" }}>
                  Mesa
                </th>
                <th scope="col" style={{ ...dataTable.thHeader, width: "18%" }}>
                  Anterior
                </th>
              </tr>
            </thead>
            <tbody>
              {mesasOrdenadas.map((m, i) => {
                const estudo = m.nome_estudio?.trim() || "—";
                const mesa = m.nome_mesa?.trim() || "—";
                const prevDif = prevDiferenteMap?.get(m.mesa_identificacao) ?? null;
                return (
                  <tr key={m.mesa_identificacao} style={{ background: dataTable.zebraRow(i) }} {...dataTableRowHoverHandlers(dataTable.zebraRow(i))}>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <PosicaoBadge posicao={m.posicao} />
                      </div>
                    </td>
                    <td
                      style={{
                        ...dataTable.tdCenter,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={estudo}
                    >
                      {estudo}
                    </td>
                    <td
                      style={{
                        ...dataTable.tdCenter,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={mesa}
                    >
                      {mesa}
                    </td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <PosicaoBadge posicao={prevDif} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {header}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {mesasOrdenadas.map((m) => {
          const pa = prevMap.get(m.mesa_identificacao) ?? null;
          const d = deltaPosicao(m.posicao, pa);
          const labelCompleto = labelMesaPosicionamentoRow(m);
          return (
            <li
              key={m.mesa_identificacao}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: `1px solid ${t.cardBorder}`,
                fontFamily: FONT.body,
                fontSize: 13,
              }}
            >
              <PosicaoBadge posicao={m.posicao} />
              <span
                style={{ flex: 1, color: t.text, overflow: "hidden", textOverflow: "ellipsis" }}
                title={labelCompleto}
              >
                {labelCompleto}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 28, justifyContent: "flex-end" }}>
                {d == null || d === 0 ? (
                  <Minus size={14} color={SEMANTIC.cinza} aria-label="Sem variação de posição" />
                ) : d < 0 ? (
                  <ArrowUp size={14} color={SEMANTIC.verde} aria-label={`${labelCompleto} melhorou posição`} />
                ) : (
                  <ArrowDown size={14} color={SEMANTIC.vermelho} aria-label={`${labelCompleto} piorou posição`} />
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AlertasPeriodoBlock({
  alertas,
  cardStyle,
  loadingHistorico,
  sub,
}: {
  alertas: AlertaPos[];
  cardStyle: CSSProperties;
  loadingHistorico?: boolean;
  sub?: string;
}) {
  const { theme: t } = useApp();

  return (
    <div style={cardStyle}>
      <SectionTitle sub={sub}>Alertas do período</SectionTitle>
      {loadingHistorico ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: t.textMuted,
            fontFamily: FONT.body,
            fontSize: 13,
          }}
        >
          <Clock size={12} aria-hidden />
          <span>Carregando…</span>
        </div>
      ) : alertas.length === 0 ? (
        <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body, margin: 0 }}>
          Nenhum alerta automático para o período.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {alertas.map((a, i) => (
            <li
              key={`${a.sortTs ?? i}-${a.texto}`}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                marginBottom: 8,
                fontFamily: FONT.body,
                fontSize: 13,
                background:
                  a.tipo === "positivo"
                    ? "color-mix(in srgb, #22c55e 14%, transparent)"
                    : "color-mix(in srgb, #f59e0b 16%, transparent)",
                color: t.text,
                border: `1px solid ${
                  a.tipo === "positivo"
                    ? "color-mix(in srgb, #22c55e 30%, transparent)"
                    : "color-mix(in srgb, #f59e0b 35%, transparent)"
                }`,
              }}
            >
              {a.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DashboardPosicionamentoTodas({
  refDate,
  slugToNome,
  card,
}: {
  refDate: Date;
  slugToNome: (slug: string) => string;
  card: CSSProperties;
}) {
  const optsConsolidados = {
    historico: true as const,
    historicoDias: POS_COMPARACAO_DIFERENTE_DIAS,
  };
  const blaze = useLobbyPosicionamentoData("blaze", refDate, optsConsolidados);
  const cda = useLobbyPosicionamentoData("casa_apostas", refDate, optsConsolidados);
  const esportiva = useLobbyPosicionamentoData("esportiva_bet", refDate, optsConsolidados);
  const jonbet = useLobbyPosicionamentoData("jonbet", refDate, optsConsolidados);

  const loadingHistoricoAlertas =
    blaze.loadingHistorico ||
    cda.loadingHistorico ||
    esportiva.loadingHistorico ||
    jonbet.loadingHistorico;

  const alertasConsolidados = useMemo(() => {
    const prefix = (slug: string, lista: AlertaPos[]) =>
      lista.map((a) => ({
        ...a,
        texto: `${slugToNome(slug)} — ${a.texto}`,
      }));
    return [
      ...prefix("blaze", blaze.alertasAlteracoes7d),
      ...prefix("casa_apostas", cda.alertasAlteracoes7d),
      ...prefix("esportiva_bet", esportiva.alertasAlteracoes7d),
      ...prefix("jonbet", jonbet.alertasAlteracoes7d),
    ].sort((a, b) => (b.sortTs ?? 0) - (a.sortTs ?? 0));
  }, [
    blaze.alertasAlteracoes7d,
    cda.alertasAlteracoes7d,
    esportiva.alertasAlteracoes7d,
    jonbet.alertasAlteracoes7d,
    slugToNome,
  ]);

  return (
    <>
      <div className="app-grid-pos-operadoras" style={getPageKpiSectionGapStyle()}>
        <PosicaoAtualMesasBlock
          titulo={`Mesas ${slugToNome("blaze")}`}
          loading={blaze.loading}
          semDados={blaze.semDados}
          erro={blaze.erro}
          onRetry={() => void blaze.recarregar()}
          mesasOrdenadas={blaze.mesasOrdenadas}
          prevMap={blaze.prevMap}
          prevDiferenteMap={blaze.prevDiferenteMap}
          layout="consolidado"
          ultimaExecutadoEm={blaze.snapshotExec?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
        />
        <PosicaoAtualMesasBlock
          titulo={`Mesas ${slugToNome("casa_apostas")}`}
          loading={cda.loading}
          semDados={cda.semDados}
          erro={cda.erro}
          onRetry={() => void cda.recarregar()}
          mesasOrdenadas={cda.mesasOrdenadas}
          prevMap={cda.prevMap}
          prevDiferenteMap={cda.prevDiferenteMap}
          layout="consolidado"
          ultimaExecutadoEm={cda.snapshotExec?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
        />
        <PosicaoAtualMesasBlock
          titulo={`Mesas ${slugToNome("esportiva_bet")}`}
          loading={esportiva.loading}
          semDados={esportiva.semDados}
          erro={esportiva.erro}
          onRetry={() => void esportiva.recarregar()}
          mesasOrdenadas={esportiva.mesasOrdenadas}
          prevMap={esportiva.prevMap}
          prevDiferenteMap={esportiva.prevDiferenteMap}
          layout="consolidado"
          ultimaExecutadoEm={esportiva.snapshotExec?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
        />
        <PosicaoAtualMesasBlock
          titulo={`Mesas ${slugToNome("jonbet")}`}
          loading={jonbet.loading}
          semDados={jonbet.semDados}
          erro={jonbet.erro}
          onRetry={() => void jonbet.recarregar()}
          mesasOrdenadas={jonbet.mesasOrdenadas}
          prevMap={jonbet.prevMap}
          prevDiferenteMap={jonbet.prevDiferenteMap}
          layout="consolidado"
          ultimaExecutadoEm={jonbet.snapshotExec?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
        />
      </div>
      <AlertasPeriodoBlock
        alertas={alertasConsolidados}
        cardStyle={card}
        loadingHistorico={loadingHistoricoAlertas}
        sub="todas as alterações dos últimos 7 dias"
      />
    </>
  );
}

function DashboardPosicionamentoOperadora({
  operadoraSlug,
  refDate,
  card,
  catalogo,
}: {
  operadoraSlug: string;
  refDate: Date;
  card: CSSProperties;
  catalogo: OverviewSpinCatalogoCanais;
}) {
  const { theme: t } = useApp();
  const [historicoModo, setHistoricoModo] = useState<HeatmapHistoricoModo>("dia");
  const [canalFiltro, setCanalFiltro] = useState<CanalEstudioPosicionamento>("dedicado");
  const [sortCatVis, setSortCatVis] = useState<{ col: CatVisSortCol; dir: SortDir }>({
    col: "top10",
    dir: "desc",
  });
  const [sortHistMesa, setSortHistMesa] = useState<{ col: HistMesaSortCol; dir: SortDir }>({
    col: "mesa",
    dir: "asc",
  });

  const data = useLobbyPosicionamentoData(operadoraSlug, refDate);
  const {
    loading,
    loadingHistorico,
    erro,
    recarregar,
    semDados,
    execucoesAll,
    posByExec,
    execDia,
    snapshotExec,
    usaSnapshotFallback,
    mesasOrdenadas,
    prevMap,
    visAtual,
    visOntem,
    top10Atual,
    top10Ontem,
    melhor,
    queda,
    alertas,
    snapshotAtual,
  } = data;

  const mostrarToggleCanal = useMemo(
    () => operadoraTemCanaisDedicadoENetwork(catalogo, operadoraSlug),
    [catalogo, operadoraSlug],
  );

  useEffect(() => {
    setCanalFiltro("dedicado");
  }, [operadoraSlug]);

  const snapshotFiltrado = useMemo(() => {
    if (!mostrarToggleCanal) return snapshotAtual;
    return filtrarPosicoesPorCanal(snapshotAtual, canalFiltro);
  }, [snapshotAtual, mostrarToggleCanal, canalFiltro]);

  const posByExecFiltrado = useMemo(() => {
    if (!mostrarToggleCanal) return posByExec;
    const map = new Map<string, LobbyPosicaoRow[]>();
    for (const [execId, rows] of posByExec) {
      map.set(execId, filtrarPosicoesPorCanal(rows, canalFiltro));
    }
    return map;
  }, [posByExec, mostrarToggleCanal, canalFiltro]);

  const mesasOrdenadasFiltradas = useMemo(
    () =>
      [...snapshotFiltrado].sort((a, b) => {
        const pa = a.posicao ?? 999;
        const pb = b.posicao ?? 999;
        return pa - pb;
      }),
    [snapshotFiltrado],
  );

  const prevMapFiltrado = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const m of mesasOrdenadasFiltradas) {
      map.set(m.mesa_identificacao, prevMap.get(m.mesa_identificacao) ?? null);
    }
    return map;
  }, [mesasOrdenadasFiltradas, prevMap]);

  const concorrentesJogoFiltrados = useMemo(
    () => concorrentesPorJogoDetalhe(snapshotFiltrado),
    [snapshotFiltrado],
  );

  const rankingJogosFiltrados = useMemo(
    () => rankingConcorrentesFromPosicoes(snapshotFiltrado),
    [snapshotFiltrado],
  );

  const catsFiltradas = useMemo(
    () => visibilidadePorCategoriaDia(execDia, posByExecFiltrado),
    [execDia, posByExecFiltrado],
  );

  const heatCols = useMemo(
    () => colunasHistoricoPosicionamento(historicoModo, refDate),
    [historicoModo, refDate],
  );
  const heatColExecIds = useMemo(
    () =>
      new Map(
        heatCols.map((c) => [
          c.key,
          execIdsColunaHistorico(historicoModo, c.key, refDate, execucoesAll),
        ]),
      ),
    [heatCols, historicoModo, refDate, execucoesAll],
  );
  const heatMesas = useMemo(() => mesasOrdenadas.map((m) => m.mesa_identificacao), [mesasOrdenadas]);

  const nomeMesaHist = useCallback(
    (mid: string) => {
      const row = snapshotAtual.find((m) => m.mesa_identificacao === mid);
      return row ? labelMesaPosicionamentoRow(row) : mid;
    },
    [snapshotAtual],
  );

  const heatMesasOrdenadas = useMemo(() => {
    const arr = [...heatMesas];
    arr.sort((a, b) => compareLocaleTexto(nomeMesaHist(a), nomeMesaHist(b), sortHistMesa.dir));
    return arr;
  }, [heatMesas, nomeMesaHist, sortHistMesa.dir]);

  const onSortHistMesa = useCallback((col: HistMesaSortCol) => {
    setSortHistMesa((s) => ({
      col,
      dir: s.col === col && s.dir === "asc" ? "desc" : "asc",
    }));
  }, []);

  const onSortCatVis = useCallback((col: CatVisSortCol) => {
    setSortCatVis((s) => ({
      col,
      dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
    }));
  }, []);

  const catsOrdenadas = useMemo(() => {
    const arr = [...catsFiltradas];
    const { col, dir } = sortCatVis;
    arr.sort((a, b) => {
      switch (col) {
        case "categoria":
          return compareLocaleTexto(a.categoria, b.categoria, dir);
        case "top3":
          return compareNumber(a.pctTop3, b.pctTop3, dir);
        case "top10":
          return compareNumber(a.pctTop10, b.pctTop10, dir);
        default:
          return 0;
      }
    });
    return arr;
  }, [catsFiltradas, sortCatVis]);

  const dataTable = useDataTableBlock();

  const thHistMesa: CSSProperties = {
    ...dataTable.thHeaderSticky,
    minWidth: 140,
    maxWidth: 180,
  };

  const tdHistMesa = (i: number): CSSProperties => ({
    ...dataTable.tdSticky({ rowIndex: i, minWidth: 140 }),
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "left",
  });

  if (loading) {
    return (
      <div className="app-grid-kpi-4" style={getPageKpiSectionGapStyle()}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKpiCard key={i} />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div
        role="alert"
        aria-live="polite"
        style={{
          padding: "40px 0",
          textAlign: "center",
          color: "#e84025",
          fontSize: 13,
          fontFamily: FONT.body,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>{erro}</span>
        <button
          type="button"
          onClick={() => void recarregar()}
          style={{
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid rgba(232,64,37,0.35)",
            background: "transparent",
            color: "#e84025",
            cursor: "pointer",
          }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (semDados) {
    return (
      <div
        style={{
          padding: "40px 0",
          textAlign: "center",
          color: t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
        }}
      >
        Sem dados para o período selecionado.
      </div>
    );
  }

  const vsLabel = usaSnapshotFallback ? VS_ULTIMO_HORARIO : VS_ONTEM;

  const deltaVisPp = visAtual != null && visOntem != null ? visAtual - visOntem : null;
  const deltaTop10 = top10Atual.noTop10 - top10Ontem.noTop10;

  return (
    <>
      <div className="app-grid-kpi-4" style={getPageKpiSectionGapStyle()}>
        <KpiPosCard
          label="Visibilidade na vitrine"
          value={visAtual != null ? `${visAtual.toFixed(0)}%` : "—"}
          delta={
            deltaVisPp != null
              ? `${deltaVisPp >= 0 ? "+" : ""}${deltaVisPp.toFixed(0)}pp`
              : null
          }
          deltaLabel={vsLabel}
          positivo={deltaVisPp == null ? null : deltaVisPp >= 0}
          icon={<Eye size={16} aria-hidden="true" />}
        />
        <KpiPosCard
          label="Mesas no top 10"
          value={`${top10Atual.noTop10} / ${top10Atual.total || "—"}`}
          delta={deltaTop10 !== 0 ? `${deltaTop10 >= 0 ? "+" : ""}${deltaTop10}` : null}
          deltaLabel={vsLabel}
          positivo={deltaTop10 >= 0}
          icon={<Trophy size={16} aria-hidden="true" />}
        />
        <KpiPosCard
          label="Melhor posição"
          value={melhor ? fmtPosicao(melhor.posicao) : "—"}
          subValue={melhor?.categoria ?? null}
          icon={<MapPin size={16} aria-hidden="true" />}
        />
        <KpiPosCard
          label="Maior queda"
          value={queda ? `−${queda.delta}` : "—"}
          subValue={queda?.nome_mesa ?? null}
          icon={<TrendingDown size={16} aria-hidden="true" />}
          positivo={false}
        />
      </div>

      <div className="app-grid-2" style={getPageKpiSectionGapStyle()}>
        <PosicaoAtualMesasBlock
          titulo="Posição atual das mesas"
          loading={false}
          semDados={mesasOrdenadasFiltradas.length === 0}
          mesasOrdenadas={mesasOrdenadasFiltradas}
          prevMap={prevMapFiltrado}
          ultimaExecutadoEm={snapshotExec?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
          mostrarToggleCanal={mostrarToggleCanal}
          canalFiltro={canalFiltro}
          onCanalFiltro={setCanalFiltro}
        />

        <div style={{ ...card, marginBottom: 0 }}>
          <PosicionamentoSecaoHeader
            titulo="Concorrentes à frente"
            sub={fmtUltimaAtualizacao(snapshotExec?.executado_em)}
            mostrarToggleCanal={mostrarToggleCanal}
            canalFiltro={canalFiltro}
            onCanalFiltro={setCanalFiltro}
          />
          {concorrentesJogoFiltrados.length === 0 ? (
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {concorrentesJogoFiltrados.map((c) => (
                <li
                  key={c.jogo}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: `1px solid ${t.cardBorder}`,
                    fontFamily: FONT.body,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: t.text, fontWeight: 600 }}>{c.jogo}</span>
                  <ConcorrentesCountHover qtd={c.qtd} jogos={c.jogos} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <SectionTitle>Histórico de posicionamento</SectionTitle>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {loadingHistorico && historicoModo !== "dia" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  color: t.textMuted,
                  fontSize: 12,
                  fontFamily: FONT.body,
                }}
              >
                <Clock size={12} aria-hidden />
                Carregando…
              </span>
            )}
            {HISTORICO_MODOS.map((m) => {
              const ativo = historicoModo === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setHistoricoModo(m.id)}
                  style={{
                    padding: "6px 14px",
                    minHeight: 36,
                    borderRadius: 999,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 12,
                    fontWeight: ativo ? 700 : 500,
                    border: `1px solid ${ativo ? "var(--brand-action, #7c3aed)" : t.cardBorder}`,
                    background: ativo
                      ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)"
                      : "transparent",
                    color: ativo ? "var(--brand-action, #7c3aed)" : t.textMuted,
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ fontFamily: FONT.body, fontSize: 12 })}>
            <caption style={{ display: "none" }}>Histórico de posicionamento das mesas</caption>
            <thead>
              <tr>
                <SortTableTh<HistMesaSortCol>
                  label="Mesa"
                  col="mesa"
                  sortCol={sortHistMesa.col}
                  sortDir={sortHistMesa.dir}
                  thStyle={thHistMesa}
                  align="center"
                  onSort={onSortHistMesa}
                />
                {heatCols.map((c) => (
                  <th key={c.key} scope="col" style={dataTable.thHeader}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatMesasOrdenadas.map((mid, rowIdx) => {
                const nome = nomeMesaHist(mid);
                return (
                  <tr key={mid} style={{ background: dataTable.zebraRow(rowIdx) }} {...dataTableRowHoverHandlers(dataTable.zebraRow(rowIdx))}>
                    <td style={tdHistMesa(rowIdx)} title={nome}>
                      {nome}
                    </td>
                    {heatCols.map((col) => {
                      const execIds = heatColExecIds.get(col.key) ?? [];
                      const pos = posicaoMediaMesaNoBucket(mid, execIds, posByExec);
                      return (
                        <td key={col.key} style={dataTable.tdCenter}>
                          <span
                            style={{
                              display: "inline-block",
                              minWidth: 36,
                              padding: "4px 6px",
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: 11,
                              background: posicaoBgColor(pos != null ? Math.round(pos) : null),
                              color: posicaoTextColor(pos != null ? Math.round(pos) : null),
                            }}
                          >
                            {pos != null ? fmtPosicao(Math.round(pos)) : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="app-grid-2" style={getPageKpiSectionGapStyle()}>
        <div style={{ ...card, marginBottom: 0 }}>
          <PosicionamentoSecaoHeader
            titulo="Ranking de concorrentes"
            sub={fmtUltimaAtualizacao(snapshotExec?.executado_em)}
            mostrarToggleCanal={mostrarToggleCanal}
            canalFiltro={canalFiltro}
            onCanalFiltro={setCanalFiltro}
          />
          {rankingJogosFiltrados.length === 0 ? (
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rankingJogosFiltrados.map((j) => (
                <li
                  key={j.game_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: `1px solid ${t.cardBorder}`,
                    fontFamily: FONT.body,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      minWidth: 40,
                      padding: "4px 8px",
                      borderRadius: 8,
                      textAlign: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      background: posicaoBgColor(j.posicao),
                      color: posicaoTextColor(j.posicao),
                    }}
                  >
                    {fmtPosicao(j.posicao)}
                  </span>
                  <span
                    style={{ flex: 1, color: t.text, overflow: "hidden", textOverflow: "ellipsis" }}
                    title={j.name}
                  >
                    {j.name}
                  </span>
                  <span
                    style={{
                      color: t.textMuted,
                      fontSize: 12,
                      maxWidth: 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={j.provider_name}
                  >
                    {j.provider_name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ ...card, marginBottom: 0 }}>
          <PosicionamentoSecaoHeader
            titulo="Visibilidade por categoria"
            mostrarToggleCanal={mostrarToggleCanal}
            canalFiltro={canalFiltro}
            onCanalFiltro={setCanalFiltro}
          />
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ fontFamily: FONT.body, fontSize: 12 })}>
              <caption style={{ display: "none" }}>Visibilidade por categoria no dia</caption>
              <thead>
                <tr>
                  <SortTableTh<CatVisSortCol>
                    label="Jogo"
                    col="categoria"
                    sortCol={sortCatVis.col}
                    sortDir={sortCatVis.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={onSortCatVis}
                  />
                  <SortTableTh<CatVisSortCol>
                    label="Top 3"
                    col="top3"
                    sortCol={sortCatVis.col}
                    sortDir={sortCatVis.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={onSortCatVis}
                  />
                  <SortTableTh<CatVisSortCol>
                    label="Top 10"
                    col="top10"
                    sortCol={sortCatVis.col}
                    sortDir={sortCatVis.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={onSortCatVis}
                  />
                </tr>
              </thead>
              <tbody>
                {catsOrdenadas.map((c, i) => (
                  <tr key={c.categoria} style={{ background: dataTable.zebraRow(i) }} {...dataTableRowHoverHandlers(dataTable.zebraRow(i))}>
                    <td style={dataTable.tdCenter}>{c.categoria}</td>
                    <td style={dataTable.tdCenter}>{c.pctTop3.toFixed(0)}%</td>
                    <td style={dataTable.tdCenter}>{c.pctTop10.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AlertasPeriodoBlock alertas={alertas} cardStyle={card} />
    </>
  );
}

export default function DashboardPosicionamento({ operadoraSlug, refDate, slugToNome, catalogo }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const card: CSSProperties = getPageContentBoxStyle(brand, t);

  const resolveNome = slugToNome ?? ((slug: string) => slug);
  const catalogoResolvido = catalogo ?? { slugsComMesaDedicada: [], slugsComMesaNetwork: [] };

  if (operadoraSlug === "todas") {
    return (
      <DashboardPosicionamentoTodas refDate={refDate} slugToNome={resolveNome} card={card} />
    );
  }

  return (
    <DashboardPosicionamentoOperadora
      operadoraSlug={operadoraSlug}
      refDate={refDate}
      card={card}
      catalogo={catalogoResolvido}
    />
  );
}
