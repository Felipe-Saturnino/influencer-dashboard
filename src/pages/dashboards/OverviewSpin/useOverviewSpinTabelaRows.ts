import { useMemo } from "react";
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
      const allYm = new Set<string>([...dailyByYm.keys(), ...monthlyByYm.keys()]);
      return [...allYm]
        .sort((a, b) => b.localeCompare(a))
        .map((ym) => {
          const dias = dailyByYm.get(ym) ?? [];
          const agg = dias.length > 0 ? aggDailyMesKpi(dias) : null;
          const m = monthlyByYm.get(ym);
          if (modoAgregadoTodasOperadoras) {
            const turnover = agg?.turnover ?? null;
            const ggr = agg?.ggr ?? null;
            const bets = agg?.bets ?? null;
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
              turnover: agg?.turnover ?? null,
              ggr: agg?.ggr ?? null,
              bets: agg?.bets ?? null,
              uap: m?.uap != null ? Number(m.uap) : agg?.uap ?? null,
            },
            `${ym}-01`,
          );
        });
    }
    if (modoAgregadoTodasOperadoras) {
      return [...dailyData]
        .sort((a, b) => b.data.localeCompare(a.data))
        .map((r) => ({
          label: new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
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
    return [...dailyData]
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((r) =>
        enrich(
          {
            label: new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            }),
            turnover: r.turnover,
            ggr: r.ggr,
            bets: r.bets,
            uap: r.uap,
          },
          normalizeMesasYmd(r.data),
        ),
      );
  }, [historico, dailyData, monthlyData, modoAgregadoTodasOperadoras]);
  return { porTabelaFiltradas, porTabelaFiltradasHist, tabelaRows };
}
