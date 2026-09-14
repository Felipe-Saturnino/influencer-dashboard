import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { statusVagaEfetivo } from "../../../../lib/rhVagasFormat";
import { revisaoCadastralPendenteParaFuncionario } from "../../../../lib/rhCadastroRevisao";
import {
  PRESTADOR_LISTA_SELECT,
  prestadorCadastroIncompleto,
} from "../../../rh/GestaoPrestador/gestaoPrestadorHelpers";
import type { RhFuncionario } from "../../../../types/rhFuncionario";
import type { RhVagaRow } from "../../../../types/rhVaga";

export type HomeGestorRhAlertas = {
  solicitacoesEmAnalise: number;
  denunciasAbertas: number;
};

export type HomeGestorRhKpis = {
  prestadores: {
    total: number;
    cadastroIncompleto: number;
    revisaoPendente: number;
    cadastroCompleto: number;
  };
  filas: {
    solicitacoesEmAnalise: number;
    vagasAbertas: number;
    candidaturasAtivas: number;
    denunciasAbertas: number;
  };
};

export function useHomeGestorRhData() {
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState(false);
  const [alertas, setAlertas] = useState<HomeGestorRhAlertas>({
    solicitacoesEmAnalise: 0,
    denunciasAbertas: 0,
  });
  const [kpis, setKpis] = useState<HomeGestorRhKpis | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setReady(false);
      setErro(false);
      try {
        const [funcs, solRes, denRel, denAval, vagas, cands, orgCount] = await Promise.all([
          fetchAllPages<RhFuncionario>(async (from, to) => {
            const res = await supabase
              .from("rh_funcionarios")
              .select(PRESTADOR_LISTA_SELECT)
              .in("status", ["ativo", "indisponivel", "encerrado"])
              .order("nome")
              .range(from, to);
            return { data: (res.data as unknown as RhFuncionario[]) ?? [], error: res.error };
          }),
          supabase
            .from("rh_solicitacoes")
            .select("id", { count: "exact", head: true })
            .eq("status", "em_analise"),
          supabase
            .from("canal_denuncias_spin")
            .select("id", { count: "exact", head: true })
            .eq("status", "relatado"),
          supabase
            .from("canal_denuncias_spin")
            .select("id", { count: "exact", head: true })
            .eq("status", "em_avaliacao"),
          fetchAllPages<Pick<RhVagaRow, "id" | "status" | "data_fim_inscricoes">>(async (from, to) =>
            supabase.from("rh_vagas").select("id, status, data_fim_inscricoes").range(from, to),
          ),
          supabase
            .from("rh_vaga_candidaturas")
            .select("id", { count: "exact", head: true })
            .not("etapa", "in", "(contratado,dispensado)"),
          supabase.from("rh_org_times").select("id", { count: "exact", head: true }),
        ]);

        if (cancelled) return;

        const temOrganograma = (orgCount.count ?? 0) > 0;
        const total = funcs.length;
        const cadastroIncompleto = funcs.filter((r) =>
          prestadorCadastroIncompleto(r, temOrganograma),
        ).length;
        const revisaoPendente = funcs.filter((r) => revisaoCadastralPendenteParaFuncionario(r)).length;
        const cadastroCompleto = Math.max(0, total - cadastroIncompleto);

        const solicitacoesEmAnalise = solRes.count ?? 0;
        const denunciasAbertas = (denRel.count ?? 0) + (denAval.count ?? 0);
        const vagasAbertas = vagas.filter((v) => statusVagaEfetivo(v) === "aberta").length;
        const candidaturasAtivas = cands.error ? 0 : (cands.count ?? 0);

        setAlertas({ solicitacoesEmAnalise, denunciasAbertas });
        setKpis({
          prestadores: { total, cadastroIncompleto, revisaoPendente, cadastroCompleto },
          filas: {
            solicitacoesEmAnalise,
            vagasAbertas,
            candidaturasAtivas,
            denunciasAbertas,
          },
        });
      } catch (e) {
        console.error("[HomeGestorRh] carga:", e);
        if (!cancelled) setErro(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, erro, alertas, kpis };
}
