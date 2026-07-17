import { queryClient } from "../../../lib/queryClient";
import { carregarPresencaGestaoMes } from "../../../lib/rhCalendarioPresencaGestaoDb";
import type { PresencaDiaGestao } from "../../../lib/rhCalendarioPresencaGestao";
import { supabase } from "../../../lib/supabase";
import type {
  RpcGradeCalendarioRow,
  RpcPontoMesRow,
} from "../../../lib/overviewPrestadorCalendarioHelpers";

const STALE_TIME_MENSAL = 5 * 60 * 1000;

export function fetchOverviewPrestadorGradeMes(refMes: string): Promise<RpcGradeCalendarioRow[]> {
  return queryClient.fetchQuery({
    queryKey: ["overview-prestador", "grade", refMes],
    staleTime: STALE_TIME_MENSAL,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rh_calendario_grade_escala_mes", {
        p_ref_mes: refMes,
      });
      if (error) throw error;
      return (data ?? []) as RpcGradeCalendarioRow[];
    },
  });
}

export function fetchOverviewPrestadorPontoMes(
  funcionarioId: string,
  refMes: string,
): Promise<RpcPontoMesRow[]> {
  return queryClient.fetchQuery({
    queryKey: ["overview-prestador", "ponto", funcionarioId, refMes],
    staleTime: STALE_TIME_MENSAL,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rh_calendario_ponto_registros_mes", {
        p_funcionario_id: funcionarioId,
        p_ref_mes: refMes,
      });
      if (error) throw error;
      return (data ?? []) as RpcPontoMesRow[];
    },
  });
}

export function fetchOverviewPrestadorPresencaMes(
  funcionarioId: string,
  refMes: string,
): Promise<Map<string, PresencaDiaGestao>> {
  return queryClient.fetchQuery({
    queryKey: ["overview-prestador", "presenca", funcionarioId, refMes],
    staleTime: STALE_TIME_MENSAL,
    queryFn: async () => {
      const { mapa, error } = await carregarPresencaGestaoMes(supabase, funcionarioId, refMes);
      if (error) throw error;
      return mapa;
    },
  });
}
