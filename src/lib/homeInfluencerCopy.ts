/** Copy dos alertas da Home de Influencer. */
export const INFLUENCER_HOME_CADASTRO_INCOMPLETO_MENSAGEM =
  "Você ainda não concluiu o seu cadastro, isso impede o pagamento das lives realizadas. Acesse a página Influencers e preencha todos os itens pendentes das suas informações.";

export const INFLUENCER_HOME_CADASTRO_INCOMPLETO_CTA = "Ir para Influencers";

export const INFLUENCER_HOME_PLAYBOOK_CTA = "Ir para Playbook";

export const INFLUENCER_HOME_HORAS_PENDENTES_CTA = "Ir para Agenda";

/** Alerta: cota com saldo e nenhuma live futura agendada. */
export function mensagemHorasPendentesHome(horas: number): string {
  const x = horas.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return `Você ainda tem ${x} horas pendentes, realize o agendamento da próxima live na página de Agenda.`;
}

export const INFLUENCER_HOME_WELCOME_SUBTITLE =
  "Spin. Play. Win.\nAcompanhe cada passo da sua jornada.";

export const INFLUENCER_HOME_ROLE_LABEL = "Influenciador";
