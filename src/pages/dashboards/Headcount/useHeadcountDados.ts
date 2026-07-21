import { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissaoValor } from "../../../types";
import type { RhAreaAtuacao, RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import type { RhVagaStatus } from "../../../types/rhVaga";
import { MESES_PT } from "../../../lib/dashboardConstants";
import {
  getDatasDoMes,
  getIdxMesCarrosselPadrao,
  getMesesDisponiveis,
  getPeriodoHistoricoCompetencias,
  HISTORICO_COMPETENCIAS_MESES,
} from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";
import { statusVagaEfetivo } from "../../../lib/rhVagasFormat";
import {
  computarMetricasHeadcount,
  filtrarFuncionarios,
  type HeadcountDiretoriaRef,
  type HeadcountFuncionarioRow,
  type HeadcountMetricas,
  type HeadcountTerminoRow,
  type HeadcountVagaRow,
} from "../../../lib/headcountMetrics";

function statusVagaHeadcount(v: Pick<HeadcountVagaRow, "status" | "data_fim_inscricoes">): string {
  return statusVagaEfetivo({
    status: v.status as RhVagaStatus,
    data_fim_inscricoes: v.data_fim_inscricoes ?? "",
  });
}

function parseTerminos(
  rows: { rh_funcionario_id: string; detalhes: Record<string, unknown> | null }[],
): HeadcountTerminoRow[] {
  return rows.map((r) => {
    const d = r.detalhes ?? {};
    const dataRaw = typeof d.data_termino === "string" ? d.data_termino.slice(0, 10) : null;
    const tipoRaw = d.tipo_termino;
    const tipo_termino =
      tipoRaw === "voluntario" || tipoRaw === "nao_voluntario" ? tipoRaw : null;
    return { rh_funcionario_id: r.rh_funcionario_id, data_termino: dataRaw, tipo_termino };
  });
}

export function useHeadcountDados(canView: PermissaoValor, permLoading: boolean) {
  const incluirCusto = canView === "sim";

  const meses = useMemo(() => getMesesDisponiveis(), []);
  const [idxMes, setIdxMes] = useState(() => getIdxMesCarrosselPadrao(meses));
  const [historico, setHistorico] = useState(false);

  const [filtroDiretoria, setFiltroDiretoria] = useState("todas");
  const [filtroArea, setFiltroArea] = useState<RhAreaAtuacao | "todas">("todas");
  const [filtroContrato, setFiltroContrato] = useState<RhFuncionarioTipoContrato | "todos">("todos");

  const [funcionarios, setFuncionarios] = useState<HeadcountFuncionarioRow[]>([]);
  const [terminos, setTerminos] = useState<HeadcountTerminoRow[]>([]);
  const [vagas, setVagas] = useState<HeadcountVagaRow[]>([]);
  const [diretorias, setDiretorias] = useState<HeadcountDiretoriaRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const mesSelecionado = meses[idxMes] ?? meses[meses.length - 1];

  const carregar = useCallback(async () => {
    if (permLoading || canView === "nao") return;
    setLoading(true);
    setErro(null);
    try {
      const fr = incluirCusto
        ? await supabase
            .from("rh_funcionarios")
            .select(
              "id, status, nome, tipo_contrato, area_atuacao, org_diretoria_id, org_gerencia_id, org_time_id, data_inicio, data_desligamento, data_funcao, origem_contratacao, salario, remuneracao_hora_centavos",
            )
            .order("nome")
            .limit(5000)
        : await supabase
            .from("rh_funcionarios")
            .select(
              "id, status, nome, tipo_contrato, area_atuacao, org_diretoria_id, org_gerencia_id, org_time_id, data_inicio, data_desligamento, data_funcao, origem_contratacao",
            )
            .order("nome")
            .limit(5000);

      const [hr, vr, dr] = await Promise.all([
        supabase
          .from("rh_funcionario_historico")
          .select("rh_funcionario_id, detalhes")
          .eq("tipo", "termino_prestacao")
          .limit(5000),
        supabase
          .from("rh_vagas")
          .select("id, status, data_fim_inscricoes, org_diretoria_id, data_abertura")
          .order("data_abertura", { ascending: false })
          .limit(200),
        supabase.from("rh_org_diretorias").select("id, nome").eq("status", "ativo").order("nome"),
      ]);

      if (fr.error || hr.error || vr.error || dr.error) {
        console.error(fr.error ?? hr.error ?? vr.error ?? dr.error);
        setErro("Não foi possível carregar o Headcount. Se o problema persistir, entre em contato com o suporte.");
        setFuncionarios([]);
        setTerminos([]);
        setVagas([]);
        setDiretorias([]);
        return;
      }

      setFuncionarios((fr.data ?? []) as unknown as HeadcountFuncionarioRow[]);
      setTerminos(parseTerminos((hr.data ?? []) as { rh_funcionario_id: string; detalhes: Record<string, unknown> | null }[]));
      setVagas((vr.data ?? []) as unknown as HeadcountVagaRow[]);
      setDiretorias((dr.data ?? []) as HeadcountDiretoriaRef[]);
    } finally {
      setLoading(false);
    }
  }, [canView, incluirCusto, permLoading]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const periodo = useMemo(() => {
    if (historico) {
      const { inicio, fim } = getPeriodoHistoricoCompetencias();
      return { inicio, fim };
    }
    if (!mesSelecionado) {
      const hoje = new Date();
      return getDatasDoMes(hoje.getFullYear(), hoje.getMonth());
    }
    return getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
  }, [historico, mesSelecionado]);

  const funcionariosFiltrados = useMemo(
    () =>
      filtrarFuncionarios(funcionarios, {
        diretoriaId: filtroDiretoria,
        area: filtroArea,
        contrato: filtroContrato,
      }),
    [funcionarios, filtroDiretoria, filtroArea, filtroContrato],
  );

  const vagasFiltradas = useMemo(() => {
    if (filtroDiretoria === "todas") return vagas;
    return vagas.filter((v) => v.org_diretoria_id === filtroDiretoria);
  }, [vagas, filtroDiretoria]);

  const mesesSerie = useMemo(() => {
    const ref = new Date();
    const lista: { ano: number; mes: number; label: string; inicio: string; fim: string }[] = [];
    for (let i = HISTORICO_COMPETENCIAS_MESES - 1; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mes = d.getMonth();
      const { inicio, fim } = getDatasDoMes(ano, mes);
      lista.push({
        ano,
        mes,
        label: `${MESES_PT[mes].slice(0, 3)}/${String(ano).slice(2)}`,
        inicio,
        fim,
      });
    }
    return lista;
  }, []);

  const metricas: HeadcountMetricas = useMemo(
    () =>
      computarMetricasHeadcount({
        funcionarios: funcionariosFiltrados,
        terminos,
        vagas: vagasFiltradas,
        diretorias,
        periodo,
        mesesSerie,
        statusVagaEfetivo: statusVagaHeadcount,
        incluirCusto,
      }),
    [funcionariosFiltrados, terminos, vagasFiltradas, diretorias, periodo, mesesSerie, incluirCusto],
  );

  const periodoAnterior = useMemo(() => {
    if (historico) return null;
    const d = new Date(`${periodo.inicio}T12:00:00`);
    d.setMonth(d.getMonth() - 1);
    return getDatasDoMes(d.getFullYear(), d.getMonth());
  }, [historico, periodo.inicio]);

  const metricasAnterior: HeadcountMetricas | null = useMemo(() => {
    if (!periodoAnterior) return null;
    return computarMetricasHeadcount({
      funcionarios: funcionariosFiltrados,
      terminos,
      vagas: vagasFiltradas,
      diretorias,
      periodo: periodoAnterior,
      mesesSerie,
      statusVagaEfetivo: statusVagaHeadcount,
      incluirCusto,
    });
  }, [periodoAnterior, funcionariosFiltrados, terminos, vagasFiltradas, diretorias, mesesSerie, incluirCusto]);

  const toggleHistorico = () => {
    setHistorico((h) => {
      if (h) setIdxMes(getIdxMesCarrosselPadrao(meses));
      return !h;
    });
  };

  return {
    loading,
    erro,
    incluirCusto,
    historico,
    toggleHistorico,
    meses,
    idxMes,
    mesSelecionado,
    isPrimeiro: idxMes <= 0,
    isUltimo: idxMes >= meses.length - 1,
    irMesAnterior: () => setIdxMes((i) => Math.max(0, i - 1)),
    irMesProximo: () => setIdxMes((i) => Math.min(meses.length - 1, i + 1)),
    filtroDiretoria,
    setFiltroDiretoria,
    filtroArea,
    setFiltroArea,
    filtroContrato,
    setFiltroContrato,
    diretorias,
    metricas,
    metricasAnterior,
    periodo,
    recarregar: carregar,
  };
}
