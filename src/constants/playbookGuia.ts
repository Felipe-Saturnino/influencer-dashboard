/** Mesmas chaves obrigatórias do Playbook (abas com ciência pendente). */
export const PLAYBOOK_ITENS_OBRIGATORIOS = [
  "dealers_boas_praticas",
  "agendamento_lives",
  "prioridade_jogos",
] as const;

export type PlaybookItemObrigatorio = (typeof PLAYBOOK_ITENS_OBRIGATORIOS)[number];
