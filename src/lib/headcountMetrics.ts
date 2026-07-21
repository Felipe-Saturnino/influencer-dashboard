import type { RhAreaAtuacao, RhFuncionarioTipoContrato, RhOrigemContratacao } from "../types/rhFuncionario";
import type { RhVagaStatus } from "../types/rhVaga";

/** Carga horária mensal estimada para converter remuneração/hora (estúdio) em massa salarial. */
export const HEADCOUNT_HORAS_MES_ESTIMADAS = 180;

export type HeadcountFuncionarioRow = {
  id: string;
  status: "ativo" | "indisponivel" | "encerrado";
  nome: string;
  tipo_contrato: RhFuncionarioTipoContrato | string | null;
  area_atuacao: RhAreaAtuacao | string | null;
  org_diretoria_id: string | null;
  org_gerencia_id: string | null;
  org_time_id: string | null;
  data_inicio: string | null;
  data_desligamento: string | null;
  data_funcao: string | null;
  origem_contratacao: RhOrigemContratacao | string | null;
  salario?: number | null;
  remuneracao_hora_centavos?: number | null;
};

export type HeadcountTerminoRow = {
  rh_funcionario_id: string;
  data_termino: string | null;
  tipo_termino: "voluntario" | "nao_voluntario" | null;
};

export type HeadcountVagaRow = {
  id: string;
  status: RhVagaStatus | string;
  data_fim_inscricoes: string | null;
  org_diretoria_id: string | null;
  data_abertura: string | null;
};

export type HeadcountDiretoriaRef = { id: string; nome: string };

export type HeadcountPeriodo = { inicio: string; fim: string };

export type HeadcountSerieMensal = {
  ano: number;
  mes: number;
  label: string;
  hcAtivoFim: number;
  admissoes: number;
  desligamentos: number;
};

export type HeadcountMixItem = { key: string; label: string; valor: number };

export type HeadcountDiretoriaRow = {
  diretoriaId: string;
  diretoriaNome: string;
  hcAtivo: number;
  indisponiveis: number;
  admissoes: number;
  desligamentos: number;
  turnoverPct: number | null;
  massaSalarial: number | null;
  vagasAbertas: number;
};

export type HeadcountMetricas = {
  hcAtivo: number;
  indisponiveis: number;
  variacaoLiquida: number;
  tenureMedioMeses: number | null;
  admissoes: number;
  desligamentos: number;
  turnoverPct: number | null;
  saidasVoluntariasPct: number | null;
  massaSalarial: number | null;
  custoMedioHc: number | null;
  pctCustoEstudio: number | null;
  vagasAbertas: number;
  vagasEmAndamento: number;
  mixContrato: HeadcountMixItem[];
  mixArea: HeadcountMixItem[];
  hcPorDiretoria: HeadcountMixItem[];
  origemContratacao: HeadcountMixItem[];
  serieMensal: HeadcountSerieMensal[];
  porDiretoria: HeadcountDiretoriaRow[];
};

function isoDia(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function dentroPeriodo(iso: string | null, periodo: HeadcountPeriodo): boolean {
  if (!iso) return false;
  return iso >= periodo.inicio && iso <= periodo.fim;
}

/** Prestador ativo no fim do período (aproximação por datas de vínculo). */
export function estavaAtivoNoFim(row: HeadcountFuncionarioRow, fimIso: string): boolean {
  const ini = isoDia(row.data_inicio);
  if (!ini || ini > fimIso) return false;
  const desl = isoDia(row.data_desligamento);
  if (desl && desl <= fimIso) return false;
  return true;
}

export function custoMensalEstimado(row: HeadcountFuncionarioRow): number {
  const area = row.area_atuacao;
  if (area === "estudio") {
    const cent = Number(row.remuneracao_hora_centavos ?? 0);
    if (!(cent > 0)) return 0;
    return (cent / 100) * HEADCOUNT_HORAS_MES_ESTIMADAS;
  }
  const sal = Number(row.salario ?? 0);
  return sal > 0 ? sal : 0;
}

function tenureMesesAte(dataInicio: string | null, refIso: string): number | null {
  const ini = isoDia(dataInicio);
  if (!ini || ini > refIso) return null;
  const [y1, m1] = ini.split("-").map(Number);
  const [y2, m2] = refIso.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

const LABEL_CONTRATO: Record<string, string> = {
  CLT: "CLT",
  PJ: "PJ",
  Estagio: "Estágio",
  Temporario: "Temporário",
};

const LABEL_AREA: Record<string, string> = {
  estudio: "Estúdio",
  escritorio: "Escritório",
};

const LABEL_ORIGEM: Record<string, string> = {
  linkedin: "LinkedIn",
  indicacao: "Indicação",
  site_vagas: "Site de Vagas",
  instagram: "Instagram",
  site_spin: "Site Spin",
};

function contarPor<T>(items: T[], keyFn: (x: T) => string, labelFn: (key: string) => string): HeadcountMixItem[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, valor]) => ({ key, label: labelFn(key), valor }))
    .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label, "pt-BR"));
}

