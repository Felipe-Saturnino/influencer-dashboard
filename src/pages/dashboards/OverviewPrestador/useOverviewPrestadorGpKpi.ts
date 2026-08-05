import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import {
  getPeriodoComparativoMesCompleto,
  getPeriodoHistoricoCompetencias,
} from "../../../lib/dashboardHelpers";
import { fetchEstudioIncidentesPrestadoresPeriodo } from "../../../lib/estudioIncidentesFetch";
import type { EstudioIncidenteRow } from "../../../lib/estudioIncidentesTypes";
import {
  agregarContagemIncidentes,
  agruparIncidentesPorDia,
  agruparIncidentesPorJogo,
  agruparIncidentesPorPrestador,
  contarIncidentesPorJogo,
  INCIDENTE_AGG_ZERO,
  jogosComDadosOuIncidentes,
  type IncidenteAggContagem,
  type IncidenteJogoLinha,
  type IncidentePrestadorLinha,
} from "../../../lib/overviewPrestadorIncidentes";
import {
  agregarGpKpiRows,
  agruparGpKpiPorDia,
  agruparGpKpiPorJogo,
  GP_KPI_JOGOS_ORDEM,
  SHUFFLER_KPI_JOGOS_ORDEM,
  type GpKpiDiarioRow,
  type GpKpiJogoLinha,
} from "../../../lib/gpKpiMetrics";
import { GAME_IDENTITY_LABEL, type GameIdentityKey } from "../../../lib/gameIdentityColors";
import type { MesCarrosselEscalaEntry } from "../../../lib/escalaMesCarrosselOverviewStyle";
import type { OverviewPrestadorKpisMesaMode } from "../../../lib/overviewPrestadorTeamConfig";

type MesaEmbed = {
  nome_mesa?: string | null;
  tipo_jogo?: string | null;
} | null;

type RowDb = {
  dia_brt: string;
  table_id: string;
  game_presenter_id: string;
  funcionario_id?: string;
  mesa_id: string | null;
  estudio_slug: string | null;
  rodadas: number;
  dealing_ms_soma: number;
  dealing_amostras: number;
  reaction_ms_soma: number;
  reaction_amostras: number;
  coop_velocidade: number;
  coop_roda: number;
  mesas_spin_cadastro: MesaEmbed | MesaEmbed[];
};

export type GpKpiJogoComIncidentes = GpKpiJogoLinha & { incidentes: number };

export type GpKpiDiaComIncidentes = {
  dia_brt: string;
  rodadas: number;
  totalIncidentes: number;
  casos: number;
  erros: number;
  outros: number;
};

