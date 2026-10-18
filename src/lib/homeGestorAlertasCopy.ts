const HORAS_PENDENTES_NOMES_PREVIEW = 5;

/** Junta nomes em PT-BR: «A», «A e B», «A, B e C». */
function juntarNomesPt(nomes: string[]): string {
  if (nomes.length === 0) return "";
  if (nomes.length === 1) return nomes[0]!;
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/**
 * Alerta Home Gestor de Aquisição — horas pendentes sem agenda.
 * `nomesArtisticos` = amostra (já limitada/ordenada pelo caller); só nome artístico.
 */
export function mensagemHorasPendentesPortfolio(
  count: number,
  nomesArtisticos: string[] = [],
): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "influencer" : "influencers";
  const base = `Há ${n} ${s} com horas pendentes da cota e sem live futura agendada`;
  const preview = nomesArtisticos
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, HORAS_PENDENTES_NOMES_PREVIEW);
  if (preview.length === 0) {
    return `${base}. Priorize o agendamento na Agenda.`;
  }
  const lista = juntarNomesPt(preview);
  const resto = count - preview.length;
  const mais =
    resto > 0 ? ` — e mais ${resto.toLocaleString("pt-BR")}` : "";
  return `${base}: ${lista}${mais}. Priorize o agendamento na Agenda.`;
}

export function mensagemResultadosPendentes48h(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "live realizada" : "lives realizadas";
  return `Há ${n} ${s} há mais de 48 horas sem resultado registrado. Complete em Resultados.`;
}

export function mensagemPagamentosAguardando7d(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "pagamento" : "pagamentos";
  return `Há ${n} ${s} em Em análise ou Aguard. pagamento há mais de 7 dias no mesmo status. Revise no Financeiro.`;
}

export function mensagemUtmsPendentes(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "UTM/link pendente" : "UTMs/links pendentes";
  return `Há ${n} ${s} de mapeamento. Conclua em Gestão de Links.`;
}

export function mensagemEscalaNaoAprovada(diasUteis: number, areasLabel: string, mesLabel: string): string {
  const d = diasUteis.toLocaleString("pt-BR");
  const diaTxt = diasUteis === 1 ? "dia útil" : "dias úteis";
  return `Faltam ${d} ${diaTxt} para o fim de ${mesLabel} e a Escala Estúdio ainda não está aprovada (${areasLabel}). Aprove para alimentar o Calendário e o Controle de Turno.`;
}

export function mensagemOsSolicitadas(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "ordem de saída solicitada" : "ordens de saída solicitadas";
  return `Há ${n} ${s} aguardando atendimento. Abra Ordem de Saída.`;
}

export function mensagemPortalAprovacao(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "postagem" : "postagens";
  return `Há ${n} ${s} do Portal da Academy em Aprovação. Revise no Portal.`;
}

export function mensagemMetaAvaliacoes(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "prestador está" : "prestadores estão";
  return `${n} ${s} abaixo da meta de 3 avaliações no mês. Priorize no Performance Hub.`;
}

export function mensagemSolicitacoesRhEmAnalise(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "solicitação" : "solicitações";
  return `Há ${n} ${s} de RH Em análise. Atenda em Solicitações de RH.`;
}

export function mensagemDenunciasAbertas(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "denúncia" : "denúncias";
  return `Há ${n} ${s} em Relatado ou Em avaliação na Central de Denúncias.`;
}

export function mensagemFalhasStatusTecnico(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const s = count === 1 ? "falha" : "falhas";
  return `Há ${n} ${s} de Status Técnico nas últimas 48 horas. Verifique em Status Técnico.`;
}
