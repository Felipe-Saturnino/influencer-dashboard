import { situacaoEhCompraMarketplace } from "./overviewPrestadorMovimentacoes";

export type PresencaGestaoStatus = "aprovado" | "em_analise";

export type PresencaHistoricoTipo = "aprovacao" | "justificativa" | "correcao";

export type PresencaHistoricoItem = {
  tipo: PresencaHistoricoTipo;
  em: string;
  por: string;
};

export const PRESENCA_HISTORICO_LABEL: Record<PresencaHistoricoTipo, string> = {
  aprovacao: "Aprovação de turno",
  justificativa: "Justificativa",
  correcao: "Correção de presença",
};

export type PresencaCorrecaoAnaliseStatus = "pendente" | "aprovada" | "recusada";

export type PresencaCorrecaoMeta = {
  entradaRealAnterior: string;
  saidaRealAnterior: string;
  entradaCorrigida: string;
  saidaCorrigida: string;
  observacao: string | null;
  corrigidoPorNome: string;
  corrigidoEm: string;
  /** Legado — status único para ambos os campos; preferir `entradaAnaliseStatus` / `saidaAnaliseStatus`. */
  analiseStatus?: PresencaCorrecaoAnaliseStatus;
  analisePorNome?: string;
  analiseEm?: string;
  entradaAnaliseStatus?: PresencaCorrecaoAnaliseStatus;
  entradaAnalisePorNome?: string;
  entradaAnaliseEm?: string;
  saidaAnaliseStatus?: PresencaCorrecaoAnaliseStatus;
  saidaAnalisePorNome?: string;
  saidaAnaliseEm?: string;
};

export const PRESENCA_CORRECAO_COR_PENDENTE = "#f59e0b";
export const PRESENCA_CORRECAO_COR_APROVADA = "#22c55e";
export const PRESENCA_CORRECAO_COR_RECUSADA = "#e84025";

/** Situação de jornada trabalhada: Escalado ou Compra (Marketplace). */
export function situacaoPresencaComoEscalado(situacao: string): boolean {
  return situacao === "Escalado" || situacaoEhCompraMarketplace(situacao);
}

/**
 * Dias em que Status do Calendário vira **Abonado** (atestado com abono remunerado):
 * Escalado, Troca ou Compra.
 */
export function situacaoPresencaAbonavelAtestado(situacao: string): boolean {
  return (
    situacao === "Escalado" ||
    situacao === "Troca" ||
    situacaoEhCompraMarketplace(situacao)
  );
}

/** Situação de dia livre: Folga ou Venda (Marketplace). */
export function situacaoPresencaComoFolga(situacao: string): boolean {
  return situacao === "Folga" || situacao === "Venda";
}

/** Status de análise de um campo (entrada ou saída). Legado: `analiseStatus` único. */
export function presencaCorrecaoAnaliseStatusCampo(
  correcao: PresencaCorrecaoMeta | undefined,
  campo: "entrada" | "saida",
): PresencaCorrecaoAnaliseStatus {
  if (!correcao) return "pendente";
  const perField =
    campo === "entrada" ? correcao.entradaAnaliseStatus : correcao.saidaAnaliseStatus;
  if (perField) return perField;
  if (!presencaCorrecaoCampoAlterado(campo, correcao)) return "pendente";
  return correcao.analiseStatus ?? "pendente";
}

export function presencaCorrecaoAnaliseMetaCampo(
  correcao: PresencaCorrecaoMeta,
  campo: "entrada" | "saida",
): { porNome?: string; em?: string } {
  if (campo === "entrada" && correcao.entradaAnalisePorNome) {
    return { porNome: correcao.entradaAnalisePorNome, em: correcao.entradaAnaliseEm };
  }
  if (campo === "saida" && correcao.saidaAnalisePorNome) {
    return { porNome: correcao.saidaAnalisePorNome, em: correcao.saidaAnaliseEm };
  }
  return { porNome: correcao.analisePorNome, em: correcao.analiseEm };
}

/**
 * Status consolidado da correção: pendente se algum campo alterado ainda espera;
 * aprovada só quando todos os alterados estão aprovados; recusada se todos decididos e algum recusado.
 */
export function presencaCorrecaoAnaliseStatusEfetivo(
  correcao: PresencaCorrecaoMeta | undefined,
): PresencaCorrecaoAnaliseStatus {
  if (!correcao) return "pendente";
  const campos: Array<"entrada" | "saida"> = [];
  if (presencaCorrecaoCampoAlterado("entrada", correcao)) campos.push("entrada");
  if (presencaCorrecaoCampoAlterado("saida", correcao)) campos.push("saida");
  if (campos.length === 0) return correcao.analiseStatus ?? "pendente";
  const statuses = campos.map((c) => presencaCorrecaoAnaliseStatusCampo(correcao, c));
  if (statuses.some((s) => s === "pendente")) return "pendente";
  if (statuses.every((s) => s === "aprovada")) return "aprovada";
  return "recusada";
}

