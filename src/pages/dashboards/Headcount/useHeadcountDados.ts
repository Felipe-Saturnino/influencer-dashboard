import { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissaoValor } from "../../../types";
import {
  getDatasDoMes,
  getIdxMesCarrosselPadrao,
  getMesesDisponiveis,
} from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import { encontrarVinculoParaFuncionarioRow, flattenVinculosDeGrupos } from "../../../lib/rhOrganogramaTree";
import {
  labelStatusVaga,
  labelTipoVaga,
  statusVagaEfetivo,
} from "../../../lib/rhVagasFormat";
import {
  computarDistrato,
  computarOverview,
  computarOverviewHistorico,
  computarVagas,
  filtrarPorDiretoria,
  isoDia,
  periodoHeadcountHistorico,
  type HeadcountCandidaturaRow,
  type HeadcountDiretoriaRef,
  type HeadcountDistratoMetricas,
  type HeadcountFuncionarioRow,
  type HeadcountOverviewHistoricoMetricas,
  type HeadcountOverviewMetricas,
  type HeadcountTerminoRow,
  type HeadcountVagaRow,
  type HeadcountVagasMetricas,
} from "../../../lib/headcountMetrics";

export type HeadcountTab = "overview" | "vagas" | "distrato";

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

function organogramaLabelDeEmbed(v: {
  org_time?: { nome?: string; gerencia?: { nome?: string; diretoria?: { nome?: string } } } | null;
  org_gerencia?: { nome?: string; diretoria?: { nome?: string } } | null;
  org_diretoria?: { nome?: string } | null;
}): string {
  const t = v.org_time;
  if (t?.nome) {
    const g = t.gerencia?.nome?.trim();
    const d = t.gerencia?.diretoria?.nome?.trim();
    if (d && g) return `${d} › ${g} › ${t.nome}`;
    if (g) return `${g} › ${t.nome}`;
    return t.nome;
  }
  const ger = v.org_gerencia;
  if (ger?.nome) {
    const d = ger.diretoria?.nome?.trim();
    return d ? `${d} › ${ger.nome}` : ger.nome;
  }
  return v.org_diretoria?.nome?.trim() || "—";
}