function unwrapMesa(embed: MesaEmbed | MesaEmbed[]): MesaEmbed {
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

function mapRows(data: RowDb[]): GpKpiDiarioRow[] {
  return data.map((r) => {
    const mesa = unwrapMesa(r.mesas_spin_cadastro);
    return {
      dia_brt: String(r.dia_brt ?? "").slice(0, 10),
      table_id: String(r.table_id ?? "").trim(),
      game_presenter_id: String(r.game_presenter_id ?? "").trim(),
      mesa_id: r.mesa_id,
      estudio_slug: r.estudio_slug,
      rodadas: Number(r.rodadas) || 0,
      dealing_ms_soma: Number(r.dealing_ms_soma) || 0,
      dealing_amostras: Number(r.dealing_amostras) || 0,
      reaction_ms_soma: Number(r.reaction_ms_soma) || 0,
      reaction_amostras: Number(r.reaction_amostras) || 0,
      coop_velocidade: Number(r.coop_velocidade) || 0,
      coop_roda: Number(r.coop_roda) || 0,
      nome_mesa: mesa?.nome_mesa ?? null,
      tipo_jogo: mesa?.tipo_jogo ?? null,
    };
  });
}

async function fetchGpKpiPeriodo(
  funcionarioIds: string[],
  dataIni: string,
  dataFim: string,
): Promise<GpKpiDiarioRow[]> {
  const ids = [...new Set(funcionarioIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return [];
  const rows = await fetchAllPages<RowDb>(async (from, to) => {
    const { data, error } = await supabase
      .from("gp_kpi_diario")
      .select(
        "dia_brt, table_id, game_presenter_id, mesa_id, estudio_slug, rodadas, dealing_ms_soma, dealing_amostras, reaction_ms_soma, reaction_amostras, coop_velocidade, coop_roda, mesas_spin_cadastro(nome_mesa, tipo_jogo)",
      )
      .in("funcionario_id", ids)
      .gte("dia_brt", dataIni)
      .lte("dia_brt", dataFim)
      .order("dia_brt", { ascending: true })
      .range(from, to);
    return { data, error };
  });
  return mapRows(rows);
}

function metricasPorJogoMap(rows: GpKpiDiarioRow[]): Map<GameIdentityKey, GpKpiJogoLinha> {
  const map = new Map<GameIdentityKey, GpKpiJogoLinha>();
  for (const row of agruparGpKpiPorJogo(rows)) map.set(row.jogoKey, row);
  return map;
}

function linhaJogoVazia(key: GameIdentityKey): GpKpiJogoLinha {
  return {
    jogoKey: key,
    jogoLabel: GAME_IDENTITY_LABEL[key],
    rodadas: 0,
    dealingSeg: null,
    reactionSeg: null,
    coopVelPct: null,
    coopRodaPct: null,
  };
}

function mergePorJogoGp(
  rowsKpi: GpKpiDiarioRow[],
  incRows: EstudioIncidenteRow[],
): GpKpiJogoComIncidentes[] {
  const kpiMap = metricasPorJogoMap(rowsKpi);
  const incPorJogo = contarIncidentesPorJogo(incRows);
  const keys = jogosComDadosOuIncidentes(new Set(kpiMap.keys()), incPorJogo, GP_KPI_JOGOS_ORDEM);
  return keys.map((key) => {
    const base = kpiMap.get(key) ?? linhaJogoVazia(key);
    return { ...base, incidentes: incPorJogo[key] ?? 0 };
  });
}

function mergePorDia(
  rowsKpi: GpKpiDiarioRow[],
  incRows: EstudioIncidenteRow[],
): GpKpiDiaComIncidentes[] {
  const kpiPorDia = new Map(agruparGpKpiPorDia(rowsKpi).map((d) => [d.dia_brt, d.rodadas]));
  const incPorDia = new Map(agruparIncidentesPorDia(incRows).map((d) => [d.dia, d]));
  const dias = new Set([...kpiPorDia.keys(), ...incPorDia.keys()]);
  return [...dias]
    .sort((a, b) => b.localeCompare(a))
    .map((dia) => {
      const inc = incPorDia.get(dia) ?? { ...INCIDENTE_AGG_ZERO, dia };
      return {
        dia_brt: dia,
        rodadas: kpiPorDia.get(dia) ?? 0,
        totalIncidentes: inc.total,
        casos: inc.casos,
        erros: inc.erros,
        outros: inc.outros,
      };
    });
}

export function useOverviewPrestadorGpKpi(opts: {
  enabled: boolean;
  /** Um ou vários prestadores (visão individual ou time). */
  funcionarioIds: string[];
  prestadores: { id: string; nome: string }[];
  mesSelecionado: MesCarrosselEscalaEntry | undefined;
  historico: boolean;
  mode: OverviewPrestadorKpisMesaMode;
}) {
  const { enabled, funcionarioIds, prestadores, mesSelecionado, historico, mode } = opts;
  const carregaKpiGrafana = mode === "gp";
  const carregaIncidentes = mode === "gp" || mode === "shuffler";

  const [rowsAtual, setRowsAtual] = useState<GpKpiDiarioRow[]>([]);
  const [rowsAnt, setRowsAnt] = useState<GpKpiDiarioRow[]>([]);
  const [incAtual, setIncAtual] = useState<EstudioIncidenteRow[]>([]);
  const [incAnterior, setIncAnterior] = useState<EstudioIncidenteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const idsKey = funcionarioIds.slice().sort().join("|");

  useEffect(() => {
    if (!enabled || funcionarioIds.length === 0 || (!historico && !mesSelecionado) || !carregaIncidentes) {
      setRowsAtual([]);
      setRowsAnt([]);
      setIncAtual([]);
      setIncAnterior([]);
      setLoading(false);
      setErro(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErro(null);

    void (async () => {
      try {
        const fetchPar = async (ini: string, fim: string) => {
          const [kpi, inc] = await Promise.all([
            carregaKpiGrafana ? fetchGpKpiPeriodo(funcionarioIds, ini, fim) : Promise.resolve([] as GpKpiDiarioRow[]),
            fetchEstudioIncidentesPrestadoresPeriodo({
              prestadorIds: funcionarioIds,
              dataIni: ini,
              dataFim: fim,
            }),
          ]);
          return { kpi, inc };
        };

        if (historico) {
          const { inicio, fim } = getPeriodoHistoricoCompetencias();
          const { kpi, inc } = await fetchPar(inicio, fim);
          if (cancelled) return;
          setRowsAtual(kpi);
          setRowsAnt([]);
          setIncAtual(inc);
          setIncAnterior([]);
        } else if (mesSelecionado) {
          const mom = getPeriodoComparativoMesCompleto(mesSelecionado.ano, mesSelecionado.mes);
          const [atual, ant] = await Promise.all([
            fetchPar(mom.atual.inicio, mom.atual.fim),
            fetchPar(mom.anterior.inicio, mom.anterior.fim),
          ]);
          if (cancelled) return;
          setRowsAtual(atual.kpi);
          setRowsAnt(ant.kpi);
          setIncAtual(atual.inc);
          setIncAnterior(ant.inc);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setRowsAtual([]);
          setRowsAnt([]);
          setIncAtual([]);
          setIncAnterior([]);
          setErro(
            "Não foi possível carregar os KPIs de mesa. Se o problema persistir, entre em contato com o suporte.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // idsKey cobre funcionarioIds sem recriar array a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey
  }, [enabled, idsKey, mesSelecionado, historico, carregaKpiGrafana, carregaIncidentes]);

  const agregado = useMemo(() => agregarGpKpiRows(rowsAtual), [rowsAtual]);
  const aggAnterior = useMemo(() => agregarGpKpiRows(rowsAnt), [rowsAnt]);

  const porJogoAtual = useMemo(() => metricasPorJogoMap(rowsAtual), [rowsAtual]);
  const porJogoAnterior = useMemo(() => metricasPorJogoMap(rowsAnt), [rowsAnt]);

  const metricasJogo = useMemo(() => {
    const out: Record<
      GameIdentityKey,
      { atual: GpKpiJogoLinha; anterior: GpKpiJogoLinha }
    > = {} as Record<GameIdentityKey, { atual: GpKpiJogoLinha; anterior: GpKpiJogoLinha }>;
    for (const key of GP_KPI_JOGOS_ORDEM) {
      out[key] = {
        atual: porJogoAtual.get(key) ?? linhaJogoVazia(key),
        anterior: porJogoAnterior.get(key) ?? linhaJogoVazia(key),
      };
    }
    return out;
  }, [porJogoAtual, porJogoAnterior]);

  const incidentesAgg: IncidenteAggContagem = useMemo(
    () => agregarContagemIncidentes(incAtual),
    [incAtual],
  );
  const incidentesAggAnt: IncidenteAggContagem = useMemo(
    () => agregarContagemIncidentes(incAnterior),
    [incAnterior],
  );

  const porJogoGp = useMemo(() => mergePorJogoGp(rowsAtual, incAtual), [rowsAtual, incAtual]);
  const porJogoShuffler: IncidenteJogoLinha[] = useMemo(
    () => agruparIncidentesPorJogo(incAtual, SHUFFLER_KPI_JOGOS_ORDEM),
    [incAtual],
  );
  const porDia = useMemo(() => mergePorDia(rowsAtual, incAtual), [rowsAtual, incAtual]);
  const porDiaShuffler = useMemo(() => agruparIncidentesPorDia(incAtual), [incAtual]);

  const pontosAtencao: IncidentePrestadorLinha[] = useMemo(
    () => agruparIncidentesPorPrestador(incAtual, prestadores),
    [incAtual, prestadores],
  );

  return {
    loading,
    erro,
    agregado,
    aggAnterior,
    metricasJogo,
    incidentesAgg,
    incidentesAggAnt,
    porDia,
    porDiaShuffler,
    porJogo: porJogoGp,
    porJogoShuffler,
    pontosAtencao,
    temDados: rowsAtual.length > 0 || incAtual.length > 0,
  };
}
