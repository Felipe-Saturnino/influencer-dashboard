/** Copy dos alertas da Home de Agência (portfólio / escopo). */

const NOMES_PREVIEW = 5;

export const AGENCIA_HOME_CADASTRO_INCOMPLETO_CTA = "Ir para Influencers";

export const AGENCIA_HOME_HORAS_PENDENTES_CTA = "Ir para Agenda";

/** Junta nomes em PT-BR: «A», «A e B», «A, B e C». */
function juntarNomesPt(nomes: string[]): string {
  if (nomes.length === 0) return "";
  if (nomes.length === 1) return nomes[0]!;
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/** Amostra A–Z já limitada pelo caller; só nome artístico. */
function trechoNomesParenteses(count: number, nomesArtisticos: string[]): string {
  const preview = nomesArtisticos
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, NOMES_PREVIEW);
  if (preview.length === 0) return "";
  const lista = juntarNomesPt(preview);
  const resto = count - preview.length;
  const mais = resto > 0 ? ` — e mais ${resto.toLocaleString("pt-BR")}` : "";
  return ` (${lista}${mais})`;
}

export function mensagemCadastrosIncompletosAgencia(
  count: number,
  nomesArtisticos: string[] = [],
): string {
  const n = count.toLocaleString("pt-BR");
  const sujeito = count === 1 ? "1 influencer" : `${n} influencers`;
  const nomes = trechoNomesParenteses(count, nomesArtisticos);
  return `Há ${sujeito}${nomes} da sua agência com cadastro incompleto. Isso pode impedir o pagamento das lives. Acesse a página Influencers e conclua os itens pendentes de cada perfil.`;
}

export function mensagemHorasPendentesAgencia(
  count: number,
  horasTotal: number,
  nomesArtisticos: string[] = [],
): string {
  const n = count.toLocaleString("pt-BR");
  const sujeito = count === 1 ? "1 influencer" : `${n} influencers`;
  const horas = horasTotal.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  const nomes = trechoNomesParenteses(count, nomesArtisticos);
  return `Há ${sujeito}${nomes} na sua agência com horas pendentes e sem live futura agendada (total de ${horas} horas). Realize o agendamento na página de Agenda.`;
}
