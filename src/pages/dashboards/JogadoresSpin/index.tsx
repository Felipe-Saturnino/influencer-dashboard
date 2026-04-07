import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { getPeriodoComparativoMoM, fmtBRL } from "../../../lib/dashboardHelpers";
import KpiCard from "../../../components/dashboard/KpiCard";
import { SelectComIcone, SkeletonKpiCard } from "../../../components/dashboard";
import { getThStyle, getTdStyle, getTdNumStyle } from "../../../lib/tableStyles";
import { ChevronLeft, ChevronRight, Clock, LayoutGrid, Users, UserPlus, Sparkles, Target, Table2 } from "lucide-react";
import { GiCalendar, GiShield } from "react-icons/gi";

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Primeiro mês com operação (igual Mesas Spin) — o carrossel não lista meses anteriores. */
const CARROSSEL_JOGADORES_MIN_ANO = 2025;
const CARROSSEL_JOGADORES_MIN_MES = 11; // Dezembro (0-based)

function getMesesDisponiveis() {
  const hoje = new Date();
  const lista: { ano: number; mes: number; label: string }[] = [];
  let ano = CARROSSEL_JOGADORES_MIN_ANO;
  let mes = CARROSSEL_JOGADORES_MIN_MES;
  while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth())) {
    lista.push({ ano, mes, label: `${MESES_PT[mes]} ${ano}` });
    mes++;
    if (mes > 11) {
      mes = 0;
      ano++;
    }
  }
  return lista;
}

function fmtMesAnoCurtoFromYm(ym: string): string {
  const [ys, ms] = ym.split("-");
  const mo = Number(ms);
  const y = Number(ys);
  if (!ys || !Number.isFinite(mo) || mo < 1 || mo > 12) return ym;
  return `${MESES_CURTOS[mo - 1]}/${y}`;
}

function dateUtcFromIso(iso: string | null | undefined): string | null {
  if (iso == null || iso === "") return null;
  const s = String(iso);
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function eachDayInRange(inicio: string, fim: string): string[] {
  const out: string[] = [];
  const cur = new Date(inicio + "T00:00:00.000Z");
  const end = new Date(fim + "T00:00:00.000Z");
  while (cur.getTime() <= end.getTime()) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function boundsForYm(ym: string): { inicio: string; fim: string } {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { inicio: `${yStr}-${mm}-01`, fim: `${yStr}-${mm}-${String(last).padStart(2, "0")}` };
}

function fmtDiaMesPtBr(isoYmd: string): string {
  return new Date(isoYmd + "T12:00:00.000Z").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

type JogadorRow = {
  cda_id: string;
  data_cadastro_bet: string | null;
  primeiro_jogo_spin: string | null;
};

type HistRow = {
  cda_id: string;
  game_date: string;
  game_count: number | null;
  payout: number | null;
};

export type LinhaDetalhe = {
  label: string;
  dataIso: string;
  registros: number;
  primeiroJogo: number;
  potencial: number;
  jogadores: number;
  qtdJogos: number;
  pagamentos: number;
};

function SectionHeader({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ color: "var(--brand-primary, #7c3aed)", display: "flex" }}>{icon}</span>
      <div>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 16, fontWeight: 800, color: "inherit" }}>{title}</div>
        {sub ? (
          <div style={{ fontSize: 12, opacity: 0.75, fontFamily: FONT.body, marginTop: 2 }}>{sub}</div>
        ) : null}
      </div>
    </div>
  );
}

function countPotencialNoMes(jogadores: JogadorRow[], inicio: string, fim: string): number {
  let n = 0;
  for (const j of jogadores) {
    const dc = dateUtcFromIso(j.data_cadastro_bet);
    if (!dc || dc < inicio || dc > fim) continue;
    const pj = dateUtcFromIso(j.primeiro_jogo_spin);
    if (pj == null || pj < inicio || pj > fim) n++;
  }
  return n;
}

function ymFromDataset(jogadores: JogadorRow[], hist: HistRow[]): string[] {
  const set = new Set<string>();
  for (const j of jogadores) {
    const dc = dateUtcFromIso(j.data_cadastro_bet);
    const pj = dateUtcFromIso(j.primeiro_jogo_spin);
    if (dc) set.add(dc.slice(0, 7));
    if (pj) set.add(pj.slice(0, 7));
  }
  for (const h of hist) {
    const gd = String(h.game_date).slice(0, 10);
    if (gd.length >= 7) set.add(gd.slice(0, 7));
  }
  return [...set].sort();
}

