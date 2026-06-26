export type PresencaGestaoStatus = "aprovado" | "em_analise";

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
  statusGestao: PresencaGestaoStatus;
  correcao?: PresencaCorrecaoMeta;
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

/** Mescla status operacional de ponto com gestão (aprovação / correção). */
export function statusExibicaoPresencaLinha(
  statusOperacional: string,
  gestao: PresencaDiaGestao | undefined,
): string {
  if (gestao?.statusGestao === "aprovado") return "Aprovado";
  if (gestao?.statusGestao === "em_analise") return "Em análise";
  return statusOperacional;
}