export function presencaCorrecaoCampoAprovado(
  correcao: PresencaCorrecaoMeta | undefined,
  campo: "entrada" | "saida",
): boolean {
  if (!correcao || !presencaCorrecaoCampoAlterado(campo, correcao)) return false;
  return presencaCorrecaoAnaliseStatusCampo(correcao, campo) === "aprovada";
}

export function presencaCorrecaoTemCampoPendenteAnalise(
  correcao: PresencaCorrecaoMeta | undefined,
): boolean {
  if (!correcao) return false;
  return (
    (presencaCorrecaoCampoAlterado("entrada", correcao) &&
      presencaCorrecaoAnaliseStatusCampo(correcao, "entrada") === "pendente") ||
    (presencaCorrecaoCampoAlterado("saida", correcao) &&
      presencaCorrecaoAnaliseStatusCampo(correcao, "saida") === "pendente")
  );
}

export function presencaCorrecaoCorIndicador(
  correcao: PresencaCorrecaoMeta | undefined,
  campo?: "entrada" | "saida",
): string {
  const st = campo
    ? presencaCorrecaoAnaliseStatusCampo(correcao, campo)
    : presencaCorrecaoAnaliseStatusEfetivo(correcao);
  if (st === "aprovada") return PRESENCA_CORRECAO_COR_APROVADA;
  if (st === "recusada") return PRESENCA_CORRECAO_COR_RECUSADA;
  return PRESENCA_CORRECAO_COR_PENDENTE;
}

export function presencaCorrecaoTituloTooltipCampo(
  campo: "entrada" | "saida",
  correcao: PresencaCorrecaoMeta | undefined,
): string {
  const base = campo === "entrada" ? "Correção de Entrada" : "Correção de Saída";
  const st = presencaCorrecaoAnaliseStatusCampo(correcao, campo);
  if (st === "aprovada") return `${base} - Aprovada`;
  if (st === "recusada") return `${base} - Recusada`;
  return base;
}

export function presencaCorrecaoRotuloAnalisePor(st: PresencaCorrecaoAnaliseStatus): string {
  return st === "recusada" ? "Rejeitado por:" : "Aprovado por:";
}

/** `true` se o campo foi efetivamente corrigido (horário corrigido ≠ realizado anterior). */
export function presencaCorrecaoCampoAlterado(
  campo: "entrada" | "saida",
  correcao: PresencaCorrecaoMeta,
): boolean {
  const corrigida = campo === "entrada" ? correcao.entradaCorrigida : correcao.saidaCorrigida;
  const anterior = campo === "entrada" ? correcao.entradaRealAnterior : correcao.saidaRealAnterior;
  if (anterior === "—" || !anterior.trim()) return true;
  if (!validarHorarioPresencaHHMM(corrigida)) return corrigida.trim() !== anterior.trim();
  const c = normalizarHorarioPresencaHHMM(corrigida);
  const a = normalizarHorarioPresencaHHMM(anterior);
  if (!validarHorarioPresencaHHMM(a)) return c !== anterior.trim();
  return c !== a;
}

export function presencaCorrecaoTemCampoAlterado(correcao: PresencaCorrecaoMeta): boolean {
  return presencaCorrecaoCampoAlterado("entrada", correcao) || presencaCorrecaoCampoAlterado("saida", correcao);
}

export type PresencaJustificativaMotivo = "medico" | "esquecimento" | "outro";

export type PresencaJustificativaAtestadoStatus = "em_analise" | "aprovado" | "rejeitado";

export type PresencaJustificativaMeta = {
  motivo: PresencaJustificativaMotivo;
  registradoPorNome: string;
  registradoEm: string;
  atestadoInicio?: string;
  atestadoFim?: string;
  atestadoStoragePath?: string;
  atestadoFileName?: string;
  observacao?: string | null;
  /** Status da solicitação de atestado em Solicitações (RH). */
  atestadoStatus?: PresencaJustificativaAtestadoStatus;
  solicitacaoId?: string;
  /** Dia em que a justificativa foi registrada (âncora da solicitação em Solicitações RH). */
  atestadoDiaRegistro?: string;
  /** Atendimento em Solicitações (RH) — preenchido ao aprovar/rejeitar. */
  atestadoAtendidoPorNome?: string;
  atestadoAtendidoEm?: string;
  /** Abono remunerado definido em Solicitações (RH) ao aprovar atestado. */
  abonoRemunerado?: "sim" | "nao" | null;
};

export type PresencaHistoricoLinhaExibicao = {
  acao: string;
  em: string;
  por: string;
};

/** Subtítulo do modal de histórico — ex.: «Quinta, 18 de Junho». */
export function subtituloDiaOcorrenciaPresencaPt(d: Date): string {
  const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const MONTHS = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const dow = WEEKDAYS[d.getDay()] ?? "";
  const mes = MONTHS[d.getMonth()] ?? "";
  return `${dow}, ${d.getDate()} de ${mes}`;
}