function buildLinhasDiarias(
  dias: string[],
  jogadores: JogadorRow[],
  histPorDia: Map<string, { jogadores: Set<string>; qtdJogos: number; pagamentos: number }>,
): LinhaDetalhe[] {
  return dias.map((dataIso) => {
    let registros = 0;
    let primeiroJogo = 0;
    for (const j of jogadores) {
      if (dateUtcFromIso(j.data_cadastro_bet) === dataIso) registros++;
      if (dateUtcFromIso(j.primeiro_jogo_spin) === dataIso) primeiroJogo++;
    }
    const agg = histPorDia.get(dataIso) ?? { jogadores: new Set<string>(), qtdJogos: 0, pagamentos: 0 };
    return {
      label: fmtDiaMesPtBr(dataIso),
      dataIso,
      registros,
      primeiroJogo,
      potencial: registros - primeiroJogo,
      jogadores: agg.jogadores.size,
      qtdJogos: agg.qtdJogos,
      pagamentos: agg.pagamentos,
    };
  });
}

function buildLinhasMensais(
  yms: string[],
  jogadores: JogadorRow[],
  hist: HistRow[],
): LinhaDetalhe[] {
  return yms.map((ym) => {
    const { inicio, fim } = boundsForYm(ym);
    const dias = eachDayInRange(inicio, fim);
    const histSlice = hist.filter((h) => {
      const d = String(h.game_date).slice(0, 10);
      return d >= inicio && d <= fim;
    });
    const histPorDia = aggregateHistPorDia(histSlice);
    const dayRows = buildLinhasDiarias(dias, jogadores, histPorDia);
    const registros = dayRows.reduce((s, r) => s + r.registros, 0);
    const primeiroJogo = dayRows.reduce((s, r) => s + r.primeiroJogo, 0);
    const potencial = countPotencialNoMes(jogadores, inicio, fim);
    const jogadoresAtivos = new Set(histSlice.filter((h) => (h.game_count ?? 0) > 0).map((h) => h.cda_id)).size;
    const qtdJogos = histSlice.reduce((s, h) => s + (h.game_count ?? 0), 0);
    const pagamentos = histSlice.reduce((s, h) => s + Number(h.payout ?? 0), 0);
    return {
      label: fmtMesAnoCurtoFromYm(ym),
      dataIso: inicio,
      registros,
      primeiroJogo,
      potencial,
      jogadores: jogadoresAtivos,
      qtdJogos,
      pagamentos,
    };
  });
}

function aggregateHistPorDia(hist: HistRow[]): Map<string, { jogadores: Set<string>; qtdJogos: number; pagamentos: number }> {
  const map = new Map<string, { jogadores: Set<string>; qtdJogos: number; pagamentos: number }>();
  for (const h of hist) {
    const d = String(h.game_date).slice(0, 10);
    if (!map.has(d)) {
      map.set(d, { jogadores: new Set(), qtdJogos: 0, pagamentos: 0 });
    }
    const e = map.get(d)!;
    const gc = h.game_count ?? 0;
    if (gc > 0) e.jogadores.add(h.cda_id);
    e.qtdJogos += gc;
    e.pagamentos += Number(h.payout ?? 0);
  }
  return map;
}

const BRAND = {
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  verde: "#22c55e",
  amarelo: "#f59e0b",
} as const;

