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

export type PresencaCorrecaoMeta = {
  entradaRealAnterior: string;
  saidaRealAnterior: string;
  entradaCorrigida: string;
  saidaCorrigida: string;
  observacao: string | null;
  corrigidoPorNome: string;
  corrigidoEm: string;
};

export type PresencaDiaGestao = {
  statusGestao?: PresencaGestaoStatus;
  correcao?: PresencaCorrecaoMeta;
  historico?: PresencaHistoricoItem[];
};

export type PresencaAcaoPrimaria = "aprovar" | "justificar" | null;

export type PresencaAcoesLinha = {
  acaoPrimaria: PresencaAcaoPrimaria;
  mostrarHistorico: boolean;
  mostrarTravessaoAcoes: boolean;
};

export function chavePresencaGestao(funcionarioId: string, diaIso: string): string {
  return `${funcionarioId}:${diaIso}`;
}

export function validarHorarioPresencaHHMM(valor: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(valor.trim());
}

export function normalizarHorarioPresencaHHMM(valor: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(valor.trim());
  if (!m) return valor.trim();
  return `${String(parseInt(m[1]!, 10)).padStart(2, "0")}:${m[2]}`;
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

/** Agora >= saída escalada (HH:mm) + 30 min no dia civil indicado. */
export function passouHorarioSaidaEscaladaMais30Min(diaIso: string, saiEsc: string, agora = new Date()): boolean {
  if (saiEsc === "—") return false;
  const minSaida = minutosRelogioHHmm(saiEsc);
  if (minSaida == null) return false;
  const [y, mo, d] = diaIso.split("-").map((x) => parseInt(x, 10));
  const limite = new Date(y, mo - 1, d, 0, 0, 0, 0);
  limite.setMinutes(minSaida + 30);
  return agora.getTime() >= limite.getTime();
}

export type ResolverPresencaLinhaParams = {
  situacao: string;
  diaIso: string;
  saiEsc: string;
  temCheckIn: boolean;
  temCheckOut: boolean;
  statusBase: string;
  gestao?: PresencaDiaGestao;
  agora?: Date;
};

export function resolverStatusPresencaLinha(params: ResolverPresencaLinhaParams): string {
  const { situacao, diaIso, saiEsc, temCheckIn, temCheckOut, statusBase, gestao, agora } = params;

  if (gestao?.statusGestao === "aprovado") return "Aprovado";
  if (gestao?.statusGestao === "em_analise") return "Em análise";

  if (situacao === "Escalado" && diaIsoEhAmanhaOuFuturo(diaIso, agora)) return "—";

  if (
    situacao === "Escalado" &&
    passouHorarioSaidaEscaladaMais30Min(diaIso, saiEsc, agora)
  ) {
    if (!temCheckIn && !temCheckOut) return "Falta";
    if (temCheckIn !== temCheckOut) return "Pendente";
  }

  return statusBase;
}

function historicoAcaoVisivel(gestao?: PresencaDiaGestao): boolean {
  const historico = gestao?.historico ?? [];
  return historico.some((h) => h.tipo === "aprovacao" || h.tipo === "justificativa");
}

export function resolverAcoesPresencaLinha(params: ResolverPresencaLinhaParams): PresencaAcoesLinha {
  const { situacao, diaIso, saiEsc, temCheckIn, temCheckOut, statusBase, gestao, agora } = params;
  const temHistorico = historicoAcaoVisivel(gestao);

  if (situacao === "Escalado" && diaIsoEhAmanhaOuFuturo(diaIso, agora)) {
    return { acaoPrimaria: null, mostrarHistorico: false, mostrarTravessaoAcoes: true };
  }

  if (situacao === "Folga") {
    return {
      acaoPrimaria: null,
      mostrarHistorico: temHistorico,
      mostrarTravessaoAcoes: !temHistorico,
    };
  }

  if (gestao?.statusGestao === "aprovado") {
    return {
      acaoPrimaria: null,
      mostrarHistorico: temHistorico,
      mostrarTravessaoAcoes: !temHistorico,
    };
  }

  const passouLimite =
    situacao === "Escalado" && passouHorarioSaidaEscaladaMais30Min(diaIso, saiEsc, agora);

  if (passouLimite) {
    if (!temCheckIn && !temCheckOut) {
      return { acaoPrimaria: "justificar", mostrarHistorico: temHistorico, mostrarTravessaoAcoes: false };
    }
    if (temCheckIn !== temCheckOut) {
      return { acaoPrimaria: "justificar", mostrarHistorico: temHistorico, mostrarTravessaoAcoes: false };
    }
  }

  const podeAprovar =
    situacao === "Escalado" &&
    temCheckIn &&
    temCheckOut &&
    (statusBase === "Registrado" || gestao?.statusGestao === "em_analise");

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
    historico: [...(gestao?.historico ?? []), item],
  };
}
