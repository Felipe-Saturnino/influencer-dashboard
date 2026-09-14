import { useMemo } from "react";
import {
  getOntemIsoLocal,
  getPeriodoComparativoMoMDmenos1,
  getPeriodoHistoricoCompetencias,
  HISTORICO_COMPETENCIAS_MESES,
  preencherDetalhamentoDiarioZerado,
} from "../../../lib/dashboardHelpers";
import {
  aggDailyMesKpi,
  arpuComparativoFromGgrUap,
  filtrarPorEscopoOperadora,
  fmtMesAnoCurtoFromYm,
  normalizeMesasYmd,
  type DailyRow,
  type LinhaDetalheTab,
  type MonthlyRow,
  type PorTabelaRow,
} from "./overviewSpinLogic";

function labelDiaMesFromIso(dataIso: string): string {
  return new Date(`${dataIso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function dailyRowVazio(dia: string): DailyRow {
  return {
    data: dia,
    turnover: 0,
    ggr: 0,
    bets: 0,
    uap: 0,
    margin_pct: null,
    bet_size: null,
    arpu: null,
  };
}

/** 13 competências YYYY-MM da janela Histórico (mais antiga → mais recente). */
function listarYmHistoricoCompetencias(ref: Date = new Date()): string[] {
  const { inicio } = getPeriodoHistoricoCompetencias(ref);
  const [y0, m0] = inicio.slice(0, 7).split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < HISTORICO_COMPETENCIAS_MESES; i++) {
    const d = new Date(y0!, m0! - 1 + i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

type Params = {
  porTabelaRows: PorTabelaRow[];
  porTabelaHistAll: PorTabelaRow[];
  filtroOperadora: string;
  operadoraSlugsForcado: string[] | null;
  podeVerOperadora: (slug: string) => boolean;
  historico: boolean;
  dailyData: DailyRow[];
  monthlyData: MonthlyRow[];
  modoAgregadoTodasOperadoras: boolean;
  mesSelecionado: { ano: number; mes: number } | undefined;
};

export function useOverviewSpinTabelaRows({
  porTabelaRows,
  porTabelaHistAll,
  filtroOperadora,
  operadoraSlugsForcado,
  podeVerOperadora,
  historico,
  dailyData,
  monthlyData,
  modoAgregadoTodasOperadoras,
  mesSelecionado,
}: Params) {
  const porTabelaFiltradas = useMemo(
    () =>
      filtrarPorEscopoOperadora(
        porTabelaRows,
        filtroOperadora,
        operadoraSlugsForcado,
        podeVerOperadora,
      ),
    [porTabelaRows, filtroOperadora, operadoraSlugsForcado, podeVerOperadora],
  );

  const porTabelaFiltradasHist = useMemo(
    () =>
      filtrarPorEscopoOperadora(
        porTabelaHistAll,
        filtroOperadora,
        operadoraSlugsForcado,
        podeVerOperadora,
      ),
    [porTabelaHistAll, filtroOperadora, operadoraSlugsForcado, podeVerOperadora],
  );

  const tabelaRows = useMemo(() => {
    const enrich = (
      base: Pick<DailyRow, "turnover" | "ggr" | "bets" | "uap"> & { label: string },
      periodoIso: string,
    ): LinhaDetalheTab => {
      const t = base.turnover;
      const g = base.ggr;
      const b = base.bets;
      const u = base.uap;
      const margin_pct = t != null && Number(t) !== 0 && g != null ? (Number(g) / Number(t)) * 100 : null;
      const bet_size =
        b != null && Number(b) !== 0 && t != null ? Number(t) / Number(b) : null;
      const arpu = u != null && Number(u) !== 0 && g != null ? Number(g) / Number(u) : null;
      return { ...base, margin_pct, bet_size, arpu, periodoIso };
    };
    if (historico) {
      const dailyByYm = new Map<string, DailyRow[]>();
      for (const r of dailyData) {
        const ym = r.data.slice(0, 7);
        if (!dailyByYm.has(ym)) dailyByYm.set(ym, []);
        dailyByYm.get(ym)!.push(r);
      }
      const monthlyByYm = new Map(monthlyData.map((m) => [m.mes.slice(0, 7), m] as const));
      const allYm = listarYmHistoricoCompetencias();
      return [...allYm]
        .reverse()
        .map((ym) => {
          const dias = dailyByYm.get(ym) ?? [];
          const agg = dias.length > 0 ? aggDailyMesKpi(dias) : null;
          const m = monthlyByYm.get(ym);
          if (modoAgregadoTodasOperadoras) {
            const turnover = agg?.turnover ?? 0;
            const ggr = agg?.ggr ?? 0;
            const bets = agg?.bets ?? 0;
            const margin_pct =
              turnover != null && turnover !== 0 && ggr != null ? (ggr / turnover) * 100 : null;
            const bet_size =
              bets != null && bets !== 0 && turnover != null ? turnover / bets : null;
            const uap = m?.uap != null ? Number(m.uap) : null;
            const arpu = arpuComparativoFromGgrUap(ggr, uap);
            return {
              label: fmtMesAnoCurtoFromYm(ym),
              turnover,
              ggr,
              bets,
              uap,
              margin_pct,
              bet_size,
              arpu,
              drillId: ym,
              periodoIso: `${ym}-01`,
            };
          }
          return enrich(
            {
              label: fmtMesAnoCurtoFromYm(ym),
              turnover: agg?.turnover ?? 0,
              ggr: agg?.ggr ?? 0,
              bets: agg?.bets ?? 0,
              uap: m?.uap != null ? Number(m.uap) : agg?.uap ?? null,
            },
            `${ym}-01`,
          );
        });
    }
    const periodo = mesSelecionado
      ? getPeriodoComparativoMoMDmenos1(mesSelecionado.ano, mesSelecionado.mes).atual
      : null;
    const ontemIso = getOntemIsoLocal();
    const diasComDadoReal = new Set(dailyData.map((r) => r.data.slice(0, 10)));
    const dailyCompleto = periodo
      ? preencherDetalhamentoDiarioZerado({
          rows: dailyData,
          getDia: (r) => r.data,
          inicio: periodo.inicio,
          fim: periodo.fim,
          fimMax: ontemIso,
          criarVazio: dailyRowVazio,
        }).filter((r) => {
          const d = r.data.slice(0, 10);
          // B5: não inventar D-1 com R$ 0,00 se o daily ainda não tem linha real desse dia.
          if (d === ontemIso && !diasComDadoReal.has(d)) return false;
          return true;
        })
      : [...dailyData].sort((a, b) => b.data.localeCompare(a.data));

    if (modoAgregadoTodasOperadoras) {
      return dailyCompleto.map((r) => ({
        label: labelDiaMesFromIso(r.data),
        turnover: r.turnover,
        ggr: r.ggr,
        bets: r.bets,
        uap: r.uap,
        margin_pct: r.margin_pct,
        bet_size: r.bet_size,
        arpu: arpuComparativoFromGgrUap(r.ggr, r.uap),
        drillId: r.data,
        periodoIso: normalizeMesasYmd(r.data),
      }));
    }
    return dailyCompleto.map((r) =>
      enrich(
        {
          label: labelDiaMesFromIso(r.data),
          turnover: r.turnover,
          ggr: r.ggr,
          bets: r.bets,
          uap: r.uap,
        },
        normalizeMesasYmd(r.data),
      ),
    );
  }, [historico, dailyData, monthlyData, modoAgregadoTodasOperadoras, mesSelecionado]);
  return { porTabelaFiltradas, porTabelaFiltradasHist, tabelaRows };
}