export function filtrarFuncionarios(
  rows: HeadcountFuncionarioRow[],
  opts: {
    diretoriaId: string;
    area: RhAreaAtuacao | "todas";
    contrato: RhFuncionarioTipoContrato | "todos";
  },
): HeadcountFuncionarioRow[] {
  return rows.filter((r) => {
    if (opts.diretoriaId && opts.diretoriaId !== "todas" && r.org_diretoria_id !== opts.diretoriaId) return false;
    if (opts.area !== "todas" && r.area_atuacao !== opts.area) return false;
    if (opts.contrato !== "todos" && r.tipo_contrato !== opts.contrato) return false;
    return true;
  });
}

export function computarMetricasHeadcount(params: {
  funcionarios: HeadcountFuncionarioRow[];
  terminos: HeadcountTerminoRow[];
  vagas: HeadcountVagaRow[];
  diretorias: HeadcountDiretoriaRef[];
  periodo: HeadcountPeriodo;
  mesesSerie: { ano: number; mes: number; label: string; inicio: string; fim: string }[];
  statusVagaEfetivo: (v: Pick<HeadcountVagaRow, "status" | "data_fim_inscricoes">) => string;
  incluirCusto: boolean;
}): HeadcountMetricas {
  const { funcionarios, terminos, vagas, diretorias, periodo, mesesSerie, statusVagaEfetivo, incluirCusto } = params;
  const nomeDir = new Map(diretorias.map((d) => [d.id, d.nome]));
  const labelDir = (id: string | null) => (id ? nomeDir.get(id) ?? "Sem diretoria" : "Sem diretoria");

  const ativosFim = funcionarios.filter((r) => estavaAtivoNoFim(r, periodo.fim));
  const hcAtivo = ativosFim.length;
  const indisponiveis = ativosFim.filter((r) => r.status === "indisponivel").length;

  const admissoes = funcionarios.filter((r) => dentroPeriodo(isoDia(r.data_inicio), periodo)).length;
  const desligamentos = funcionarios.filter((r) => dentroPeriodo(isoDia(r.data_desligamento), periodo)).length;
  const variacaoLiquida = admissoes - desligamentos;

  const tenures = ativosFim
    .map((r) => tenureMesesAte(r.data_inicio, periodo.fim))
    .filter((n): n is number => n != null && n >= 0);
  const tenureMedioMeses = tenures.length ? tenures.reduce((a, b) => a + b, 0) / tenures.length : null;

  const inicioAnterior = (() => {
    const d = new Date(`${periodo.inicio}T12:00:00`);
    d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const fimAnt = new Date(y, m + 1, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      fim: `${fimAnt.getFullYear()}-${pad(fimAnt.getMonth() + 1)}-${pad(fimAnt.getDate())}`,
    };
  })();
  const hcInicio = funcionarios.filter((r) => estavaAtivoNoFim(r, inicioAnterior.fim)).length;
  const hcMedio = (hcInicio + hcAtivo) / 2;
  const turnoverPct = hcMedio > 0 ? (desligamentos / hcMedio) * 100 : null;

  const terminosPeriodo = terminos.filter((t) => dentroPeriodo(t.data_termino, periodo));
  const vol = terminosPeriodo.filter((t) => t.tipo_termino === "voluntario").length;
  const saidasVoluntariasPct = terminosPeriodo.length > 0 ? (vol / terminosPeriodo.length) * 100 : null;

  let massaSalarial: number | null = null;
  let custoMedioHc: number | null = null;
  let pctCustoEstudio: number | null = null;
  if (incluirCusto) {
    let total = 0;
    let est = 0;
    for (const r of ativosFim) {
      const c = custoMensalEstimado(r);
      total += c;
      if (r.area_atuacao === "estudio") est += c;
    }
    massaSalarial = total;
    custoMedioHc = hcAtivo > 0 ? total / hcAtivo : null;
    pctCustoEstudio = total > 0 ? (est / total) * 100 : null;
  }

  const vagasAbertas = vagas.filter((v) => statusVagaEfetivo(v) === "aberta").length;
  const vagasEmAndamento = vagas.filter((v) => statusVagaEfetivo(v) === "em_andamento").length;

  const mixContrato = contarPor(
    ativosFim,
    (r) => String(r.tipo_contrato || "—"),
    (k) => LABEL_CONTRATO[k] ?? k,
  );
  const mixArea = contarPor(
    ativosFim,
    (r) => String(r.area_atuacao || "—"),
    (k) => LABEL_AREA[k] ?? k,
  );
  const hcPorDiretoria = contarPor(
    ativosFim,
    (r) => r.org_diretoria_id ?? "sem",
    (k) => (k === "sem" ? "Sem diretoria" : labelDir(k)),
  );

  const contratadosPeriodo = funcionarios.filter((r) => dentroPeriodo(isoDia(r.data_inicio), periodo));
  const origemContratacao = contarPor(
    contratadosPeriodo.filter((r) => r.origem_contratacao),
    (r) => String(r.origem_contratacao),
    (k) => LABEL_ORIGEM[k] ?? k,
  );

  const serieMensal: HeadcountSerieMensal[] = mesesSerie.map((m) => ({
    ano: m.ano,
    mes: m.mes,
    label: m.label,
    hcAtivoFim: funcionarios.filter((r) => estavaAtivoNoFim(r, m.fim)).length,
    admissoes: funcionarios.filter((r) => dentroPeriodo(isoDia(r.data_inicio), { inicio: m.inicio, fim: m.fim })).length,
    desligamentos: funcionarios.filter((r) =>
      dentroPeriodo(isoDia(r.data_desligamento), { inicio: m.inicio, fim: m.fim }),
    ).length,
  }));

  const dirIds = new Set<string>();
  for (const r of funcionarios) {
    if (r.org_diretoria_id) dirIds.add(r.org_diretoria_id);
  }
  for (const d of diretorias) dirIds.add(d.id);

  const porDiretoria: HeadcountDiretoriaRow[] = [...dirIds]
    .map((diretoriaId) => {
      const rowsDir = funcionarios.filter((r) => r.org_diretoria_id === diretoriaId);
      const ativos = rowsDir.filter((r) => estavaAtivoNoFim(r, periodo.fim));
      const adm = rowsDir.filter((r) => dentroPeriodo(isoDia(r.data_inicio), periodo)).length;
      const des = rowsDir.filter((r) => dentroPeriodo(isoDia(r.data_desligamento), periodo)).length;
      const hcIni = rowsDir.filter((r) => estavaAtivoNoFim(r, inicioAnterior.fim)).length;
      const medio = (hcIni + ativos.length) / 2;
      const turn = medio > 0 ? (des / medio) * 100 : null;
      let massa: number | null = null;
      if (incluirCusto) {
        massa = ativos.reduce((acc, r) => acc + custoMensalEstimado(r), 0);
      }
      const vagasDir = vagas.filter((v) => v.org_diretoria_id === diretoriaId);
      return {
        diretoriaId,
        diretoriaNome: labelDir(diretoriaId),
        hcAtivo: ativos.length,
        indisponiveis: ativos.filter((r) => r.status === "indisponivel").length,
        admissoes: adm,
        desligamentos: des,
        turnoverPct: turn,
        massaSalarial: massa,
        vagasAbertas: vagasDir.filter((v) => statusVagaEfetivo(v) === "aberta").length,
      };
    })
    .filter((r) => r.hcAtivo > 0 || r.admissoes > 0 || r.desligamentos > 0 || r.vagasAbertas > 0)
    .sort((a, b) => b.hcAtivo - a.hcAtivo || a.diretoriaNome.localeCompare(b.diretoriaNome, "pt-BR"));

  return {
    hcAtivo,
    indisponiveis,
    variacaoLiquida,
    tenureMedioMeses,
    admissoes,
    desligamentos,
    turnoverPct,
    saidasVoluntariasPct,
    massaSalarial,
    custoMedioHc,
    pctCustoEstudio,
    vagasAbertas,
    vagasEmAndamento,
    mixContrato,
    mixArea,
    hcPorDiretoria,
    origemContratacao,
    serieMensal,
    porDiretoria,
  };
}