export default function JogadoresSpin() {
  const { theme: t } = useApp();
  const perm = usePermission("jogadores_spin");
  const { showFiltroOperadora, podeVerOperadora } = useDashboardFiltros();
  const brand = useDashboardBrand();

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes] = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jogadores, setJogadores] = useState<JogadorRow[]>([]);
  const [historicoRows, setHistoricoRows] = useState<HistRow[]>([]);
  const [operadorasOcr, setOperadorasOcr] = useState<{ slug: string; nome: string }[]>([]);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() {
    setHistorico(false);
    setIdxMes((i) => Math.max(0, i - 1));
  }
  function irMesProximo() {
    setHistorico(false);
    setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
  }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
    } else setHistorico(true);
  }

  useEffect(() => {
    let alive = true;
    supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (alive) setOperadorasOcr(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const jogRaw = await fetchAllPages(async (from, to) =>
        supabase.from("pls_jogador_dados").select("cda_id, data_cadastro_bet, primeiro_jogo_spin").range(from, to),
      );

      if (historico) {
        const histRaw = await fetchAllPages(async (from, to) =>
          supabase
            .from("pls_jogador_historico_dia")
            .select("cda_id, game_date, game_count, payout")
            .order("game_date", { ascending: true })
            .range(from, to),
        );
        setJogadores((jogRaw ?? []) as JogadorRow[]);
        setHistoricoRows((histRaw ?? []) as HistRow[]);
      } else if (mesSelecionado) {
        const { atual } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
        const { inicio, fim } = atual;
        const histRaw = await fetchAllPages(async (from, to) =>
          supabase
            .from("pls_jogador_historico_dia")
            .select("cda_id, game_date, game_count, payout")
            .gte("game_date", inicio)
            .lte("game_date", fim)
            .order("game_date", { ascending: true })
            .range(from, to),
        );
        setJogadores((jogRaw ?? []) as JogadorRow[]);
        setHistoricoRows((histRaw ?? []) as HistRow[]);
      }
    } catch {
      setJogadores([]);
      setHistoricoRows([]);
    } finally {
      setLoading(false);
    }
  }, [historico, mesSelecionado]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const detalhamento = useMemo(() => {
    if (historico) {
      const yms = ymFromDataset(jogadores, historicoRows);
      return buildLinhasMensais(yms, jogadores, historicoRows);
    }
    if (!mesSelecionado) return [] as LinhaDetalhe[];
    const { atual } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
    const dias = eachDayInRange(atual.inicio, atual.fim);
    const histPorDia = aggregateHistPorDia(historicoRows);
    return buildLinhasDiarias(dias, jogadores, histPorDia);
  }, [historico, mesSelecionado, jogadores, historicoRows]);

  const kpis = useMemo(() => {
    const sumRegistros = detalhamento.reduce((s, r) => s + r.registros, 0);
    const sumPrimeiro = detalhamento.reduce((s, r) => s + r.primeiroJogo, 0);

    let jogadoresAtivos = 0;
    let potencial = 0;

    if (historico) {
      jogadoresAtivos = new Set(historicoRows.filter((h) => (h.game_count ?? 0) > 0).map((h) => h.cda_id)).size;
      potencial = detalhamento.reduce((s, r) => s + r.potencial, 0);
    } else if (mesSelecionado) {
      const { atual } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
      const { inicio, fim } = atual;
      jogadoresAtivos = new Set(
        historicoRows.filter((h) => {
          const d = String(h.game_date).slice(0, 10);
          return d >= inicio && d <= fim && (h.game_count ?? 0) > 0;
        }).map((h) => h.cda_id),
      ).size;
      potencial = countPotencialNoMes(jogadores, inicio, fim);
    }

    return {
      registros: sumRegistros,
      primeiroJogo: sumPrimeiro,
      jogadoresAtivos,
      potencial,
    };
  }, [detalhamento, historico, historicoRows, jogadores, mesSelecionado]);

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

  const card: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  const btnNav: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const thStyle = getThStyle(t, { verticalAlign: "middle", background: "rgba(74,32,130,0.08)" });
  const tdStyle = getTdStyle(t, { padding: "9px 12px" });
  const tdNum = getTdNumStyle(t, { padding: "9px 12px" });

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar Jogadores Spin.
      </div>
    );
  }

  return (
    <div
      className="app-page-shell app-page-shell--pb64"
      style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}
    >
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            borderRadius: 14,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            padding: "12px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              aria-label="Mês anterior"
              style={{
                ...btnNav,
                opacity: historico || isPrimeiro ? 0.35 : 1,
                cursor: historico || isPrimeiro ? "not-allowed" : "pointer",
              }}
              onClick={irMesAnterior}
              disabled={historico || isPrimeiro}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                minWidth: 180,
                textAlign: "center",
              }}
            >
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              style={{
                ...btnNav,
                opacity: historico || isUltimo ? 0.35 : 1,
                cursor: historico || isUltimo ? "not-allowed" : "pointer",
              }}
              onClick={irMesProximo}
              disabled={historico || isUltimo}
            >
              <ChevronRight size={14} aria-hidden />
            </button>

            <button
              type="button"
              aria-label={historico ? "Desativar modo histórico" : "Ativar modo histórico"}
              aria-pressed={historico}
              onClick={toggleHistorico}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                border: historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
                background: historico
                  ? brand.useBrand
                    ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                    : `${BRAND.roxoVivo}18`
                  : "transparent",
                color: historico ? brand.accent : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              <GiCalendar size={15} aria-hidden /> Histórico
            </button>

            {showFiltroOperadora && (
              <SelectComIcone
                icon={<GiShield size={15} aria-hidden />}
                label="Filtrar por operadora"
                value={filtroOperadora}
                onChange={setFiltroOperadora}
              >
                <option value="todas">Todas as operadoras</option>
                {operadorasOcr
                  .filter((o) => podeVerOperadora(o.slug))
                  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                  .map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.nome}
                    </option>
                  ))}
              </SelectComIcone>
            )}

            {loading && (
              <span
                style={{
                  fontSize: 12,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Clock size={12} aria-hidden /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <SectionHeader
          icon={<LayoutGrid size={15} />}
          title="KPIs consolidados"
          sub={historico ? "soma das linhas do detalhamento · todo o período" : "período do carrossel (MTD no mês atual)"}
        />
        {loading ? (
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonKpiCard key={i} />
            ))}
          </div>
        ) : (
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            <KpiCard
              label="Registros"
              value={kpis.registros.toLocaleString("pt-BR")}
              icon={<UserPlus size={16} />}
              accentVar="--brand-extra3"
              accentColor={BRAND.azul}
              atual={kpis.registros}
              anterior={0}
              isHistorico
            />
            <KpiCard
              label="Primeiro jogo"
              value={kpis.primeiroJogo.toLocaleString("pt-BR")}
              icon={<Sparkles size={16} />}
              accentVar="--brand-extra2"
              accentColor={BRAND.roxoVivo}
              atual={kpis.primeiroJogo}
              anterior={0}
              isHistorico
            />
            <KpiCard
              label="Jogadores ativos"
              value={kpis.jogadoresAtivos.toLocaleString("pt-BR")}
              icon={<Users size={16} />}
              accentVar="--brand-extra1"
              accentColor={BRAND.verde}
              atual={kpis.jogadoresAtivos}
              anterior={0}
              isHistorico
            />
            <KpiCard
              label="Potencial"
              value={kpis.potencial.toLocaleString("pt-BR")}
              icon={<Target size={16} />}
              accentVar="--brand-extra4"
              accentColor={BRAND.amarelo}
              atual={kpis.potencial}
              anterior={0}
              isHistorico
            />
          </div>
        )}
      </div>

      <div style={card}>
        <SectionHeader
          icon={<Table2 size={15} />}
          title="Detalhamento diário"
          sub={historico ? "consolidado por mês" : "dia a dia no período selecionado"}
        />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT.body, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>{historico ? "Mês" : "Data"}</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Registros</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Primeiro jogo</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Potencial</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Jogadores</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Qtd. jogos</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Pagamentos</th>
              </tr>
            </thead>
            <tbody>
              {detalhamento.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: t.textMuted }}>
                    Sem dados para o período selecionado.
                  </td>
                </tr>
              ) : (
                detalhamento.map((row) => (
                  <tr key={row.dataIso + row.label}>
                    <td style={tdStyle}>{row.label}</td>
                    <td style={tdNum}>{row.registros.toLocaleString("pt-BR")}</td>
                    <td style={tdNum}>{row.primeiroJogo.toLocaleString("pt-BR")}</td>
                    <td style={tdNum}>{row.potencial.toLocaleString("pt-BR")}</td>
                    <td style={tdNum}>{row.jogadores.toLocaleString("pt-BR")}</td>
                    <td style={tdNum}>{row.qtdJogos.toLocaleString("pt-BR")}</td>
                    <td style={tdNum}>{fmtBRL(row.pagamentos)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