export function fmtPresencaHistoricoDataHora(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function mensagemAprovacaoPresencaMesPt(aprovadoEm: string): string {
  return `Aprovado em ${fmtPresencaHistoricoDataHora(aprovadoEm)}`;
}

/** Duas linhas fixas: Justificativa + Aprovação/Rejeição (atestado médico). */
export function historicoLinhasJustificativaMedico(
  justificativa: PresencaJustificativaMeta | undefined,
): PresencaHistoricoLinhaExibicao[] {
  if (!justificativa || justificativa.motivo !== "medico") return [];

  const linhas: PresencaHistoricoLinhaExibicao[] = [];

  if (justificativa.registradoEm && justificativa.registradoPorNome) {
    linhas.push({
      acao: "Justificativa",
      em: justificativa.registradoEm,
      por: justificativa.registradoPorNome,
    });
  }

  const st = presencaJustificativaMedicoStatusEfetivo(justificativa);
  if (st === "aprovado" || st === "rejeitado") {
    const em = justificativa.atestadoAtendidoEm;
    const por = justificativa.atestadoAtendidoPorNome;
    if (em && por) {
      linhas.push({
        acao: st === "aprovado" ? "Aprovação" : "Rejeição",
        em,
        por,
      });
    }
  }

  return linhas;
}

/** Período do atestado abrange mais de um dia civil. */
export function atestadoMedicoPeriodoMultiploDias(inicio?: string, fim?: string): boolean {
  const a = (inicio ?? "").slice(0, 10);
  const b = (fim ?? "").slice(0, 10);
  if (!a || !b) return false;
  return a !== b;
}

/** Lista dias ISO inclusivos entre início e fim (YYYY-MM-DD). */
export function enumerarDiasIsoInclusive(inicio: string, fim: string): string[] {
  const start = inicio.slice(0, 10);
  const end = fim.slice(0, 10);
  if (!start || !end || start > end) return [];
  const out: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (cur.getTime() <= last.getTime()) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function diaIsoNoIntervaloAtestado(diaIso: string, inicio?: string, fim?: string): boolean {
  const a = (inicio ?? "").slice(0, 10);
  const b = (fim ?? "").slice(0, 10);
  if (!a || !b) return false;
  return diaIso >= a && diaIso <= b;
}

export function presencaJustificativaMedicoAplicavelAoDia(
  diaIso: string,
  situacao: string,
  justificativa: PresencaJustificativaMeta,
): boolean {
  if (justificativa.motivo !== "medico") return false;
  const ini = justificativa.atestadoInicio;
  const fim = justificativa.atestadoFim;
  if (!ini || !fim) return false;
  const noPeriodo = !atestadoMedicoPeriodoMultiploDias(ini, fim)
    ? diaIso === (justificativa.atestadoDiaRegistro ?? ini).slice(0, 10)
    : diaIsoNoIntervaloAtestado(diaIso, ini, fim);
  if (!noPeriodo) return false;

  const st = justificativa.atestadoStatus ?? "em_analise";
  const abono = justificativa.abonoRemunerado;

  // Grade já reescrita como Atestado: com abono=nao o sync cria gestão em todos os dias;
  // com abono=sim não propagar via índice (só linhas criadas no servidor para jornada/troca/compra).
  if (situacao === "Atestado") {
    return st === "aprovado" && abono === "nao";
  }

  // Sem abono remunerado aprovado: Status Atestado também em Folga/Venda.
  if (st === "aprovado" && abono === "nao") {
    return situacaoPresencaAbonavelAtestado(situacao) || situacaoPresencaComoFolga(situacao);
  }

  // Em análise / rejeitado / abono=sim: só Escalado, Troca ou Compra.
  return situacaoPresencaAbonavelAtestado(situacao);
}

export type PresencaGestaoChaveValor = {
  chave: string;
  gestao: PresencaDiaGestao;
};

/** Índice de justificativa médica propagada por dia (intervalo multi-dia + Escalado). */
export function construirIndiceJustificativaMedicoPorDia(
  entradas: PresencaGestaoChaveValor[],
  funcionarioId: string,
  situacaoPorDiaIso: (diaIso: string) => string,
): Map<string, PresencaJustificativaMeta> {
  const indice = new Map<string, PresencaJustificativaMeta>();
  const prefixo = `${funcionarioId}:`;

  for (const { chave, gestao } of entradas) {
    if (!chave.startsWith(prefixo)) continue;
    const just = gestao.justificativa;
    if (!just || just.motivo !== "medico") continue;
    if (!just.atestadoInicio || !just.atestadoFim) continue;

    const dias =
      atestadoMedicoPeriodoMultiploDias(just.atestadoInicio, just.atestadoFim)
        ? enumerarDiasIsoInclusive(just.atestadoInicio, just.atestadoFim)
        : [(just.atestadoDiaRegistro ?? chave.slice(prefixo.length)).slice(0, 10)];

    for (const diaIso of dias) {
      if (!presencaJustificativaMedicoAplicavelAoDia(diaIso, situacaoPorDiaIso(diaIso), just)) continue;
      const existente = indice.get(diaIso);
      if (!existente || (just.registradoEm ?? "") >= (existente.registradoEm ?? "")) {
        indice.set(diaIso, just);
      }
    }
  }

  return indice;
}

/** Mescla gestão do dia com justificativa médica propagada (visualização). */
export function fundirGestaoPresencaComJustificativaMedico(
  gestao: PresencaDiaGestao | undefined,
  diaIso: string,
  situacao: string,
  indice: Map<string, PresencaJustificativaMeta>,
): PresencaDiaGestao | undefined {
  if (gestao?.justificativa?.motivo === "medico") {
    if (
      !atestadoMedicoPeriodoMultiploDias(gestao.justificativa.atestadoInicio, gestao.justificativa.atestadoFim) ||
      presencaJustificativaMedicoAplicavelAoDia(diaIso, situacao, gestao.justificativa)
    ) {
      return gestao;
    }
  }

  const propagada = indice.get(diaIso);
  if (!propagada || !presencaJustificativaMedicoAplicavelAoDia(diaIso, situacao, propagada)) {
    return gestao;
  }

  const st = presencaJustificativaMedicoStatusEfetivo(propagada);
  const statusGestao: PresencaGestaoStatus | undefined =
    st === "aprovado" ? "aprovado" : st === "em_analise" ? "em_analise" : undefined;

  return {
    ...gestao,
    statusGestao,
    justificativa: propagada,
  };
}

export const PRESENCA_JUSTIFICATIVA_MEDICO_COR: Record<PresencaJustificativaAtestadoStatus, string> = {
  em_analise: "#f59e0b",
  aprovado: "#22c55e",
  rejeitado: "#e84025",
};

export const PRESENCA_JUSTIFICATIVA_MEDICO_STATUS_LABEL: Record<PresencaJustificativaAtestadoStatus, string> = {
  em_analise: "Em análise",
  aprovado: "Atestado",
  rejeitado: "Rejeitado",
};

export function presencaJustificativaMedicoStatusEfetivo(
  justificativa: PresencaJustificativaMeta | undefined,
): PresencaJustificativaAtestadoStatus {
  if (!justificativa || justificativa.motivo !== "medico") return "em_analise";
  return justificativa.atestadoStatus ?? "em_analise";
}

export function presencaJustificativaMedicoPendente(gestao?: PresencaDiaGestao): boolean {
  return (
    gestao?.justificativa?.motivo === "medico" &&
    presencaJustificativaMedicoStatusEfetivo(gestao.justificativa) === "em_analise"
  );
}

export function presencaJustificativaMedicoAprovada(gestao?: PresencaDiaGestao): boolean {
  return (
    gestao?.justificativa?.motivo === "medico" &&
    presencaJustificativaMedicoStatusEfetivo(gestao.justificativa) === "aprovado"
  );
}

/** Rótulo de status no Calendário e tooltip — considera abono remunerado ao aprovar. */
export function presencaJustificativaMedicoStatusExibicao(
  justificativa: PresencaJustificativaMeta,
): string {
  const st = presencaJustificativaMedicoStatusEfetivo(justificativa);
  if (st === "em_analise") return "Em análise";
  if (st === "rejeitado") return "Rejeitado";
  if (st === "aprovado") {
    return justificativa.abonoRemunerado === "sim" ? "Abonado" : "Atestado";
  }
  return "Em análise";
}

/** Status da coluna Status quando há justificativa médica aplicável ao dia. */
export function resolverStatusPresencaMedicoLinha(gestao?: PresencaDiaGestao): string | null {
  if (gestao?.justificativa?.motivo !== "medico") return null;
  const st = presencaJustificativaMedicoStatusEfetivo(gestao.justificativa);
  if (st === "em_analise") return "Em análise";
  if (st === "rejeitado") return "Falta";
  if (st === "aprovado") {
    return gestao.justificativa.abonoRemunerado === "sim" ? "Abonado" : "Atestado";
  }
  return null;
}

export function presencaJustificativaMedicoExibirIndicador(
  gestao?: PresencaDiaGestao,
  diaIso?: string,
  situacao?: string,
): boolean {
  if (!gestao?.justificativa || gestao.justificativa.motivo !== "medico") return false;
  if (diaIso != null && situacao != null) {
    return presencaJustificativaMedicoAplicavelAoDia(diaIso, situacao, gestao.justificativa);
  }
  return true;
}

export const PRESENCA_JUSTIFICATIVA_MOTIVO_LABEL: Record<PresencaJustificativaMotivo, string> = {
  medico: "Médico",
  esquecimento: "Esquecimento",
  outro: "Outro",
};

export type PresencaDiaGestao = {
  statusGestao?: PresencaGestaoStatus;
  correcao?: PresencaCorrecaoMeta;
  justificativa?: PresencaJustificativaMeta;
  historico?: PresencaHistoricoItem[];
};

export type PresencaAcaoPrimaria = "aprovar" | "justificar" | null;

export type PresencaAcoesLinha = {
  acaoPrimaria: PresencaAcaoPrimaria;
  mostrarHistorico: boolean;
  mostrarTravessaoAcoes: boolean;
};

export type ResolverPresencaLinhaParams = {
  situacao: string;
  diaIso: string;
  entEsc: string;
  saiEsc: string;
  temCheckIn: boolean;
  temCheckOut: boolean;
  statusBase: string;
  gestao?: PresencaDiaGestao;
  agora?: Date;
};

export function chavePresencaGestao(funcionarioId: string, diaIso: string): string {
  return `${funcionarioId}:${diaIso}`;
}

export function validarHorarioPresencaHHMM(valor: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(valor.trim());
}

/** Converte segmentos H e M em «HH:MM». */
function formatarSegmentosHorarioPresencaHHMM(
  horas: string,
  minutos: string,
  modo: "digitacao" | "completo",
): string {
  const hRaw = horas.replace(/\D/g, "").slice(0, 2);
  const m = minutos.replace(/\D/g, "").slice(0, 2);
  if (!hRaw && !m) return "";
  if (!m) return hRaw.length === 2 ? `${hRaw}:` : hRaw;

  // Digitação: não zero-pad minutos com 1 dígito — senão «12:3» vira «12:03»
  // e com maxLength={5} fica impossível chegar a «12:30».
  if (modo === "digitacao") {
    if (m.length < 2) return `${hRaw}:${m}`;
    return `${String(parseInt(hRaw || "0", 10)).padStart(2, "0")}:${m}`;
  }

  // Completo (blur/save): minuto com 1 dígito permanece incompleto («06:5»)
  // para não validar como «06:05» por engano (ex.: «6.5» a meio de «6.50»).
  if (m.length < 2) {
    return `${String(parseInt(hRaw || "0", 10)).padStart(2, "0")}:${m}`;
  }
  return `${String(parseInt(hRaw || "0", 10)).padStart(2, "0")}:${m}`;
}

/** Interpreta só dígitos (3 = HMM omitindo zero da hora; 4 = HHMM). */
function horarioPresencaDeDigitos(digits: string): string | null {
  if (digits.length === 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  if (digits.length === 3) {
    return `0${digits[0]}:${digits.slice(1, 3)}`;
  }
  return null;
}

export function normalizarHorarioPresencaHHMM(valor: string): string {
  const trimmed = valor.trim();
  if (!trimmed) return "";

  // Teclado numérico mobile costuma usar «.» ou «,» no lugar de «:» (ex.: 6.50 → 06:50).
  const comSeparador = trimmed.replace(/[.,]/g, ":");

  const m = /^(\d{1,2}):(\d{1,2})$/.exec(comSeparador);
  if (m) {
    return formatarSegmentosHorarioPresencaHHMM(m[1]!, m[2]!, "completo");
  }

  const deDigitos = horarioPresencaDeDigitos(comSeparador.replace(/\D/g, ""));
  if (deDigitos) {
    const partes = /^(\d{1,2}):(\d{2})$/.exec(deDigitos);
    if (partes) {
      return formatarSegmentosHorarioPresencaHHMM(partes[1]!, partes[2]!, "completo");
    }
  }

  const mLegado = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (mLegado) {
    return `${String(parseInt(mLegado[1]!, 10)).padStart(2, "0")}:${mLegado[2]}`;
  }

  return trimmed;
}

/**
 * Máscara HH:MM em tempo real — aceita «:», «.» ou «,» como separador;
 * digitando só números: 0800 → 08:00, 650 → 06:50.
 */
export function aplicarMascaraHorarioPresencaHHMM(input: string): string {
  const comSeparador = input.replace(/[.,]/g, ":");
  const limpo = comSeparador.replace(/[^\d:]/g, "");
  const colonIdx = limpo.indexOf(":");

  if (colonIdx >= 0) {
    const h = limpo.slice(0, colonIdx);
    const min = limpo.slice(colonIdx + 1).replace(/:/g, "");
    return formatarSegmentosHorarioPresencaHHMM(h, min, "digitacao");
  }

  const digits = limpo.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length === 3) {
    return `0${digits[0]}:${digits.slice(1)}`;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function minutosRelogioHHmm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Dia civil >= amanhã (fuso local). */
export function diaIsoEhAmanhaOuFuturo(diaIso: string, ref = new Date()): boolean {
  const amanha = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1);
  return diaIso >= toIsoLocal(amanha);
}

/** Verde semântico (positivo) — destaque da linha «hoje» na tabela de presença. */
export const PRESENCA_DESTAQUE_VERDE_HEX = "#22c55e";

export function turnoEscaladoCruzaMeiaNoite(entEsc: string, saiEsc: string): boolean {
  if (entEsc === "—" || saiEsc === "—") return false;
  const minEnt = minutosRelogioHHmm(entEsc);
  const minSai = minutosRelogioHHmm(saiEsc);
  if (minEnt == null || minSai == null) return false;
  return minSai <= minEnt;
}

/**
 * Agora >= saída escalada + 30 min.
 * Turno que cruza meia-noite (ex.: entra hoje 22:00, sai amanhã 06:00) usa o dia civil seguinte.
 */
export function passouHorarioSaidaEscaladaMais30Min(
  diaIso: string,
  saiEsc: string,
  agora = new Date(),
  entEsc?: string,
): boolean {
  // Sem horário programado (ex.: Shuffler em Todos Estúdios): dia civil já passado
  // conta como limite atingido, para Falta + Justificar não ficarem bloqueados.
  if (saiEsc === "—") return diaIso < toIsoLocal(agora);
  const minSaida = minutosRelogioHHmm(saiEsc);
  if (minSaida == null) return false;
  const [y, mo, d] = diaIso.split("-").map((x) => parseInt(x, 10));
  const limite = new Date(y, mo - 1, d, 0, 0, 0, 0);
  if (entEsc && turnoEscaladoCruzaMeiaNoite(entEsc, saiEsc)) {
    limite.setDate(limite.getDate() + 1);
  }
  limite.setMinutes(minSaida + 30);
  return agora.getTime() >= limite.getTime();
}

/** Fundo opaco da linha em destaque — mesma intensidade do mix anterior (brand-accent). */
export function fundoLinhaPresencaDiaHoje(colBg: string, isDark: boolean): string {
  return isDark
    ? `color-mix(in srgb, ${colBg} 78%, ${PRESENCA_DESTAQUE_VERDE_HEX} 22%)`
    : `color-mix(in srgb, ${colBg} 88%, ${PRESENCA_DESTAQUE_VERDE_HEX} 12%)`;
}

/** ISO do dia civil da saída escalada (dia seguinte se o turno cruza meia-noite). */
export function diaIsoSaidaTurnoEscalonado(diaIsoEscalonado: string, entEsc: string, saiEsc: string): string {
  if (!turnoEscaladoCruzaMeiaNoite(entEsc, saiEsc)) return diaIsoEscalonado;
  const [y, mo, d] = diaIsoEscalonado.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + 1);
  return toIsoLocal(dt);
}

export type LinhaPresencaDestaqueParams = {
  diaIso: string;
  entEsc: string;
  saiEsc: string;
  /** Escala do dia civil anterior (turno noturno cuja saída pode ser diaIso). */
  entEscDiaAnterior?: string;
  saiEscDiaAnterior?: string;
  diaIsoEscalonadoAnterior?: string;
  agora?: Date;
};

/**
 * Destaque «hoje» na linha do dia da saída:
 * - turno no mesmo dia civil → linha do dia escalado;
 * - turno que cruza meia-noite → linha do dia seguinte (saída), não a da entrada.
 */
export function linhaPresencaDestaqueHoje(params: LinhaPresencaDestaqueParams): boolean {
  const {
    diaIso,
    entEsc,
    saiEsc,
    entEscDiaAnterior,
    saiEscDiaAnterior,
    diaIsoEscalonadoAnterior,
    agora = new Date(),
  } = params;
  const hojeIso = toIsoLocal(agora);

  if (hojeIso !== diaIso) return false;

  if (entEsc !== "—" && saiEsc !== "—" && !turnoEscaladoCruzaMeiaNoite(entEsc, saiEsc)) {
    return true;
  }

  if (
    entEscDiaAnterior &&
    saiEscDiaAnterior &&
    diaIsoEscalonadoAnterior &&
    entEscDiaAnterior !== "—" &&
    saiEscDiaAnterior !== "—" &&
    turnoEscaladoCruzaMeiaNoite(entEscDiaAnterior, saiEscDiaAnterior)
  ) {
    const diaSaidaOntem = diaIsoSaidaTurnoEscalonado(
      diaIsoEscalonadoAnterior,
      entEscDiaAnterior,
      saiEscDiaAnterior,
    );
    if (diaSaidaOntem === diaIso) {
      return !passouHorarioSaidaEscaladaMais30Min(
        diaIsoEscalonadoAnterior,
        saiEscDiaAnterior,
        agora,
        entEscDiaAnterior,
      );
    }
  }

  return false;
}

export function resolverStatusPresencaLinha(params: ResolverPresencaLinhaParams): string {
  const { situacao, diaIso, entEsc, saiEsc, temCheckIn, temCheckOut, statusBase, gestao, agora } = params;

  if (situacao === "—") return "—";

  const statusMedico = resolverStatusPresencaMedicoLinha(gestao);
  if (statusMedico != null) return statusMedico;

  if (gestao?.statusGestao === "aprovado") return "Aprovado";
  if (
    gestao?.statusGestao === "em_analise" &&
    gestao.correcao &&
    presencaCorrecaoTemCampoPendenteAnalise(gestao.correcao)
  ) {
    return "Em análise";
  }
  if (
    gestao?.statusGestao === "em_analise" &&
    gestao.justificativa?.motivo === "outro" &&
    !presencaCorrecaoTemCampoPendenteAnalise(gestao.correcao)
  ) {
    return "Em análise";
  }

  if (situacaoPresencaComoEscalado(situacao) && diaIsoEhAmanhaOuFuturo(diaIso, agora)) return "—";

  if (
    situacaoPresencaComoEscalado(situacao) &&
    passouHorarioSaidaEscaladaMais30Min(diaIso, saiEsc, agora, entEsc)
  ) {
    if (!temCheckIn && !temCheckOut) return "Falta";
    if (temCheckIn !== temCheckOut) return "Pendente";
  }

  return statusBase;
}

function temJustificativaRegistrada(gestao?: PresencaDiaGestao): boolean {
  return Boolean(gestao?.justificativa);
}

function historicoAcaoVisivel(gestao?: PresencaDiaGestao): boolean {
  const historico = gestao?.historico ?? [];
  return historico.some((h) => h.tipo === "aprovacao" || h.tipo === "justificativa");
}

export function resolverAcoesPresencaLinha(params: ResolverPresencaLinhaParams): PresencaAcoesLinha {
  const { situacao, diaIso, entEsc, saiEsc, temCheckIn, temCheckOut, statusBase, gestao, agora } = params;
  const temHistorico = historicoAcaoVisivel(gestao);

  if (situacao === "—") {
    return { acaoPrimaria: null, mostrarHistorico: false, mostrarTravessaoAcoes: true };
  }

  if (situacao === "Atestado") {
    if (presencaJustificativaMedicoAprovada(gestao)) {
      return {
        acaoPrimaria: null,
        mostrarHistorico: true,
        mostrarTravessaoAcoes: false,
      };
    }
    return {
      acaoPrimaria: null,
      mostrarHistorico: temHistorico,
      mostrarTravessaoAcoes: !temHistorico,
    };
  }

  if (situacaoPresencaComoEscalado(situacao) && diaIsoEhAmanhaOuFuturo(diaIso, agora)) {
    return { acaoPrimaria: null, mostrarHistorico: false, mostrarTravessaoAcoes: true };
  }

  if (situacaoPresencaComoFolga(situacao)) {
    if (
      temCheckIn &&
      temCheckOut &&
      gestao?.statusGestao !== "aprovado"
    ) {
      return {
        acaoPrimaria: "aprovar",
        mostrarHistorico: temHistorico,
        mostrarTravessaoAcoes: false,
      };
    }
    return {
      acaoPrimaria: null,
      mostrarHistorico: temHistorico,
      mostrarTravessaoAcoes: !temHistorico,
    };
  }

  if (presencaJustificativaMedicoAprovada(gestao)) {
    return {
      acaoPrimaria: null,
      mostrarHistorico: true,
      mostrarTravessaoAcoes: false,
    };
  }

  if (gestao?.statusGestao === "aprovado") {
    return {
      acaoPrimaria: null,
      mostrarHistorico: temHistorico,
      mostrarTravessaoAcoes: !temHistorico,
    };
  }

  if (gestao?.statusGestao === "em_analise") {
    const temHist = (gestao.historico?.length ?? 0) > 0;
    if (presencaJustificativaMedicoPendente(gestao)) {
      return {
        acaoPrimaria: null,
        mostrarHistorico: temHist,
        mostrarTravessaoAcoes: !temHist,
      };
    }
    if (presencaCorrecaoTemCampoPendenteAnalise(gestao.correcao)) {
      return {
        acaoPrimaria: null,
        mostrarHistorico: temHist,
        mostrarTravessaoAcoes: !temHist,
      };
    }
    // Legado: Outro só com observação (sem correção de horário) — líder aprova na linha.
    if (gestao.justificativa?.motivo === "outro" && !gestao.correcao) {
      return {
        acaoPrimaria: "aprovar",
        mostrarHistorico: temHist,
        mostrarTravessaoAcoes: false,
      };
    }
  }

  const passouLimite =
    situacaoPresencaComoEscalado(situacao) &&
    passouHorarioSaidaEscaladaMais30Min(diaIso, saiEsc, agora, entEsc);

  if (passouLimite && !temJustificativaRegistrada(gestao)) {
    if (!temCheckIn && !temCheckOut) {
      return { acaoPrimaria: "justificar", mostrarHistorico: temHistorico, mostrarTravessaoAcoes: false };
    }
    if (temCheckIn !== temCheckOut) {
      return { acaoPrimaria: "justificar", mostrarHistorico: temHistorico, mostrarTravessaoAcoes: false };
    }
  }

  const podeAprovar =
    situacaoPresencaComoEscalado(situacao) &&
    temCheckIn &&
    temCheckOut &&
    statusBase === "Registrado";

  if (podeAprovar) {
    return { acaoPrimaria: "aprovar", mostrarHistorico: temHistorico, mostrarTravessaoAcoes: false };
  }

  return {
    acaoPrimaria: null,
    mostrarHistorico: temHistorico,
    mostrarTravessaoAcoes: !temHistorico,
  };
}

export function appendHistoricoPresenca(
  gestao: PresencaDiaGestao | undefined,
  item: PresencaHistoricoItem,
): PresencaDiaGestao {
  return {
    statusGestao: gestao?.statusGestao,
    correcao: gestao?.correcao,
    justificativa: gestao?.justificativa,
    historico: [...(gestao?.historico ?? []), item],
  };
}

export type PresencaKpisConsolidados = {
  escalados: number;
  trabalhados: number;
  faltas: number;
  trocas: number;
  venda: number;
  compra: number;
};

export const PRESENCA_KPIS_ZERO: PresencaKpisConsolidados = {
  escalados: 0,
  trabalhados: 0,
  faltas: 0,
  trocas: 0,
  venda: 0,
  compra: 0,
};

export type PresencaKpiDiaInput = {
  situacao: string;
  status: string;
  temCheckIn: boolean;
  /**
   * Dia cuja célula (Venda ou `Compra - Turno`) veio de uma **Oferta de Troca**
   * aceita no Marketplace. A grade e o Calendário continuam a mostrar Venda /
   * Compra - Turno; só o KPI conta o dia como Troca.
   */
  origemTrocaMarketplace?: boolean;
};

/**
 * KPIs do mês na aba Controle de Presença (staff + dias já resolvidos).
 * Cada dia entra em no máximo um dos cards Troca / Venda / Compra.
 */
export function computePresencaKpisConsolidados(dias: PresencaKpiDiaInput[]): PresencaKpisConsolidados {
  let escalados = 0;
  let trabalhados = 0;
  let faltas = 0;
  let trocas = 0;
  let venda = 0;
  let compra = 0;

  for (const d of dias) {
    if (d.situacao === "Escalado") {
      escalados += 1;
      if (d.temCheckIn) trabalhados += 1;
    }
    if (d.status === "Falta") faltas += 1;
    if (d.origemTrocaMarketplace || d.situacao === "Troca") trocas += 1;
    else if (d.situacao === "Venda") venda += 1;
    else if (situacaoEhCompraMarketplace(d.situacao)) compra += 1;
  }

  return { escalados, trabalhados, faltas, trocas, venda, compra };
}

const MESES_PT_UPPER = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
] as const;

const MESES_PT_TITULO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/** Mês civil estritamente anterior ao mês atual (America/Sao_Paulo). */
export function mesCalendarioPresencaFechado(refMes: Date, hoje = new Date()): boolean {
  const ref = new Date(refMes.getFullYear(), refMes.getMonth(), 1);
  const iso = hoje.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [y, m] = iso.split("-").map(Number);
  const atual = new Date(y, m - 1, 1);
  return ref.getTime() < atual.getTime();
}

/** Mês civil estritamente posterior ao mês atual (America/Sao_Paulo). */
export function mesCalendarioPresencaFuturo(refMes: Date, hoje = new Date()): boolean {
  const ref = new Date(refMes.getFullYear(), refMes.getMonth(), 1);
  const iso = hoje.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [y, m] = iso.split("-").map(Number);
  const atual = new Date(y, m - 1, 1);
  return ref.getTime() > atual.getTime();
}

/** Subtítulo do modal de aprovação mensal — ex.: «Junho de 2026». */
export function subtituloMesAnoPresencaPt(refMes: Date): string {
  const mes = MESES_PT_TITULO[refMes.getMonth()] ?? "";
  return `${mes} de ${refMes.getFullYear()}`;
}

export type PresencaMesAprovacaoLinha = {
  diaIso: string;
  dataLabel: string;
  entRealExib: string;
  saiRealExib: string;
  status: string;
};

/**
 * Exceção no mês fechado: exibir check-out no 1.º dia do mês seguinte
 * quando o último dia do mês exibido tem turno que cruza meia-noite.
 */
export function deveExibirCheckInMesFechadoPresenca(params: {
  refMes: Date;
  ultimoDiaMesEntEsc: string;
  ultimoDiaMesSaiEsc: string;
  proximoTipo?: "check_in" | "check_out" | null;
  agora?: Date;
}): boolean {
  const agora = params.agora ?? new Date();
  const proximoMes = new Date(params.refMes.getFullYear(), params.refMes.getMonth() + 1, 1);
  if (toIsoLocal(agora) !== toIsoLocal(proximoMes)) return false;
  if (params.proximoTipo !== "check_out") return false;
  if (params.ultimoDiaMesEntEsc === "—" || params.ultimoDiaMesSaiEsc === "—") return false;
  return turnoEscaladoCruzaMeiaNoite(params.ultimoDiaMesEntEsc, params.ultimoDiaMesSaiEsc);
}

/** Primeiro dia do mês civil anterior a `ref`. */
export function refPrimeiroDiaMesAnterior(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
}

/** Comparativo KPI presença — total do mês anterior fechado: «12 em JUNHO». */
export function fmtPresencaKpiComparativoMesAnterior(valor: number, mesAnteriorRef: Date): string {
  const mes = MESES_PT_UPPER[mesAnteriorRef.getMonth()] ?? "";
  return `${valor.toLocaleString("pt-BR")} em ${mes}`;
}

/** Todos os dias de um mês de referência (civil local). */
export function diasReferenciaMesPresenca(refMes: Date): Date[] {
  const y = refMes.getFullYear();
  const m = refMes.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const out: Date[] = [];
  for (let d = 1; d <= last; d++) out.push(new Date(y, m, d));
  return out;
}
