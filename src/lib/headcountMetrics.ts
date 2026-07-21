import type { RhAreaAtuacao, RhFuncionarioTipoContrato, RhOrigemContratacao } from "../types/rhFuncionario";
import type { RhVagaCandidaturaEtapa } from "../types/rhVagaCandidatura";
import type { RhVagaStatus, RhVagaTipo } from "../types/rhVaga";
import { RH_VAGA_CANDIDATURA_ETAPAS } from "./rhVagasFormat";

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
  /** Nome do menor nível org (time › gerência › diretoria). */
  orgLabelMenor: string;
  /** Nome da gerência (para pizza Overview). */
  gerenciaNome: string;
  /** Nome do time (quando houver) — detalhe no hover da gerência. */
  timeNome: string;
};

export type HeadcountTerminoRow = {
  rh_funcionario_id: string;
  data_termino: string | null;
  tipo_termino: "voluntario" | "nao_voluntario" | null;
};

export type HeadcountVagaRow = {
  id: string;
  titulo: string;
  tipo_vaga: RhVagaTipo | string;
  status: RhVagaStatus | string;
  data_abertura: string | null;
  data_fim_inscricoes: string | null;
  org_diretoria_id: string | null;
  org_gerencia_id: string | null;
  org_time_id: string | null;
  organogramaLabel: string;
  repasse_inicial_centavos: number | null;
};

export type HeadcountCandidaturaRow = {
  id: string;
  vaga_id: string;
  etapa: RhVagaCandidaturaEtapa | string;
  origem: RhOrigemContratacao | string | null;
};

export type HeadcountDiretoriaRef = { id: string; nome: string };

export type HeadcountPeriodo = { inicio: string; fim: string };

export type HeadcountMixItem = { key: string; label: string; valor: number };

export type HeadcountGerenciaMix = HeadcountMixItem & {
  /** Distribuição de HC ativo por time dentro da gerência. */
  times: HeadcountMixItem[];
};

export type HeadcountOverviewMetricas = {
  hcAtivo: number;
  contratacao: number;
  distrato: number;
  variacaoLiquida: number;
  turnoverPct: number | null;
  tenureMedioMeses: number | null;
  hcPorGerencia: HeadcountGerenciaMix[];
  mixContrato: HeadcountMixItem[];
};

export type HeadcountVagasMetricas = {
  abertas: number;
  emAndamento: number;
  fechadas: number;
  origemCandidaturas: HeadcountMixItem[];
  pipeline: { id: string; label: string; count: number; color: string }[];
  tabela: {
    id: string;
    titulo: string;
    tipoLabel: string;
    organograma: string;
    dataAbertura: string | null;
    dataEncerramento: string | null;
    repasseCentavos: number | null;
    candidatos: number;
    statusLabel: string;
    status: string;
  }[];
};

export type HeadcountDistratoLinha = {
  id: string;
  nome: string;
  timeLabel: string;
  dataAdmissao: string | null;
  dataTermino: string | null;
  tipoTermino: "voluntario" | "nao_voluntario" | null;
  tipoTerminoLabel: string;
  tempoDias: number | null;
  tipoContrato: string;
  tipoContratoLabel: string;
};

export type HeadcountDistratoMetricas = {
  distratos: number;
  voluntarios: number;
  naoVoluntarios: number;
  tempoMedioDias: number | null;
  porTime: HeadcountMixItem[];
  porContrato: HeadcountMixItem[];
  tabela: HeadcountDistratoLinha[];
};

const LABEL_CONTRATO: Record<string, string> = {
  CLT: "CLT",
  PJ: "PJ",
  Estagio: "Estágio",
  Temporario: "Temporário",
};

const LABEL_ORIGEM: Record<string, string> = {
  linkedin: "LinkedIn",
  indicacao: "Indicação",
  site_vagas: "Site de Vagas",
  instagram: "Instagram",
  site_spin: "Site Spin",
};

const PIPELINE_COLORS = ["#1e36f8", "#6366f1", "#a78bfa", "#22c55e", "#f59e0b", "#14b8a6", "#e84025"] as const;

