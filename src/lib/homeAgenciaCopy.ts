/** Copy dos alertas da Home de Agência (portfólio / escopo). */

export const AGENCIA_HOME_CADASTRO_INCOMPLETO_CTA = "Ir para Influencers";

export const AGENCIA_HOME_HORAS_PENDENTES_CTA = "Ir para Agenda";

export function mensagemCadastrosIncompletosAgencia(count: number): string {
  const n = count.toLocaleString("pt-BR");
  const sujeito = count === 1 ? "1 influencer" : `${n} influencers`;
  return `Há ${sujeito} no seu escopo com cadastro incompleto. Isso pode impedir o pagamento das lives. Acesse a página Influencers e conclua os itens pendentes de cada perfil.`;
}

export function mensagemHorasPendentesAgencia(count: number, horasTotal: number): string {
  const n = count.toLocaleString("pt-BR");
  const sujeito = count === 1 ? "1 influencer" : `${n} influencers`;
  const horas = horasTotal.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return `Há ${sujeito} no seu escopo com horas pendentes e sem live futura agendada (total de ${horas} horas). Realize o agendamento na página de Agenda.`;
}
