import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Clock,
  Coins,
  ListOrdered,
  Medal,
  MinusCircle,
  TrendingUp,
  Trophy,
  UserCheck,
  UserX,
} from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useDashboardCatalogos } from "../../../../hooks/useDashboardCatalogos";
import { useDashboardFiltros } from "../../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../../hooks/usePermission";
import { FONT } from "../../../../constants/theme";
import { BRAND, FUNIL_COLORS, MSG_SEM_DADOS_PERIODO } from "../../../../lib/dashboardConstants";
import { fmtBRL, getPeriodoComparativoMoM, getPeriodoHistoricoCompetencias } from "../../../../lib/dashboardHelpers";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import {
  KpiCard,
  SectionTitle,
  SkeletonKpiCard,
  SortTableTh,
  type SortDir,
} from "../../../../components/dashboard";
import { SelectListaComBusca } from "../../../../components/SelectListaComBusca";
import { placeholderPesquisaFiltro } from "../../../../lib/searchBarConstants";
import { TabelaComPaginacao } from "../../../../components/TabelaPaginacaoBar";
import { useDataTableBlock } from "../../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../../lib/dataTableStyles";
import { compareLocaleTexto, compareNumber } from "../../../../lib/classificacaoSort";
import { useStreamersFiltros } from "../StreamersFiltrosContext";
import { MSG_ERRO_STREAMERS, periodoStreamersFiltro, streamersInfluencerIdsQuery, streamersOperadoraSlugsQuery, travarRecortePropriosStreamers } from "../streamersInfluencerFilterHelpers";
import { fetchJogadoresAbaDaily } from "../../../../lib/jogadoresAbaQuery";
import {
  filtrarRowsJogaramSpin,
  fmtPctJogadores,
  JOGADORES_TAXA_BAIXA_PCT,
  kpisJogadoresAba,
  kpisVaziosJogadoresAba,
  mesasJogadoresAba,
  pctJogadores,
  rankingJogadoresAba,
  recortarJogadoresAbaDaily,
  type JogadorAbaInfluencerRow,
  type JogadorAbaKpis,
  type JogadorAbaMesaBar,
} from "../../../../lib/jogadoresAbaMetrics";

const COR_A = {
  accent: "var(--brand-action, #7c3aed)",
  bg: "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)",
  border: "color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)",
  taxa: "color-mix(in srgb, var(--brand-action, #7c3aed) 13%, transparent)",
  taxaBorder: "color-mix(in srgb, var(--brand-action, #7c3aed) 40%, transparent)",
} as const;
const COR_B = {
  accent: "var(--brand-contrast, #1e36f8)",
  bg: "color-mix(in srgb, var(--brand-contrast, #1e36f8) 10%, transparent)",
  border: "color-mix(in srgb, var(--brand-contrast, #1e36f8) 35%, transparent)",
  taxa: "color-mix(in srgb, var(--brand-contrast, #1e36f8) 13%, transparent)",
  taxaBorder: "color-mix(in srgb, var(--brand-contrast, #1e36f8) 40%, transparent)",
} as const;

const PODIO_CORES = [
  { bg: "rgba(245,158,11,0.13)", border: "rgba(245,158,11,0.38)", text: "#f59e0b" },
  { bg: "rgba(112,202,228,0.13)", border: "rgba(112,202,228,0.35)", text: "#70cae4" },
  { bg: "rgba(74,32,130,0.18)", border: "rgba(74,32,130,0.40)", text: "#a78bfa" },
];
const PODIO_H = [130, 90, 70];
const PODIO_ICONS = [
  <Trophy key="1" size={28} aria-hidden />,
  <Medal key="2" size={24} aria-hidden />,
  <Award key="3" size={22} aria-hidden />,
];

const FUNIL_STEPS = [
  { key: "registros", label: "Registros" },
  { key: "jogaram", label: "Jogaram" },
  { key: "spin", label: "Jogaram Spin" },
] as const;

type TaxasSortCol =
  | "nome"
  | "registros"
  | "pctRegJog"
  | "jogaram"
  | "pctJogSpin"
  | "jogaramSpin"
  | "turnoverSpin"
  | "ggrSpin"
  | "rodadas";

