import { useEffect, useMemo } from "react";
import {
  JOGOS_COMPARATIVO,
  KPIS_DISPONIVEIS,
  LABEL_FUTEBOL_BRASILEIRO,
  PALETA_OPERADORAS_DETALHE,
  UAP_JOGO_MAP,
  agregaDailyRawPorOperadoraNoDia,
  agregaDailyRawPorOperadoraNoMes,
  agregarLinhasComparativoJogo,
  arpuComparativoFromGgrUap,
  aggregateCellFromPorTabelaRows,
  buildPorTabelaGameBuckets,
  buildSlugListForMesasQueries,
  fmtDiaMesPtBr,
  isMesaBlackjackComparativo,
  isMesaFutebolBrasileiro,
  jogoComparativoKeysFromCadastroMesa,
  jogoComparativoKeysFromPorTabelaRows,
  labelMesaCda,
  linhaComparativoJogoAgregadaMes,
  linhaMesaPorDiaFromRow,
  linhasMesaAgregadasPorDia,
  linhasMesaAgregadasPorMes,
  normalizeMesasYmd,
  pickKpiMetricaDetalhe,
  pickPorTabelaOperDayShift,
  totaisOficiaisFromDailyRow,
  totaisOficiaisHistoricoMes,
  type CelulaJogoMetricas,
  type DailyRawRow,
  type DailyRow,
  type JogoComparativoKey,
  type KpiJogoKey,
  type LinhaComparativoJogoTab,
  type LinhaDetalheTab,
  type MesaCadastroComparativoRow,
  type MonthlyRawRow,
  type MonthlyRow,
  type PorTabelaRow,
  type TotaisOficiaisComparativo,
  type UapPorJogoPlanRow,
} from "./overviewSpinLogic";

type Params = {
  historico: boolean;
  modoAgregadoTodasOperadoras: boolean;
  mesasCadastro: MesaCadastroComparativoRow[];
  operadorasListFmt: { slug: string; nome: string }[];
  porTabelaFiltradas: PorTabelaRow[];
  porTabelaFiltradasHist: PorTabelaRow[];
  dailyData: DailyRow[];
  monthlyData: MonthlyRow[];
  uapPorJogoRows: UapPorJogoPlanRow[];
  dailyRawUnmerged: DailyRawRow[];
  monthlyRawUnmerged: MonthlyRawRow[];
  filtroOperadora: string;
  operadoraSlugsForcado: string[] | null | undefined;
  podeVerOperadora: (slug: string) => boolean;
  escoposVisiveis: {
    semRestricaoEscopo?: boolean;
    operadorasVisiveis: string[];
  };
  kpisSelecionados: Set<KpiJogoKey>;
  kpiGrafico: KpiJogoKey;
  kpiGraficoDetalhe: KpiJogoKey;
  tabelaRows: LinhaDetalheTab[];
  compMesaA: string;
  compMesaB: string;
  setCompMesaA: (v: string | ((p: string) => string)) => void;
  setCompMesaB: (v: string | ((p: string) => string)) => void;
};