export function isoDia(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function dentroPeriodo(iso: string | null, periodo: HeadcountPeriodo): boolean {
  if (!iso) return false;
  return iso >= periodo.inicio && iso <= periodo.fim;
}

export function estavaAtivoNoFim(row: Pick<HeadcountFuncionarioRow, "data_inicio" | "data_desligamento">, fimIso: string): boolean {
  const ini = isoDia(row.data_inicio);
  if (!ini || ini > fimIso) return false;
  const desl = isoDia(row.data_desligamento);
  if (desl && desl <= fimIso) return false;
  return true;
}

function tenureMesesAte(dataInicio: string | null, refIso: string): number | null {
  const ini = isoDia(dataInicio);
  if (!ini || ini > refIso) return null;
  const [y1, m1] = ini.split("-").map(Number);
  const [y2, m2] = refIso.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

function diasEntre(inicio: string | null, fim: string | null): number | null {
  const a = isoDia(inicio);
  const b = isoDia(fim);
  if (!a || !b || b < a) return null;
  const ms = Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`);
  return Math.round(ms / 86_400_000);
}

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

function fimMesAnterior(periodo: HeadcountPeriodo): string {
  const d = new Date(`${periodo.inicio}T12:00:00`);
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = d.getMonth();
  const fim = new Date(y, m + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())}`;
}

export function filtrarPorDiretoria<T extends { org_diretoria_id: string | null }>(
  rows: T[],
  diretoriaId: string,
): T[] {
  if (!diretoriaId || diretoriaId === "todas") return rows;
  return rows.filter((r) => r.org_diretoria_id === diretoriaId);
}

export function labelTipoContrato(k: string | null | undefined): string {
  if (!k) return "—";
  return LABEL_CONTRATO[k] ?? k;
}

export function labelOrigem(k: string | null | undefined): string {
  if (!k) return "Sem origem";
  return LABEL_ORIGEM[k] ?? k;
}

export function labelTipoTermino(t: "voluntario" | "nao_voluntario" | null): string {
  if (t === "voluntario") return "Voluntário";
  if (t === "nao_voluntario") return "Não voluntário";
  return "—";
}

export function computarOverview(
  funcionarios: HeadcountFuncionarioRow[],
  periodo: HeadcountPeriodo,
): HeadcountOverviewMetricas {
  const ativosFim = funcionarios.filter((r) => estavaAtivoNoFim(r, periodo.fim));
  const hcAtivo = ativosFim.length;
  const contratacao = funcionarios.filter((r) => dentroPeriodo(isoDia(r.data_inicio), periodo)).length;
  const distrato = funcionarios.filter((r) => dentroPeriodo(isoDia(r.data_desligamento), periodo)).length;
  const variacaoLiquida = contratacao - distrato;

  const tenures = ativosFim
    .map((r) => tenureMesesAte(r.data_inicio, periodo.fim))
    .filter((n): n is number => n != null && n >= 0);
  const tenureMedioMeses = tenures.length ? tenures.reduce((a, b) => a + b, 0) / tenures.length : null;

  const hcInicio = funcionarios.filter((r) => estavaAtivoNoFim(r, fimMesAnterior(periodo))).length;
  const hcMedio = (hcInicio + hcAtivo) / 2;
  const turnoverPct = hcMedio > 0 ? (distrato / hcMedio) * 100 : null;

  const porGerencia = new Map<string, HeadcountFuncionarioRow[]>();
  for (const r of ativosFim) {
    const g = r.gerenciaNome || "Sem gerência";
    const list = porGerencia.get(g);
    if (list) list.push(r);
    else porGerencia.set(g, [r]);
  }
  const hcPorGerencia: HeadcountGerenciaMix[] = [...porGerencia.entries()]
    .map(([key, rows]) => ({
      key,
      label: key,
      valor: rows.length,
      /** Só times reais — sem bucket «Sem time»; lista vazia = sem helper na UI. */
      times: contarPor(
        rows.filter((r) => Boolean(r.timeNome?.trim())),
        (r) => r.timeNome.trim(),
        (k) => k,
      ),
    }))
    .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label, "pt-BR"));
  const mixContrato = contarPor(
    ativosFim,
    (r) => String(r.tipo_contrato || "—"),
    (k) => labelTipoContrato(k),
  );

  return {
    hcAtivo,
    contratacao,
    distrato,
    variacaoLiquida,
    turnoverPct,
    tenureMedioMeses,
    hcPorGerencia,
    mixContrato,
  };
}

