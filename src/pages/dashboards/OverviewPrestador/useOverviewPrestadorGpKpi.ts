import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import {
  getPeriodoComparativoMoM,
  getPeriodoHistoricoCompetencias,
} from "../../../lib/dashboardHelpers";
import {
  agregarGpKpiRows,
  agruparGpKpiPorDia,
  agruparGpKpiPorMesa,
  GP_KPI_AGREGADO_ZERO,
  type GpKpiAgregado,
  type GpKpiDiarioRow,
} from "../../../lib/gpKpiMetrics";
import type { MesCarrosselEscalaEntry } from "../../../lib/escalaMesCarrosselOverviewStyle";

type MesaEmbed = {
  nome_mesa?: string | null;
  tipo_jogo?: string | null;
} | null;

type RowDb = {
  dia_brt: string;
  table_id: string;
  game_presenter_id: string;
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
  funcionarioId: string,
  dataIni: string,
  dataFim: string,
): Promise<GpKpiDiarioRow[]> {
  const rows = await fetchAllPages<RowDb>(async (from, to) => {
    const { data, error } = await supabase
      .from("gp_kpi_diario")
      .select(
        "dia_brt, table_id, game_presenter_id, mesa_id, estudio_slug, rodadas, dealing_ms_soma, dealing_amostras, reaction_ms_soma, reaction_amostras, coop_velocidade, coop_roda, mesas_spin_cadastro(nome_mesa, tipo_jogo)",
      )
      .eq("funcionario_id", funcionarioId)
      .gte("dia_brt", dataIni)
      .lte("dia_brt", dataFim)
      .order("dia_brt", { ascending: true })
      .range(from, to);
    return { data, error };
  });
  return mapRows(rows);
}

export function useOverviewPrestadorGpKpi(opts: {
  enabled: boolean;
  funcionarioId: string | null;
  mesSelecionado: MesCarrosselEscalaEntry | undefined;
  historico: boolean;
}) {
  const { enabled, funcionarioId, mesSelecionado, historico } = opts;
  const [rowsAtual, setRowsAtual] = useState<GpKpiDiarioRow[]>([]);
  const [aggAnterior, setAggAnterior] = useState<GpKpiAgregado>(GP_KPI_AGREGADO_ZERO);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !funcionarioId || (!historico && !mesSelecionado)) {
      setRowsAtual([]);
      setAggAnterior(GP_KPI_AGREGADO_ZERO);
      setLoading(false);
      setErro(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErro(null);

    void (async () => {
      try {
        if (historico) {
          const { inicio, fim } = getPeriodoHistoricoCompetencias();
          const rows = await fetchGpKpiPeriodo(funcionarioId, inicio, fim);
          if (cancelled) return;
          setRowsAtual(rows);
          setAggAnterior(GP_KPI_AGREGADO_ZERO);
        } else if (mesSelecionado) {
          const mom = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
          const [atual, ant] = await Promise.all([
            fetchGpKpiPeriodo(funcionarioId, mom.atual.inicio, mom.atual.fim),
            fetchGpKpiPeriodo(funcionarioId, mom.anterior.inicio, mom.anterior.fim),
          ]);
          if (cancelled) return;
          setRowsAtual(atual);
          setAggAnterior(agregarGpKpiRows(ant));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setRowsAtual([]);
          setAggAnterior(GP_KPI_AGREGADO_ZERO);
          setErro("Não foi possível carregar os KPIs de mesa. Se o problema persistir, entre em contato com o suporte.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, funcionarioId, mesSelecionado, historico]);

  const agregado = useMemo(() => agregarGpKpiRows(rowsAtual), [rowsAtual]);
  const porDia = useMemo(() => agruparGpKpiPorDia(rowsAtual), [rowsAtual]);
  const porMesa = useMemo(() => agruparGpKpiPorMesa(rowsAtual), [rowsAtual]);

  return {
    loading,
    erro,
    agregado,
    aggAnterior,
    porDia,
    porMesa,
    temDados: rowsAtual.length > 0,
  };
}