export function useHeadcountDados(canView: PermissaoValor, permLoading: boolean) {
  const meses = useMemo(() => getMesesDisponiveis(), []);
  const [idxMes, setIdxMes] = useState(() => getIdxMesCarrosselPadrao(meses));
  const [historico, setHistorico] = useState(false);
  const [filtroDiretoria, setFiltroDiretoria] = useState("todas");

  const [funcionarios, setFuncionarios] = useState<HeadcountFuncionarioRow[]>([]);
  const [terminos, setTerminos] = useState<HeadcountTerminoRow[]>([]);
  const [vagas, setVagas] = useState<HeadcountVagaRow[]>([]);
  const [candidaturas, setCandidaturas] = useState<HeadcountCandidaturaRow[]>([]);
  const [diretorias, setDiretorias] = useState<HeadcountDiretoriaRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const mesSelecionado = meses[idxMes] ?? meses[meses.length - 1];

  const carregar = useCallback(async () => {
    if (permLoading || canView === "nao") return;
    setLoading(true);
    setErro(null);
    try {
      const [fr, hr, vr, cr, org] = await Promise.all([
        supabase
          .from("rh_funcionarios")
          .select(
            "id, status, nome, tipo_contrato, area_atuacao, org_diretoria_id, org_gerencia_id, org_time_id, data_inicio, data_desligamento",
          )
          .order("nome")
          .limit(5000),
        supabase
          .from("rh_funcionario_historico")
          .select("rh_funcionario_id, detalhes")
          .eq("tipo", "termino_prestacao")
          .limit(5000),
        supabase
          .from("rh_vagas")
          .select(
            `
            id, titulo, tipo_vaga, status, data_abertura, data_fim_inscricoes,
            org_diretoria_id, org_gerencia_id, org_time_id, repasse_inicial_centavos,
            org_time:rh_org_times (
              id, nome,
              gerencia:rh_org_gerencias (
                id, nome,
                diretoria:rh_org_diretorias ( id, nome )
              )
            ),
            org_gerencia:rh_org_gerencias (
              id, nome,
              diretoria:rh_org_diretorias ( id, nome )
            ),
            org_diretoria:rh_org_diretorias ( id, nome )
          `,
          )
          .order("data_abertura", { ascending: false })
          .limit(200),
        supabase.from("rh_vaga_candidaturas").select("id, vaga_id, etapa, origem").limit(5000),
        carregarOpcoesTimesOrganograma(),
      ]);

      if (fr.error || hr.error || vr.error || cr.error || org.error) {
        console.error(fr.error ?? hr.error ?? vr.error ?? cr.error ?? org.error);
        setErro("Não foi possível carregar o Headcount. Se o problema persistir, entre em contato com o suporte.");
        setFuncionarios([]);
        setTerminos([]);
        setVagas([]);
        setCandidaturas([]);
        setDiretorias([]);
        return;
      }

      const vinculos = flattenVinculosDeGrupos(org.grupos);
      const dirsMap = new Map<string, string>();
      for (const v of vinculos) {
        if (v.diretoriaId && v.diretoriaNome) dirsMap.set(v.diretoriaId, v.diretoriaNome);
      }
      const dirs: HeadcountDiretoriaRef[] = [...dirsMap.entries()]
        .map(([id, nome]) => ({ id, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      setDiretorias(dirs);

      const funcs = ((fr.data ?? []) as Omit<
        HeadcountFuncionarioRow,
        "orgLabelMenor" | "gerenciaNome" | "timeNome"
      >[]).map((r) => {
        const v = encontrarVinculoParaFuncionarioRow(r, vinculos);
        const orgLabelMenor =
          v?.timeNome?.trim() ||
          v?.gerenciaNome?.trim() ||
          v?.diretoriaNome?.trim() ||
          "—";
        const gerenciaNome = v?.gerenciaNome?.trim() || "Sem gerência";
        const timeNome = v?.timeNome?.trim() || "";
        return { ...r, orgLabelMenor, gerenciaNome, timeNome };
      });
      setFuncionarios(funcs);
      setTerminos(parseTerminos((hr.data ?? []) as { rh_funcionario_id: string; detalhes: Record<string, unknown> | null }[]));

      const vagasMapped: HeadcountVagaRow[] = ((vr.data ?? []) as Record<string, unknown>[]).map((raw) => {
        const row = raw as HeadcountVagaRow & {
          org_time?: HeadcountVagaRow extends never ? never : unknown;
          org_gerencia?: unknown;
          org_diretoria?: unknown;
        };
        return {
          id: String(raw.id),
          titulo: String(raw.titulo ?? ""),
          tipo_vaga: String(raw.tipo_vaga ?? ""),
          status: String(raw.status ?? ""),
          data_abertura: isoDia(raw.data_abertura as string | null),
          data_fim_inscricoes: isoDia(raw.data_fim_inscricoes as string | null),
          org_diretoria_id: (raw.org_diretoria_id as string | null) ?? null,
          org_gerencia_id: (raw.org_gerencia_id as string | null) ?? null,
          org_time_id: (raw.org_time_id as string | null) ?? null,
          organogramaLabel: organogramaLabelDeEmbed(row as Parameters<typeof organogramaLabelDeEmbed>[0]),
          repasse_inicial_centavos:
            raw.repasse_inicial_centavos == null ? null : Number(raw.repasse_inicial_centavos),
        };
      });
      setVagas(vagasMapped);
      setCandidaturas((cr.data ?? []) as HeadcountCandidaturaRow[]);
    } finally {
      setLoading(false);
    }
  }, [canView, permLoading]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const periodo = useMemo(() => {
    if (!mesSelecionado) {
      const hoje = new Date();
      return getDatasDoMes(hoje.getFullYear(), hoje.getMonth());
    }
    return getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
  }, [mesSelecionado]);

  const mesRefHistorico = useMemo(() => {
    const idx = getIdxMesCarrosselPadrao(meses);
    return meses[idx] ?? meses[meses.length - 1] ?? { ano: new Date().getFullYear(), mes: new Date().getMonth() };
  }, [meses]);

  const periodoHistorico = useMemo(
    () => periodoHeadcountHistorico(mesRefHistorico.ano, mesRefHistorico.mes),
    [mesRefHistorico.ano, mesRefHistorico.mes],
  );

  const periodoAtivo = historico ? periodoHistorico : periodo;

  const periodoAnterior = useMemo(() => {
    const d = new Date(`${periodo.inicio}T12:00:00`);
    d.setMonth(d.getMonth() - 1);
    return getDatasDoMes(d.getFullYear(), d.getMonth());
  }, [periodo.inicio]);

  const funcionariosFiltrados = useMemo(
    () => filtrarPorDiretoria(funcionarios, filtroDiretoria),
    [funcionarios, filtroDiretoria],
  );
  const vagasFiltradas = useMemo(
    () => filtrarPorDiretoria(vagas, filtroDiretoria),
    [vagas, filtroDiretoria],
  );

  const overview: HeadcountOverviewMetricas = useMemo(
    () => computarOverview(funcionariosFiltrados, periodo),
    [funcionariosFiltrados, periodo],
  );
  const overviewAnt: HeadcountOverviewMetricas = useMemo(
    () => computarOverview(funcionariosFiltrados, periodoAnterior),
    [funcionariosFiltrados, periodoAnterior],
  );
  const overviewHistorico: HeadcountOverviewHistoricoMetricas = useMemo(
    () => computarOverviewHistorico(funcionariosFiltrados, mesRefHistorico.ano, mesRefHistorico.mes),
    [funcionariosFiltrados, mesRefHistorico.ano, mesRefHistorico.mes],
  );

  const vagasMetricas: HeadcountVagasMetricas = useMemo(
    () =>
      computarVagas({
        vagas: vagasFiltradas,
        candidaturas,
        periodo: periodoAtivo,
        statusVagaEfetivo: (v) =>
          statusVagaEfetivo({
            status: v.status as "aberta" | "em_andamento" | "concluida" | "cancelada",
            data_fim_inscricoes: v.data_fim_inscricoes ?? "",
          }),
        labelStatusVaga: (s) => labelStatusVaga(s as "aberta" | "em_andamento" | "concluida" | "cancelada"),
        labelTipoVaga: (t) => labelTipoVaga(t as "interna" | "externa" | "mista"),
      }),
    [vagasFiltradas, candidaturas, periodoAtivo],
  );
  const vagasAnt: HeadcountVagasMetricas = useMemo(
    () =>
      computarVagas({
        vagas: vagasFiltradas,
        candidaturas,
        periodo: periodoAnterior,
        statusVagaEfetivo: (v) =>
          statusVagaEfetivo({
            status: v.status as "aberta" | "em_andamento" | "concluida" | "cancelada",
            data_fim_inscricoes: v.data_fim_inscricoes ?? "",
          }),
        labelStatusVaga: (s) => labelStatusVaga(s as "aberta" | "em_andamento" | "concluida" | "cancelada"),
        labelTipoVaga: (t) => labelTipoVaga(t as "interna" | "externa" | "mista"),
      }),
    [vagasFiltradas, candidaturas, periodoAnterior],
  );

  const distrato: HeadcountDistratoMetricas = useMemo(
    () => computarDistrato({ funcionarios: funcionariosFiltrados, terminos, periodo: periodoAtivo }),
    [funcionariosFiltrados, terminos, periodoAtivo],
  );
  const distratoAnt: HeadcountDistratoMetricas = useMemo(
    () => computarDistrato({ funcionarios: funcionariosFiltrados, terminos, periodo: periodoAnterior }),
    [funcionariosFiltrados, terminos, periodoAnterior],
  );

  const toggleHistorico = () => {
    setHistorico((h) => {
      if (h) setIdxMes(getIdxMesCarrosselPadrao(meses));
      return !h;
    });
  };

  return {
    loading,
    erro,
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
    diretorias,
    overview,
    overviewAnt,
    overviewHistorico,
    vagasMetricas,
    vagasAnt,
    distrato,
    distratoAnt,
  };
}