function cmpNullable(a: number | null, b: number | null, mul: number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return mul * (a - b);
}

function fmtMedia(v: number | null): string {
  if (v == null) return "—";
  return Math.round(v).toLocaleString("pt-BR");
}

function FunilJogadoresSvg({
  row,
  cor,
  idPrefix,
}: {
  row: JogadorAbaInfluencerRow;
  cor: typeof COR_A | typeof COR_B;
  idPrefix: string;
}) {
  const { theme: t } = useApp();
  const W = 220;
  const H = 210;
  const levels = 3;
  const stepH = H / levels;
  const widths = [1, 0.72, 0.45].map((f) => f * W);
  const values = [row.registros, row.jogaram, row.jogaramSpin];
  const taxas = [
    undefined,
    fmtPctJogadores(row.pctRegJog),
    fmtPctJogadores(pctJogadores(row.jogaramSpin, row.jogaram)),
  ];
  const aria = `Funil de ${row.nome}: ${values[0].toLocaleString("pt-BR")} registros, ${values[1].toLocaleString("pt-BR")} jogaram e ${values[2].toLocaleString("pt-BR")} jogaram Spin`;

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <svg role="img" aria-label={aria} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, flexShrink: 0, display: "block" }}>
        <defs>
          {FUNIL_STEPS.map((_, i) => (
            <linearGradient key={i} id={`fj-${idPrefix}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={FUNIL_COLORS[i]} stopOpacity="0.88" />
              <stop offset="100%" stopColor={FUNIL_COLORS[i]} stopOpacity="0.58" />
            </linearGradient>
          ))}
        </defs>
        {FUNIL_STEPS.map((step, i) => {
          const wTop = widths[i];
          const wBot = widths[i + 1] ?? widths[i] * 0.72;
          const xTop = (W - wTop) / 2;
          const xBot = (W - wBot) / 2;
          const yTop = i * stepH;
          const yBot = yTop + stepH - 2;
          const path = `M ${xTop} ${yTop} L ${xTop + wTop} ${yTop} L ${xBot + wBot} ${yBot} L ${xBot} ${yBot} Z`;
          return (
            <g key={step.key}>
              <path d={path} fill={`url(#fj-${idPrefix}-${i})`} />
              <text x={W / 2} y={yTop + stepH / 2 - 6} textAnchor="middle" fill="#fff" fontSize={9} fontFamily={FONT.body} fontWeight={600} letterSpacing="0.08em">
                {step.label.toUpperCase()}
              </text>
              <text x={W / 2} y={yTop + stepH / 2 + 10} textAnchor="middle" fill="#fff" fontSize={15} fontFamily={FONT.body} fontWeight={800}>
                {values[i].toLocaleString("pt-BR")}
              </text>
              {taxas[i] && taxas[i] !== "—" ? (
                <text x={W / 2} y={yTop + stepH / 2 + 22} textAnchor="middle" fill="rgba(255,255,255,0.72)" fontSize={8} fontFamily={FONT.body}>
                  ↓ {taxas[i]}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4, flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 9, color: t.textMuted, fontFamily: FONT.body, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2, fontWeight: 600 }}>
          Taxas de Conversão
        </div>
        {[
          { label: "Registros → Jogaram", val: fmtPctJogadores(row.pctRegJog), hl: true },
          { label: "Jogaram → Spin", val: fmtPctJogadores(pctJogadores(row.jogaramSpin, row.jogaram)), hl: true },
          { label: "Jogaram Outros", val: row.jogaramOutros.toLocaleString("pt-BR"), hl: false },
          { label: "Não Jogaram", val: row.naoJogaram.toLocaleString("pt-BR"), hl: false },
        ].map((r) => (
          <div
            key={r.label}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${r.hl ? cor.taxaBorder : t.cardBorder}`,
              background: r.hl ? cor.taxa : "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontSize: 9, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
              {r.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT.body, color: r.hl ? cor.accent : t.text }}>
              {r.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PainelFunilJogadores({
  row,
  isEmpty,
  cor,
}: {
  row: JogadorAbaInfluencerRow | null;
  isEmpty: boolean;
  cor: typeof COR_A | typeof COR_B;
}) {
  const { theme: t } = useApp();
  if (isEmpty || !row) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          border: `1px dashed ${t.cardBorder}`,
          minHeight: 230,
          color: t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
        }}
      >
        Selecione um influencer
      </div>
    );
  }
  return (
    <div style={{ flex: 1 }}>
      <FunilJogadoresSvg row={row} cor={cor} idPrefix={row.influencer_id} />
    </div>
  );
}

function PodioRodadas({ ranking }: { ranking: JogadorAbaInfluencerRow[] }) {
  const { theme: t } = useApp();
  const rankingLimitado = ranking.filter((r) => r.rodadas > 0).slice(0, 10);
  if (!rankingLimitado.length) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        {MSG_SEM_DADOS_PERIODO}
      </div>
    );
  }
  const top3 = rankingLimitado.slice(0, 3);
  const resto = rankingLimitado.slice(3);
  const maxRod = rankingLimitado[0]?.rodadas ?? 0;
  const ariaPodio =
    top3.length >= 1
      ? `Pódio de rodadas Spin: 1º ${top3[0]?.nome ?? "—"} (${top3[0]?.rodadas.toLocaleString("pt-BR")})` +
        (top3[1] ? `, 2º ${top3[1].nome} (${top3[1].rodadas.toLocaleString("pt-BR")})` : "") +
        (top3[2] ? `, 3º ${top3[2].nome} (${top3[2].rodadas.toLocaleString("pt-BR")})` : "")
      : "Pódio de rodadas Spin";
  const podioOrdem = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : top3;
  const podioIdx = top3.length >= 2 ? [1, 0, 2].slice(0, podioOrdem.length) : [0];

  return (
    <div>
      <div role="img" aria-label={ariaPodio} style={{ overflowX: "auto", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, minWidth: 320 }}>
          {podioOrdem.map((row, i) => {
            const rankIdx = podioIdx[i] ?? i;
            const cor = PODIO_CORES[rankIdx];
            return (
              <div key={row.influencer_id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 110, flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.text, fontFamily: FONT.body, marginBottom: 4, textAlign: "center" }}>
                  {row.nome.split(" ")[0]}
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: cor.text, fontFamily: FONT.body, marginBottom: 8 }}>
                  {row.rodadas.toLocaleString("pt-BR")}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: PODIO_H[rankIdx],
                    background: cor.bg,
                    border: `1px solid ${cor.border}`,
                    borderRadius: "12px 12px 0 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: 12,
                    color: cor.text,
                  }}
                >
                  {PODIO_ICONS[rankIdx]}
                  <span style={{ fontSize: 11, fontWeight: 700, marginTop: 6, fontFamily: FONT.body }}>#{rankIdx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {resto.length > 0 ? (
        <TabelaComPaginacao items={resto} t={t} resetKey={resto.length}>
          {(linhas) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {linhas.map((row) => {
                const pos = ranking.findIndex((x) => x.influencer_id === row.influencer_id) + 1;
                const barPct = maxRod > 0 ? (row.rodadas / maxRod) * 100 : 0;
                return (
                  <div
                    key={row.influencer_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 10px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div style={{ width: 22, fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textAlign: "right", flexShrink: 0 }}>
                      #{pos}
                    </div>
                    <div
                      style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: FONT.body, width: 72, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={row.nome}
                    >
                      {row.nome.split(" ")[0]}
                    </div>
                    <div style={{ flex: 1, height: 5, background: t.cardBorder, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${barPct}%`, height: "100%", background: "var(--brand-action, #7c3aed)", opacity: 0.65, borderRadius: 999 }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", fontFamily: FONT.body, flexShrink: 0, width: 52, textAlign: "right" }}>
                      {row.rodadas.toLocaleString("pt-BR")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabelaComPaginacao>
      ) : null}
    </div>
  );
}

export default function DashboardJogadores() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("streamers");
  const sf = useStreamersFiltros();
  const { podeVerInfluencer, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const { perfis, isPending: catalogosPending, error: catalogosError } = useDashboardCatalogos();
  const dataTable = useDataTableBlock();

  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [momPronto, setMomPronto] = useState(false);
  const [kpis, setKpis] = useState<JogadorAbaKpis>(kpisVaziosJogadoresAba);
  const [kpisAnt, setKpisAnt] = useState<JogadorAbaKpis>(kpisVaziosJogadoresAba);
  const [ranking, setRanking] = useState<JogadorAbaInfluencerRow[]>([]);
  const [mesas, setMesas] = useState<JogadorAbaMesaBar[]>([]);
  const [compA, setCompA] = useState("");
  const [compB, setCompB] = useState("");
  const [sortTaxas, setSortTaxas] = useState<{ col: TaxasSortCol; dir: SortDir }>({ col: "rodadas", dir: "desc" });
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  useEffect(() => {
    sf.setIsLoading(loading);
  }, [sf, loading]);

  useEffect(() => {
    if (catalogosPending) return;
    if (catalogosError) {
      console.error("[StreamersJogadores] catálogos:", catalogosError);
      setErroCarga(MSG_ERRO_STREAMERS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function carregar() {
      setLoading(true);
      setErroCarga(null);
      setMomPronto(false);
      setKpisAnt(kpisVaziosJogadoresAba());

      const periodo = periodoStreamersFiltro(sf.historico, sf.mesSelecionado);
      if (!periodo) {
        setLoading(false);
        return;
      }
      let inicio = periodo.inicio;
      let fim = periodo.fim;
      let mom: ReturnType<typeof getPeriodoComparativoMoM> | null = null;
      if (!sf.historico && sf.mesSelecionado) {
        mom = getPeriodoComparativoMoM(sf.mesSelecionado.ano, sf.mesSelecionado.mes);
        inicio = mom.atual.inicio;
        fim = mom.atual.fim;
      } else if (sf.historico) {
        const h = getPeriodoHistoricoCompetencias();
        inicio = h.inicio;
        fim = h.fim;
      }

      let influencerIdsQuery = streamersInfluencerIdsQuery(sf.filtroInfluencer, escoposVisiveis);
      let operadoraSlugsQuery = streamersOperadoraSlugsQuery(sf.filtroOperadora, escoposVisiveis, operadoraSlugsForcado);
      if (perm.canView === "proprios") {
        const travado = travarRecortePropriosStreamers(
          { influencerIds: influencerIdsQuery, operadoraSlugs: operadoraSlugsQuery },
          escoposVisiveis,
        );
        influencerIdsQuery = travado.influencerIds;
        operadoraSlugsQuery = travado.operadoraSlugs;
      }
      const incluirSemInfluencer = false;

      const nomes = new Map(
        perfis
          .filter((p) => podeVerInfluencer(p.id))
          .map((p) => [p.id, (p.nome_artistico ?? "").trim() || "—"] as const),
      );

      function aplicarRecorte(daily: Awaited<ReturnType<typeof fetchJogadoresAbaDaily>>) {
        return recortarJogadoresAbaDaily(daily, {
          influencerIds: influencerIdsQuery,
          operadoraSlugs: operadoraSlugsQuery,
          incluirSemInfluencer,
        });
      }

      try {
        const daily = aplicarRecorte(
          await fetchJogadoresAbaDaily({
            inicio,
            fim,
            operadoraSlugs: operadoraSlugsQuery,
            influencerIds: influencerIdsQuery,
          }),
        );
        if (cancelled) return;
        const rank = rankingJogadoresAba(daily, nomes);
        setKpis(kpisJogadoresAba(daily));
        setRanking(rank);
        setMesas(mesasJogadoresAba(filtrarRowsJogaramSpin(daily)));
        setCompA((prevA) => {
          const nextA = rank.some((r) => r.influencer_id === prevA) ? prevA : (rank[0]?.influencer_id ?? "");
          setCompB((prevB) => {
            if (prevB && prevB !== nextA && rank.some((r) => r.influencer_id === prevB)) return prevB;
            return rank.find((r) => r.influencer_id !== nextA)?.influencer_id ?? "";
          });
          return nextA;
        });
        setLoading(false);

        if (mom) {
          try {
            const dailyAnt = aplicarRecorte(
              await fetchJogadoresAbaDaily({
                inicio: mom.anterior.inicio,
                fim: mom.anterior.fim,
                operadoraSlugs: operadoraSlugsQuery,
                influencerIds: influencerIdsQuery,
              }),
            );
            if (cancelled) return;
            setKpisAnt(kpisJogadoresAba(dailyAnt));
          } catch (err) {
            console.error("[StreamersJogadores] MoM:", err);
          } finally {
            if (!cancelled) setMomPronto(true);
          }
        } else if (!cancelled) {
          setMomPronto(true);
        }
      } catch (err) {
        console.error("[StreamersJogadores]", err);
        if (!cancelled) {
          setErroCarga(MSG_ERRO_STREAMERS);
          setLoading(false);
          setMomPronto(true);
        }
      }
    }
    void carregar();
    return () => {
      cancelled = true;
    };
  }, [
    catalogosPending,
    catalogosError,
    sf.historico,
    sf.mesSelecionado,
    sf.filtroInfluencer,
    sf.filtroOperadora,
    operadoraSlugsForcado,
    escoposVisiveis,
    perm.canView,
    podeVerInfluencer,
    perfis,
    reloadTick,
  ]);

  const rowA = ranking.find((r) => r.influencer_id === compA) ?? null;
  const rowB = ranking.find((r) => r.influencer_id === compB) ?? null;
  const maxMesa = mesas[0]?.rodadas ?? 0;
  const taxasOrdenadas = useMemo(() => {
    const mul = sortTaxas.dir === "asc" ? 1 : -1;
    const rows = sf.historico ? ranking : ranking.filter((r) => r.registros > 0);
    return [...rows].sort((a, b) => {
      switch (sortTaxas.col) {
        case "nome":
          return compareLocaleTexto(a.nome, b.nome, sortTaxas.dir);
        case "pctRegJog":
          return cmpNullable(a.pctRegJog, b.pctRegJog, mul);
        case "pctJogSpin":
          return cmpNullable(a.pctJogSpin, b.pctJogSpin, mul);
        case "jogaram":
          return compareNumber(a.jogaram, b.jogaram, sortTaxas.dir);
        case "ggrSpin":
          return compareNumber(a.ggrSpin, b.ggrSpin, sortTaxas.dir);
        case "turnoverSpin":
          return compareNumber(a.turnoverSpin, b.turnoverSpin, sortTaxas.dir);
        case "rodadas":
          return compareNumber(a.rodadas, b.rodadas, sortTaxas.dir);
        case "registros":
          return compareNumber(a.registros, b.registros, sortTaxas.dir);
        case "jogaramSpin":
          return compareNumber(a.jogaramSpin, b.jogaramSpin, sortTaxas.dir);
        default:
          return 0;
      }
    });
  }, [ranking, sf.historico, sortTaxas]);

  const card = getPageContentBoxStyle(brand, t);
  const isHistoricoKpi = sf.historico || !momPronto;
  const rowHoverBg = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  function onSortTaxas(col: TaxasSortCol) {
    setSortTaxas((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      {erroCarga ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, marginBottom: 14 }}>
          {erroCarga}{" "}
          <button
            type="button"
            onClick={() => setReloadTick((n) => n + 1)}
            style={{
              marginLeft: 8,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      <div style={card}>
        <SectionTitle sub={sf.historico ? "acumulado" : "dados do mês · vs mesmo período do mês anterior"}>
          Ativação em mesa Spin
        </SectionTitle>
        {loading ? (
          <>
            <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonKpiCard key={i} />
              ))}
            </div>
            <div className="app-grid-kpi-4" style={{ gap: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonKpiCard key={`r2-${i}`} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
              <KpiCard
                label="Não Jogaram"
                value={kpis.naoJogaram.toLocaleString("pt-BR")}
                icon={<UserX size={16} aria-hidden />}
                accentVar="--brand-action"
                accentColor={BRAND.transacao}
                atual={kpis.naoJogaram}
                anterior={kpisAnt.naoJogaram}
                isInverso
                isHistorico={isHistoricoKpi}
              />
              <KpiCard
                label="Jogaram Spin"
                value={kpis.jogaramSpin.toLocaleString("pt-BR")}
                icon={<UserCheck size={16} aria-hidden />}
                accentColor={BRAND.verde}
                atual={kpis.jogaramSpin}
                anterior={kpisAnt.jogaramSpin}
                isHistorico={isHistoricoKpi}
              />
              <KpiCard
                label="Jogaram Outros"
                value={kpis.jogaramOutros.toLocaleString("pt-BR")}
                icon={<MinusCircle size={16} aria-hidden />}
                accentColor={BRAND.amarelo}
                atual={kpis.jogaramOutros}
                anterior={kpisAnt.jogaramOutros}
                isInverso
                isHistorico={isHistoricoKpi}
              />
              <KpiCard
                label="Taxa de ativação"
                value={fmtPctJogadores(kpis.taxaAtivacao)}
                icon={<BarChart3 size={16} aria-hidden />}
                accentVar="--brand-action"
                accentColor={BRAND.roxoVivo}
                atual={kpis.taxaAtivacao ?? 0}
                anterior={kpisAnt.taxaAtivacao ?? 0}
                isHistorico={isHistoricoKpi || kpis.taxaAtivacao == null}
              />
            </div>
            <div className="app-grid-kpi-4" style={{ gap: 12 }}>
              <KpiCard
                label="Rodadas"
                value={kpis.rodadas.toLocaleString("pt-BR")}
                icon={<Clock size={16} aria-hidden />}
                accentVar="--brand-contrast"
                accentColor={BRAND.azul}
                atual={kpis.rodadas}
                anterior={kpisAnt.rodadas}
                isHistorico={isHistoricoKpi}
              />
              <KpiCard
                label="Média de Rodadas"
                value={fmtMedia(kpis.mediaRodadas)}
                icon={<ListOrdered size={16} aria-hidden />}
                accentColor={BRAND.ciano}
                atual={kpis.mediaRodadas ?? 0}
                anterior={kpisAnt.mediaRodadas ?? 0}
                isHistorico={isHistoricoKpi || kpis.mediaRodadas == null}
              />
              <KpiCard
                label="GGR"
                value={fmtBRL(kpis.ggrSpin)}
                icon={<TrendingUp size={16} aria-hidden />}
                accentColor={kpis.ggrSpin >= 0 ? BRAND.verde : BRAND.vermelho}
                atual={kpis.ggrSpin}
                anterior={kpisAnt.ggrSpin}
                isBRL
                isHistorico={isHistoricoKpi}
              />
              <KpiCard
                label="Turnover"
                value={fmtBRL(kpis.turnoverSpin)}
                icon={<Coins size={16} aria-hidden />}
                accentVar="--brand-action"
                accentColor={BRAND.roxo}
                atual={kpis.turnoverSpin}
                anterior={kpisAnt.turnoverSpin}
                isBRL
                isHistorico={isHistoricoKpi}
              />
            </div>
          </>
        )}
      </div>

      <div style={card}>
        <SectionTitle sub={sf.historico ? "acumulado" : "comparativo entre dois influencers no período"}>
          Comparativo de Funil
        </SectionTitle>
        <div className="app-conversao-vs-row">
          <SelectListaComBusca
            variant="campo"
            label="Influencer A no comparativo de funil"
            searchPlaceholder={placeholderPesquisaFiltro("Influencer")}
            value={compA}
            onChange={setCompA}
            wrapperStyle={{ flex: 1, minWidth: 120 }}
            style={{
              width: "100%",
              background: t.inputBg ?? t.cardBg,
              border: `1px solid ${compA ? COR_A.border : t.cardBorder}`,
              color: t.text,
              padding: "7px 12px",
              borderRadius: 10,
              fontSize: 13,
              fontFamily: FONT.body,
            }}
            options={[
              { value: "", label: "— Selecione —" },
              ...ranking
                .filter((r) => r.influencer_id !== compB)
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map((r) => ({ value: r.influencer_id, label: r.nome })),
            ]}
          />
          <div
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              border: "1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)",
              background: "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)",
              fontSize: 12,
              fontWeight: 800,
              color: "var(--brand-action, #7c3aed)",
              fontFamily: FONT.body,
              letterSpacing: "0.05em",
              textAlign: "center",
            }}
          >
            VS
          </div>
          <SelectListaComBusca
            variant="campo"
            label="Influencer B no comparativo de funil"
            searchPlaceholder={placeholderPesquisaFiltro("Influencer")}
            value={compB}
            onChange={setCompB}
            wrapperStyle={{ flex: 1, minWidth: 120 }}
            style={{
              width: "100%",
              background: t.inputBg ?? t.cardBg,
              border: `1px solid ${compB ? COR_B.border : t.cardBorder}`,
              color: t.text,
              padding: "7px 12px",
              borderRadius: 10,
              fontSize: 13,
              fontFamily: FONT.body,
            }}
            options={[
              { value: "", label: "— Selecione —" },
              ...ranking
                .filter((r) => r.influencer_id !== compA)
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map((r) => ({ value: r.influencer_id, label: r.nome })),
            ]}
          />
        </div>
        {(rowA || rowB) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
            <div
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                background: COR_A.bg,
                border: `1px solid ${COR_A.border}`,
                color: COR_A.accent,
              }}
            >
              {rowA?.nome ?? "—"}
            </div>
            <div
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                background: COR_B.bg,
                border: `1px solid ${COR_B.border}`,
                color: COR_B.accent,
              }}
            >
              {rowB?.nome ?? "—"}
            </div>
          </div>
        )}
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</div>
        ) : (
          <div className="app-conversao-funil-duo">
            <PainelFunilJogadores row={rowA} isEmpty={!compA} cor={COR_A} />
            <div className="app-conversao-funil-divider" style={{ width: 1, background: t.cardBorder, flexShrink: 0 }} />
            <PainelFunilJogadores row={rowB} isEmpty={!compB} cor={COR_B} />
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          marginBottom: 14,
        }}
      >
        <div style={{ ...card, marginBottom: 0 }}>
          <SectionTitle sub="Estúdio — Nome da Mesa">Rodadas por Mesa</SectionTitle>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</div>
          ) : mesas.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>{MSG_SEM_DADOS_PERIODO}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {mesas.map((m) => (
                <div key={m.key} style={{ display: "grid", gridTemplateColumns: "minmax(148px, 1.15fr) 1fr 64px", gap: 10, alignItems: "center" }}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "left", minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: FONT.body }}>
                      {m.estudio}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.text, lineHeight: 1.25, fontFamily: FONT.body }}>{m.mesa}</span>
                  </span>
                  <div style={{ height: 8, borderRadius: 999, background: t.inputBg, overflow: "hidden" }}>
                    <i
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${maxMesa > 0 ? (m.rodadas / maxMesa) * 100 : 0}%`,
                        background: m.cor,
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 12, fontFamily: FONT.body, color: t.text }}>
                    {m.rodadas.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ ...card, marginBottom: 0 }}>
          <SectionTitle sub={sf.historico ? "top 10 por rodadas Spin acumuladas" : "top 10 por rodadas Spin no mês"}>
            Ranking de Influencers
          </SectionTitle>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</div>
          ) : (
            <PodioRodadas ranking={ranking} />
          )}
        </div>
      </div>

      <div style={card}>
        <SectionTitle sub={sf.historico ? "acumulado" : "ordenado por rodadas Spin (quem trouxe mais volume em mesa)"}>
          Comparativo de Taxas
        </SectionTitle>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</div>
        ) : taxasOrdenadas.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>{MSG_SEM_DADOS_PERIODO}</div>
        ) : (
          <TabelaComPaginacao items={taxasOrdenadas} t={t} resetKey={`${sortTaxas.col}-${sortTaxas.dir}-${taxasOrdenadas.length}`}>
            {(linhas, zebraIdx) => (
              <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
                <table style={getDataTableStyle({ minWidth: 960 })}>
                  <caption style={{ display: "none" }}>Comparativo de taxas TAP → mesa Spin por influencer</caption>
                  <thead>
                    <tr>
                      <SortTableTh<TaxasSortCol> label="Influencer" col="nome" sortCol={sortTaxas.col} sortDir={sortTaxas.dir} onSort={onSortTaxas} thStyle={dataTable.thHeaderSticky} align="center" />
                      <SortTableTh label="Registros" col="registros" sortCol={sortTaxas.col} sortDir={sortTaxas.dir} onSort={onSortTaxas} thStyle={dataTable.thHeader} align="center" />
                      <SortTableTh label="Reg>Jogaram" col="pctRegJog" sortCol={sortTaxas.col} sortDir={sortTaxas.dir} onSort={onSortTaxas} thStyle={dataTable.thHeader} align="center" />
                      <SortTableTh label="Jogaram" col="jogaram" sortCol={sortTaxas.col} sortDir={sortTaxas.dir} onSort={onSortTaxas} thStyle={dataTable.thHeader} align="center" />
                      <SortTableTh label="Jogaram>Spin" col="pctJogSpin" sortCol={sortTaxas.col} sortDir={sortTaxas.dir} onSort={onSortTaxas} thStyle={dataTable.thHeader} align="center" />
                      <SortTableTh label="Spin" col="jogaramSpin" sortCol={sortTaxas.col} sortDir={sortTaxas.dir} onSort={onSortTaxas} thStyle={dataTable.thHeader} align="center" />
                      <SortTableTh label="Turnover Spin" col="turnoverSpin" sortCol={sortTaxas.col} sortDir={sortTaxas.dir} onSort={onSortTaxas} thStyle={dataTable.thHeader} align="center" />
                      <SortTableTh label="GGR Spin" col="ggrSpin" sortCol={sortTaxas.col} sortDir={sortTaxas.dir} onSort={onSortTaxas} thStyle={dataTable.thHeader} align="center" />
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((r, i) => {
                      const hlReg = r.pctRegJog != null && r.pctRegJog < JOGADORES_TAXA_BAIXA_PCT;
                      const hlSpin = r.pctJogSpin != null && r.pctJogSpin < JOGADORES_TAXA_BAIXA_PCT;
                      return (
                        <tr
                          key={r.influencer_id}
                          style={{ background: hoverRow === r.influencer_id ? rowHoverBg : dataTable.zebraRow(zebraIdx(i)) }}
                          onMouseEnter={() => setHoverRow(r.influencer_id)}
                          onMouseLeave={() => setHoverRow(null)}
                        >
                          <td
                            style={{
                              ...dataTable.tdSticky({
                                minWidth: 160,
                                fontWeight: 600,
                                background: hoverRow === r.influencer_id ? rowHoverBg : dataTable.zebraRow(zebraIdx(i)),
                              }),
                              maxWidth: 160,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={r.nome}
                          >
                            {r.nome}
                          </td>
                          <td style={dataTable.tdCenter}>{r.registros.toLocaleString("pt-BR")}</td>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              fontSize: 12,
                              fontWeight: hlReg ? 700 : 400,
                              color: hlReg ? BRAND.amarelo : t.textMuted,
                              borderLeft: hlReg ? "3px solid rgba(245,158,11,0.7)" : undefined,
                              background: hlReg ? "rgba(245,158,11,0.08)" : undefined,
                            }}
                          >
                            {fmtPctJogadores(r.pctRegJog)}
                          </td>
                          <td style={dataTable.tdCenter}>{r.jogaram.toLocaleString("pt-BR")}</td>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              fontSize: 12,
                              fontWeight: hlSpin ? 700 : 400,
                              color: hlSpin ? BRAND.amarelo : t.textMuted,
                              borderLeft: hlSpin ? "3px solid rgba(245,158,11,0.7)" : undefined,
                              background: hlSpin ? "rgba(245,158,11,0.08)" : undefined,
                            }}
                          >
                            {fmtPctJogadores(r.pctJogSpin)}
                          </td>
                          <td style={dataTable.tdCenter}>{r.jogaramSpin.toLocaleString("pt-BR")}</td>
                          <td style={dataTable.tdCenter}>{fmtBRL(r.turnoverSpin)}</td>
                          <td style={{ ...dataTable.tdCenter, color: r.ggrSpin >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>
                            {fmtBRL(r.ggrSpin)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabelaComPaginacao>
        )}
      </div>
    </div>
  );
}
