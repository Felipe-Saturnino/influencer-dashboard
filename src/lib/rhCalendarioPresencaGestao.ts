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
  if (saiEsc === "—") return false;
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

  if (gestao?.statusGestao === "aprovado") return "Aprovado";
  if (gestao?.statusGestao === "em_analise") return "Em análise";

  if (situacao === "Escalado" && diaIsoEhAmanhaOuFuturo(diaIso, agora)) return "—";

  if (
    situacao === "Escalado" &&
    passouHorarioSaidaEscaladaMais30Min(diaIso, saiEsc, agora, entEsc)
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
  const { situacao, diaIso, entEsc, saiEsc, temCheckIn, temCheckOut, statusBase, gestao, agora } = params;
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
    situacao === "Escalado" && passouHorarioSaidaEscaladaMais30Min(diaIso, saiEsc, agora, entEsc);

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
