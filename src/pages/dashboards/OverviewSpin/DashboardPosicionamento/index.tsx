import { useCallback, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Eye,
  Loader2,
  MapPin,
  Minus,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { createDataTableBlockStyles, getDataTableStyle, getDataTableWrapStyle } from "../../../../lib/dataTableStyles";
import SectionTitle from "../../../../components/dashboard/SectionTitle";
import { SkeletonKpiCard, SortTableTh, type SortDir } from "../../../../components/dashboard";
import { compareLocaleTexto, compareNumber } from "../../../../lib/classificacaoSort";
import {
  type HeatmapHistoricoModo,
  type LobbyPosicaoRow,
  type AlertaPos,
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
} from "../../../../lib/lobbyMonitorHelpers";
import { useLobbyPosicionamentoData } from "./useLobbyPosicionamentoData";
import {
  getPageContentBoxShellStyle,
  getPageContentBoxStyle,
  getPageKpiSectionGapStyle,
} from "../../../../lib/pageContentBoxStyles";

interface Props {
  operadoraSlug: string;
  refDate: Date;
  slugToNome?: (slug: string) => string;
}

const VS_ONTEM = "vs ontem (mesmo horário)";

const HISTORICO_MODOS: { id: HeatmapHistoricoModo; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
];

type CatVisSortCol = "categoria" | "top3" | "top10";
type HistMesaSortCol = "mesa";

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

function PosicaoAtualMesasBlock({
  titulo,
  loading,
  semDados,
  mesasOrdenadas,
  prevMap,
  ultimaExecutadoEm,
  cardStyle,
}: {
  titulo: string;
  loading: boolean;
  semDados: boolean;
  mesasOrdenadas: LobbyPosicaoRow[];
  prevMap: Map<string, number | null>;
  ultimaExecutadoEm: string | undefined;
  cardStyle: CSSProperties;
}) {
  const { theme: t } = useApp();

  if (loading) {
    return (
      <div style={cardStyle}>
        <SectionTitle>{titulo}</SectionTitle>
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
          <span>Carregando posicionamento…</span>
        </div>
      </div>
    );
  }

  if (semDados) {
    return (
      <div style={cardStyle}>
        <SectionTitle>{titulo}</SectionTitle>
        <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body, margin: "12px 0 0" }}>
          Sem dados para o período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <SectionTitle sub={fmtUltimaAtualizacao(ultimaExecutadoEm)}>{titulo}</SectionTitle>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {mesasOrdenadas.map((m) => {
          const pa = prevMap.get(m.mesa_identificacao) ?? null;
          const d = deltaPosicao(m.posicao, pa);
          const label = labelMesaPosicionamentoRow(m);
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
              <span
                style={{
                  minWidth: 40,
                  padding: "4px 8px",
                  borderRadius: 8,
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 12,
                  background: posicaoBgColor(m.posicao),
                  color: posicaoTextColor(m.posicao),
                }}
              >
                {fmtPosicao(m.posicao)}
              </span>
              <span
                style={{ flex: 1, color: t.text, overflow: "hidden", textOverflow: "ellipsis" }}
                title={label}
              >
                {label}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 28, justifyContent: "flex-end" }}>
                {d == null || d === 0 ? (
                  <Minus size={14} color={SEMANTIC.cinza} aria-label="Sem variação de posição" />
                ) : d < 0 ? (
                  <ArrowUp size={14} color={SEMANTIC.verde} aria-label={`${label} melhorou posição`} />
                ) : (
                  <ArrowDown size={14} color={SEMANTIC.vermelho} aria-label={`${label} piorou posição`} />
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
}: {
  alertas: AlertaPos[];
  cardStyle: CSSProperties;
}) {
  const { theme: t } = useApp();

  return (
    <div style={cardStyle}>
      <SectionTitle>Alertas do período</SectionTitle>
      {alertas.length === 0 ? (
        <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body, margin: 0 }}>
          Nenhum alerta automático para o período.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {alertas.map((a, i) => (
            <li
              key={i}
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
                border: `1px solid ${a.tipo === "positivo" ? "color-mix(in srgb, #22c55e 30%, transparent)" : "color-mix(in srgb, #f59e0b 35%, transparent)"}`,
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
  const blaze = useLobbyPosicionamentoData("blaze", refDate, { historico: false });
  const cda = useLobbyPosicionamentoData("casa_apostas", refDate, { historico: false });
  const esportiva = useLobbyPosicionamentoData("esportiva_bet", refDate, { historico: false });
  const jonbet = useLobbyPosicionamentoData("jonbet", refDate, { historico: false });

  const alertasConsolidados = useMemo(() => {
    const prefix = (slug: string, lista: AlertaPos[]) =>
      lista.map((a) => ({
        ...a,
        texto: `${slugToNome(slug)} — ${a.texto}`,
      }));
    return [
      ...prefix("blaze", blaze.alertas),
      ...prefix("casa_apostas", cda.alertas),
      ...prefix("esportiva_bet", esportiva.alertas),
      ...prefix("jonbet", jonbet.alertas),
    ];
  }, [blaze.alertas, cda.alertas, esportiva.alertas, jonbet.alertas, slugToNome]);

  return (
    <>
      <div className="app-grid-2" style={getPageKpiSectionGapStyle()}>
        <PosicaoAtualMesasBlock
          titulo={`Posição atual das Mesas ${slugToNome("blaze")}`}
          loading={blaze.loading}
          semDados={blaze.semDados}
          mesasOrdenadas={blaze.mesasOrdenadas}
          prevMap={blaze.prevMap}
          ultimaExecutadoEm={blaze.ultimaNoDia?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
        />
        <PosicaoAtualMesasBlock
          titulo={`Posição atual das Mesas ${slugToNome("casa_apostas")}`}
          loading={cda.loading}
          semDados={cda.semDados}
          mesasOrdenadas={cda.mesasOrdenadas}
          prevMap={cda.prevMap}
          ultimaExecutadoEm={cda.ultimaNoDia?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
        />
        <PosicaoAtualMesasBlock
          titulo={`Posição atual das Mesas ${slugToNome("esportiva_bet")}`}
          loading={esportiva.loading}
          semDados={esportiva.semDados}
          mesasOrdenadas={esportiva.mesasOrdenadas}
          prevMap={esportiva.prevMap}
          ultimaExecutadoEm={esportiva.ultimaNoDia?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
        />
        <PosicaoAtualMesasBlock
          titulo={`Posição atual das Mesas ${slugToNome("jonbet")}`}
          loading={jonbet.loading}
          semDados={jonbet.semDados}
          mesasOrdenadas={jonbet.mesasOrdenadas}
          prevMap={jonbet.prevMap}
          ultimaExecutadoEm={jonbet.ultimaNoDia?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
        />
      </div>
      <AlertasPeriodoBlock alertas={alertasConsolidados} cardStyle={card} />
    </>
  );
}

function DashboardPosicionamentoOperadora({
  operadoraSlug,
  refDate,
  card,
}: {
  operadoraSlug: string;
  refDate: Date;
  card: CSSProperties;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [historicoModo, setHistoricoModo] = useState<HeatmapHistoricoModo>("dia");
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
    semDados,
    execucoesAll,
    posByExec,
    ultimaNoDia,
    mesasOrdenadas,
    prevMap,
    visAtual,
    visOntem,
    top10Atual,
    top10Ontem,
    melhor,
    queda,
    concorrentesJogo,
    rankingJogos,
    cats,
    alertas,
    snapshotAtual,
  } = data;

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
    const arr = [...cats];
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
  }, [cats, sortCatVis]);

  const dataTable = useMemo(() => createDataTableBlockStyles(t, brand), [t, brand]);

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
          deltaLabel={VS_ONTEM}
          positivo={deltaVisPp == null ? null : deltaVisPp >= 0}
          icon={<Eye size={16} aria-hidden="true" />}
        />
        <KpiPosCard
          label="Mesas no top 10"
          value={`${top10Atual.noTop10} / ${top10Atual.total || "—"}`}
          delta={deltaTop10 !== 0 ? `${deltaTop10 >= 0 ? "+" : ""}${deltaTop10}` : null}
          deltaLabel={VS_ONTEM}
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
          semDados={false}
          mesasOrdenadas={mesasOrdenadas}
          prevMap={prevMap}
          ultimaExecutadoEm={ultimaNoDia?.executado_em}
          cardStyle={{ ...card, marginBottom: 0 }}
        />

        <div style={{ ...card, marginBottom: 0 }}>
          <SectionTitle sub={fmtUltimaAtualizacao(ultimaNoDia?.executado_em)}>
            Concorrentes à frente
          </SectionTitle>
          {concorrentesJogo.length === 0 ? (
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {concorrentesJogo.map((c) => (
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
                  <tr key={mid} style={{ background: dataTable.zebraRow(rowIdx) }}>
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
          <SectionTitle sub={fmtUltimaAtualizacao(ultimaNoDia?.executado_em)}>
            Ranking de concorrentes
          </SectionTitle>
          {rankingJogos.length === 0 ? (
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rankingJogos.map((j) => (
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
          <SectionTitle>Visibilidade por categoria</SectionTitle>
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
                  <tr key={c.categoria} style={{ background: dataTable.zebraRow(i) }}>
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

export default function DashboardPosicionamento({ operadoraSlug, refDate, slugToNome }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const card: CSSProperties = getPageContentBoxStyle(brand, t);

  const resolveNome = slugToNome ?? ((slug: string) => slug);

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
    />
  );
}