export function useOverviewSpinComparativos(p: Params) {
  const {
    historico,
    modoAgregadoTodasOperadoras,
    mesasCadastro,
    operadorasListFmt,
    porTabelaFiltradas,
    porTabelaFiltradasHist,
    dailyData,
    monthlyData,
    uapPorJogoRows,
    dailyRawUnmerged,
    monthlyRawUnmerged,
    filtroOperadora,
    operadoraSlugsForcado,
    podeVerOperadora,
    escoposVisiveis,
    kpisSelecionados,
    kpiGrafico,
    kpiGraficoDetalhe,
    tabelaRows,
    compMesaA,
    compMesaB,
    setCompMesaA,
    setCompMesaB,
  } = p;

  /** Só Blackjack 1 / 2 / VIP — comparativo lateral. */
  const mesasOpcoesBlackjack = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    const seen = new Map<string, PorTabelaRow>();
    for (const r of src) {
      if (!isMesaBlackjackComparativo(r, operadorasListFmt)) continue;
      const k = r.nome_tabela.trim();
      if (!k) continue;
      if (!seen.has(k)) seen.set(k, r);
    }
    const list = [...seen.entries()].map(([key, sample]) => ({
      key,
      label: labelMesaCda(sample, operadorasListFmt),
    }));
    list.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    return list;
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const linhasSpeedBaccarat = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(
        src,
        (r) => labelMesaCda(r, operadorasListFmt) === "Speed Baccarat",
      );
    }
    return src
      .filter((r) => labelMesaCda(r, operadorasListFmt) === "Speed Baccarat")
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  /** Uma tabela Blackjack (aba Network em Dados por mesa) — agrega BJ 1/2/VIP se houver. */
  const linhasBlackjack = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    const pred = (r: PorTabelaRow) => isMesaBlackjackComparativo(r, operadorasListFmt);
    if (historico) return linhasMesaAgregadasPorMes(src, pred);
    return linhasMesaAgregadasPorDia(src, pred);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const linhasRoleta = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => labelMesaCda(r, operadorasListFmt) === "Roleta");
    }
    return src
      .filter((r) => labelMesaCda(r, operadorasListFmt) === "Roleta")
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const linhasFutebolBrasileiro = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => isMesaFutebolBrasileiro(r, operadorasListFmt));
    }
    return src
      .filter((r) => isMesaFutebolBrasileiro(r, operadorasListFmt))
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const slugListEscopoComparativo = useMemo(
    () =>
      buildSlugListForMesasQueries({
        operadoraSlugsForcado,
        filtroOperadora,
        semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo === true,
        operadorasVisiveis: escoposVisiveis.operadorasVisiveis,
      }),
    [
      operadoraSlugsForcado,
      filtroOperadora,
      escoposVisiveis.semRestricaoEscopo,
      escoposVisiveis.operadorasVisiveis,
    ],
  );

  /**
   * Jogos no Comparativo / Dados por mesa: união do catálogo no escopo + jogos presentes no relatório.
   * Mesas network costumam ter `operadora_slug` null no cadastro — sem a união, Futebol some para o operador.
   */
  const jogosComparativoAtivos = useMemo(() => {
    const keys = new Set<JogoComparativoKey>();
    const rowsCadastro =
      slugListEscopoComparativo != null && slugListEscopoComparativo.length > 0
        ? mesasCadastro.filter((m) => slugListEscopoComparativo.includes(m.operadora_slug))
        : mesasCadastro.filter((m) => podeVerOperadora(m.operadora_slug));

    for (const m of rowsCadastro) {
      for (const k of jogoComparativoKeysFromCadastroMesa(m.tipo_jogo, m.nome_mesa)) {
        keys.add(k);
      }
    }

    const srcRows = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    for (const k of jogoComparativoKeysFromPorTabelaRows(srcRows, operadorasListFmt)) {
      keys.add(k);
    }

    return JOGOS_COMPARATIVO.filter((j) => keys.has(j.key));
  }, [
    mesasCadastro,
    slugListEscopoComparativo,
    podeVerOperadora,
    historico,
    porTabelaFiltradasHist,
    porTabelaFiltradas,
    operadorasListFmt,
  ]);

  const exibirBlocoDadosPorMesaFutebol = useMemo(() => {
    if (modoAgregadoTodasOperadoras) return false;
    return jogosComparativoAtivos.some((j) => j.key === "futebol_brasileiro");
  }, [modoAgregadoTodasOperadoras, jogosComparativoAtivos]);

  const qtdColunasJogoComparativo = 1 + jogosComparativoAtivos.length;

  /** Dia a dia (mês selecionado) ou mês a mês (histórico). */
  const linhasComparativoJogo = useMemo((): LinhaComparativoJogoTab[] => {
    if (historico) {
      const dailyByYm = new Map<string, DailyRow[]>();
      for (const r of dailyData) {
        const ym = r.data.slice(0, 7);
        if (!dailyByYm.has(ym)) dailyByYm.set(ym, []);
        dailyByYm.get(ym)!.push(r);
      }
      const monthlyByYm = new Map(monthlyData.map((m) => [m.mes.slice(0, 7), m] as const));

      const byYm = new Map<string, PorTabelaRow[]>();
      for (const r of porTabelaFiltradasHist) {
        const ym = r.data_relatorio.slice(0, 7);
        if (!byYm.has(ym)) byYm.set(ym, []);
        byYm.get(ym)!.push(r);
      }
      return [...byYm.keys()]
        .sort((a, b) => b.localeCompare(a))
        .map((ym) =>
          linhaComparativoJogoAgregadaMes(
            ym,
            byYm.get(ym)!,
            operadorasListFmt,
            uapPorJogoRows,
            totaisOficiaisHistoricoMes(ym, dailyByYm, monthlyByYm),
          ),
        );
    }
    const shiftOper = pickPorTabelaOperDayShift(dailyData, porTabelaFiltradas, operadorasListFmt);
    const byDate = buildPorTabelaGameBuckets(porTabelaFiltradas, operadorasListFmt, shiftOper);

    const uapByDateJogo = new Map<
      string,
      Partial<Record<"blackjack" | "roleta" | "baccarat" | "futebol_brasileiro", number>>
    >();
    for (const r of uapPorJogoRows) {
      if (r.uap == null) continue;
      const dk = normalizeMesasYmd(r.data);
      if (!uapByDateJogo.has(dk)) uapByDateJogo.set(dk, {});
      const jogoKey = UAP_JOGO_MAP[r.jogo];
      if (jogoKey) uapByDateJogo.get(dk)![jogoKey] = Number(r.uap);
    }

    return [...dailyData]
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((dr) => {
        const dataIso = normalizeMesasYmd(dr.data);
        const b = byDate.get(dataIso) ?? { bj: [], roleta: [], baccarat: [], futebolBrasileiro: [] };
        const uapDia = uapByDateJogo.get(dataIso) ?? {};
        const bjCell = aggregateCellFromPorTabelaRows(b.bj);
        const rlCell = aggregateCellFromPorTabelaRows(b.roleta);
        const bcCell = aggregateCellFromPorTabelaRows(b.baccarat);
        const fbCell = aggregateCellFromPorTabelaRows(b.futebolBrasileiro);
        const uapBj = uapDia.blackjack ?? null;
        const uapRl = uapDia.roleta ?? null;
        const uapBc = uapDia.baccarat ?? null;
        const uapFb = uapDia.futebol_brasileiro ?? null;
        return {
          dataIso,
          labelData: fmtDiaMesPtBr(dataIso),
          blackjack: {
            ...bjCell,
            uap: uapBj,
            arpu: arpuComparativoFromGgrUap(bjCell.ggr, uapBj),
          },
          roleta: {
            ...rlCell,
            uap: uapRl,
            arpu: arpuComparativoFromGgrUap(rlCell.ggr, uapRl),
          },
          baccarat: {
            ...bcCell,
            uap: uapBc,
            arpu: arpuComparativoFromGgrUap(bcCell.ggr, uapBc),
          },
          futebol_brasileiro: {
            ...fbCell,
            uap: uapFb,
            arpu: arpuComparativoFromGgrUap(fbCell.ggr, uapFb),
          },
          totaisOficiais: totaisOficiaisFromDailyRow(dr),
        };
      });
  }, [
    historico,
    dailyData,
    monthlyData,
    porTabelaFiltradasHist,
    porTabelaFiltradas,
    operadorasListFmt,
    uapPorJogoRows,
  ]);

  const linhaTotaisComparativoJogo = useMemo(
    () =>
      linhasComparativoJogo.length === 0 ? null : agregarLinhasComparativoJogo(linhasComparativoJogo),
    [linhasComparativoJogo],
  );

  const kpisAtivosComparativo = useMemo(
    () => KPIS_DISPONIVEIS.filter((k) => kpisSelecionados.has(k.key)),
    [kpisSelecionados],
  );

  const kpiGraficoConfig = useMemo(
    () => KPIS_DISPONIVEIS.find((k) => k.key === kpiGrafico) ?? KPIS_DISPONIVEIS[0]!,
    [kpiGrafico],
  );

  const dadosGraficoComparativoJogo = useMemo(() => {
    // Gráfico: ordem cronológica (antigo → novo); tabela usa `linhasComparativoJogo` mais recente primeiro.
    return [...linhasComparativoJogo].reverse().map((row) => {
      const val = (jogoKey: "blackjack" | "roleta" | "baccarat" | "futebol_brasileiro") => {
        const v = row[jogoKey][kpiGrafico as keyof CelulaJogoMetricas];
        return v != null ? Number(v) : null;
      };
      const totalOficial =
        row.totaisOficiais[kpiGrafico as keyof TotaisOficiaisComparativo] ?? null;
      return {
        label: row.labelData,
        dataIso: row.dataIso,
        Blackjack: val("blackjack"),
        Roleta: val("roleta"),
        Baccarat: val("baccarat"),
        [LABEL_FUTEBOL_BRASILEIRO]: val("futebol_brasileiro"),
        Total: totalOficial != null ? Number(totalOficial) : null,
      };
    });
  }, [linhasComparativoJogo, kpiGrafico]);

  const isBRLKpiGrafico = ["ggr", "turnover", "bet_size", "arpu"].includes(kpiGrafico);

  const kpiGraficoDetalheConfig = useMemo(
    () => KPIS_DISPONIVEIS.find((k) => k.key === kpiGraficoDetalhe) ?? KPIS_DISPONIVEIS[0]!,
    [kpiGraficoDetalhe],
  );

  const isBRLKpiGraficoDetalhe = ["ggr", "turnover", "bet_size", "arpu"].includes(kpiGraficoDetalhe);

  const { dadosGraficoDetalheOperadoras, slugsGraficoDetalhe } = useMemo(() => {
    const k = kpiGraficoDetalhe;
    if (tabelaRows.length === 0) return { dadosGraficoDetalheOperadoras: [] as Record<string, unknown>[], slugsGraficoDetalhe: [] as string[] };

    const chrono = [...tabelaRows].reverse();
    const slugSet = new Set<string>();

    const rowsOut = chrono.map((r) => {
      const total = pickKpiMetricaDetalhe(r, k);
      const base: Record<string, unknown> = {
        label: r.label,
        dataIso: r.periodoIso,
        Total: total,
      };

      if (modoAgregadoTodasOperadoras && r.drillId != null) {
        const subs = historico
          ? agregaDailyRawPorOperadoraNoMes(dailyRawUnmerged, r.drillId, monthlyRawUnmerged)
          : agregaDailyRawPorOperadoraNoDia(dailyRawUnmerged, normalizeMesasYmd(r.drillId));
        for (const sub of subs) {
          if (!podeVerOperadora(sub.operadora_slug)) continue;
          base[sub.operadora_slug] = pickKpiMetricaDetalhe(sub, k);
          slugSet.add(sub.operadora_slug);
        }
      } else if (filtroOperadora !== "todas") {
        base[filtroOperadora] = pickKpiMetricaDetalhe(r, k);
        slugSet.add(filtroOperadora);
      } else if (operadoraSlugsForcado != null && operadoraSlugsForcado.length > 0) {
        /** "Todas" no UI mas escopo fixo (ex.: operador) — mesmo breakdown por slug que no modo agregado. */
        const ym = historico
          ? r.drillId != null
            ? String(r.drillId).slice(0, 7)
            : r.periodoIso.slice(0, 7)
          : null;
        const dia = !historico
          ? normalizeMesasYmd(r.drillId != null ? String(r.drillId) : r.periodoIso)
          : null;
        const subs = historico
          ? agregaDailyRawPorOperadoraNoMes(dailyRawUnmerged, ym!, monthlyRawUnmerged)
          : agregaDailyRawPorOperadoraNoDia(dailyRawUnmerged, dia!);
        for (const sub of subs) {
          if (!operadoraSlugsForcado.includes(sub.operadora_slug)) continue;
          if (!podeVerOperadora(sub.operadora_slug)) continue;
          base[sub.operadora_slug] = pickKpiMetricaDetalhe(sub, k);
          slugSet.add(sub.operadora_slug);
        }
      }
      return base;
    });

    return {
      dadosGraficoDetalheOperadoras: rowsOut,
      slugsGraficoDetalhe: [...slugSet].sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
  }, [
    tabelaRows,
    kpiGraficoDetalhe,
    modoAgregadoTodasOperadoras,
    historico,
    dailyRawUnmerged,
    monthlyRawUnmerged,
    podeVerOperadora,
    filtroOperadora,
    operadoraSlugsForcado,
  ]);

  const coresOperadorasDetalhe = useMemo(() => {
    const m = new Map<string, string>();
    slugsGraficoDetalhe.forEach((slug, i) => {
      m.set(slug, PALETA_OPERADORAS_DETALHE[i % PALETA_OPERADORAS_DETALHE.length]!);
    });
    return m;
  }, [slugsGraficoDetalhe]);

  const minWidthTabelaComparativoJogo =
    120 + kpisAtivosComparativo.length * (100 + jogosComparativoAtivos.length * 90);

  const linhasMesaA = useMemo(() => {
    if (!compMesaA) return [];
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => r.nome_tabela.trim() === compMesaA);
    }
    return src
      .filter((r) => r.nome_tabela.trim() === compMesaA)
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, compMesaA]);

  const linhasMesaB = useMemo(() => {
    if (!compMesaB) return [];
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => r.nome_tabela.trim() === compMesaB);
    }
    return src
      .filter((r) => r.nome_tabela.trim() === compMesaB)
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, compMesaB]);

  useEffect(() => {
    if (mesasOpcoesBlackjack.length === 0) {
      setCompMesaA("");
      setCompMesaB("");
      return;
    }
    setCompMesaA((prev) =>
      prev && mesasOpcoesBlackjack.some((x) => x.key === prev) ? prev : mesasOpcoesBlackjack[0]!.key,
    );
  }, [mesasOpcoesBlackjack, setCompMesaA, setCompMesaB]);

  useEffect(() => {
    if (mesasOpcoesBlackjack.length === 0) return;
    setCompMesaB((prev) => {
      if (prev && mesasOpcoesBlackjack.some((x) => x.key === prev) && prev !== compMesaA) return prev;
      const alt = mesasOpcoesBlackjack.find((x) => x.key !== compMesaA);
      return alt?.key ?? mesasOpcoesBlackjack[0]!.key;
    });
  }, [mesasOpcoesBlackjack, compMesaA, setCompMesaB]);

  return {
    mesasOpcoesBlackjack,
    linhasBlackjack,
    linhasSpeedBaccarat,
    linhasRoleta,
    linhasFutebolBrasileiro,
    jogosComparativoAtivos,
    exibirBlocoDadosPorMesaFutebol,
    qtdColunasJogoComparativo,
    linhasComparativoJogo,
    linhaTotaisComparativoJogo,
    kpisAtivosComparativo,
    kpiGraficoConfig,
    dadosGraficoComparativoJogo,
    isBRLKpiGrafico,
    kpiGraficoDetalheConfig,
    isBRLKpiGraficoDetalhe,
    dadosGraficoDetalheOperadoras,
    slugsGraficoDetalhe,
    coresOperadorasDetalhe,
    minWidthTabelaComparativoJogo,
    linhasMesaA,
    linhasMesaB,
  };
}