export function computarVagas(params: {
  vagas: HeadcountVagaRow[];
  candidaturas: HeadcountCandidaturaRow[];
  periodo: HeadcountPeriodo;
  statusVagaEfetivo: (v: Pick<HeadcountVagaRow, "status" | "data_fim_inscricoes">) => string;
  labelStatusVaga: (s: string) => string;
  labelTipoVaga: (t: string) => string;
}): HeadcountVagasMetricas {
  const { vagas, candidaturas, periodo, statusVagaEfetivo, labelStatusVaga, labelTipoVaga } = params;

  const vagasNoMes = vagas.filter((v) => {
    const ab = isoDia(v.data_abertura);
    if (ab && ab > periodo.fim) return false;
    return true;
  });

  let abertas = 0;
  let emAndamento = 0;
  let fechadas = 0;
  for (const v of vagasNoMes) {
    const st = statusVagaEfetivo(v);
    if (st === "aberta") abertas += 1;
    else if (st === "em_andamento") emAndamento += 1;
    else if (st === "concluida" || st === "cancelada") fechadas += 1;
  }

  const vagaIds = new Set(vagasNoMes.map((v) => v.id));
  const cands = candidaturas.filter((c) => vagaIds.has(c.vaga_id));

  const origemCandidaturas = contarPor(
    cands,
    (c) => (c.origem ? String(c.origem) : "sem"),
    (k) => (k === "sem" ? "Sem origem" : labelOrigem(k)),
  );

  const etapaCount = new Map<string, number>();
  for (const e of RH_VAGA_CANDIDATURA_ETAPAS) etapaCount.set(e.id, 0);
  for (const c of cands) {
    let etapa = String(c.etapa);
    if (etapa === "aprovado") etapa = "stand_by";
    if (!etapaCount.has(etapa)) continue;
    etapaCount.set(etapa, (etapaCount.get(etapa) ?? 0) + 1);
  }
  const pipeline = RH_VAGA_CANDIDATURA_ETAPAS.map((e, i) => ({
    id: e.id,
    label: e.label,
    count: etapaCount.get(e.id) ?? 0,
    color: PIPELINE_COLORS[i % PIPELINE_COLORS.length],
  }));

  const countPorVaga = new Map<string, number>();
  for (const c of candidaturas) {
    countPorVaga.set(c.vaga_id, (countPorVaga.get(c.vaga_id) ?? 0) + 1);
  }

  /** Vagas ativas (abertas + em andamento) — não só `em_andamento`. */
  const tabela = vagasNoMes
    .filter((v) => {
      const st = statusVagaEfetivo(v);
      return st === "aberta" || st === "em_andamento";
    })
    .map((v) => ({
      id: v.id,
      titulo: v.titulo,
      tipoLabel: labelTipoVaga(String(v.tipo_vaga)),
      organograma: v.organogramaLabel || "—",
      dataAbertura: isoDia(v.data_abertura),
      dataEncerramento: isoDia(v.data_fim_inscricoes),
      repasseCentavos: v.repasse_inicial_centavos,
      candidatos: countPorVaga.get(v.id) ?? 0,
      statusLabel: labelStatusVaga(statusVagaEfetivo(v)),
      status: statusVagaEfetivo(v),
    }))
    .sort((a, b) => (b.dataAbertura ?? "").localeCompare(a.dataAbertura ?? "") || a.titulo.localeCompare(b.titulo, "pt-BR"));

  return { abertas, emAndamento, fechadas, origemCandidaturas, pipeline, tabela };
}

export function computarDistrato(params: {
  funcionarios: HeadcountFuncionarioRow[];
  terminos: HeadcountTerminoRow[];
  periodo: HeadcountPeriodo;
}): HeadcountDistratoMetricas {
  const { funcionarios, terminos, periodo } = params;
  const terminoById = new Map(terminos.map((t) => [t.rh_funcionario_id, t]));

  const linhas: HeadcountDistratoLinha[] = funcionarios
    .filter((r) => dentroPeriodo(isoDia(r.data_desligamento), periodo))
    .map((r) => {
      const term = terminoById.get(r.id);
      const tipo = term?.tipo_termino ?? null;
      const dataTermino = isoDia(r.data_desligamento) ?? term?.data_termino ?? null;
      return {
        id: r.id,
        nome: r.nome,
        timeLabel: r.orgLabelMenor || "—",
        dataAdmissao: isoDia(r.data_inicio),
        dataTermino,
        tipoTermino: tipo,
        tipoTerminoLabel: labelTipoTermino(tipo),
        tempoDias: diasEntre(r.data_inicio, dataTermino),
        tipoContrato: String(r.tipo_contrato || "—"),
        tipoContratoLabel: labelTipoContrato(String(r.tipo_contrato || "—")),
      };
    })
    .sort((a, b) => (b.dataTermino ?? "").localeCompare(a.dataTermino ?? "") || a.nome.localeCompare(b.nome, "pt-BR"));

  const voluntarios = linhas.filter((l) => l.tipoTermino === "voluntario").length;
  const naoVoluntarios = linhas.filter((l) => l.tipoTermino === "nao_voluntario").length;
  const tempos = linhas.map((l) => l.tempoDias).filter((n): n is number => n != null);
  const tempoMedioDias = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null;

  const porTime = contarPor(linhas, (l) => l.timeLabel, (k) => k);
  const porContrato = contarPor(linhas, (l) => l.tipoContrato, (k) => labelTipoContrato(k));

  return {
    distratos: linhas.length,
    voluntarios,
    naoVoluntarios,
    tempoMedioDias,
    porTime,
    porContrato,
    tabela: linhas,
  };
}
