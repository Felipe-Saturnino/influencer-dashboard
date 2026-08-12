import { IdCard } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/gestao-staff";

/** Tutorial: editar cadastro operacional do prestador em Gestão de Staff. */
export const TUTORIAL_GESTAO_STAFF_EDITAR: TutorialDef = {
  id: "gestao-staff-editar",
  urlSlug: "GestaoDeStaffEditar",
  titulo: "Editar Staff",
  section: "Escala",
  icon: IdCard,
  relatedPageKey: "rh_staff",
  objetivo:
    "Atualizar os dados de função, skills e dealer de um prestador na Gestão de Staff.",
  passos: [
    {
      titulo: "1. Abrir a Gestão de Staff",
      texto:
        "1. No menu, seção Escala, clique em Gestão de Staff.\n2. Os cards do topo mostram quem ainda está sem dados operacionais, cadastrais (gênero, bio e fotos) ou de jogo — clique no nome para abrir a edição.\n3. Também pode buscar por nome ou nickname, filtrar por estúdio e turno, e usar o carrossel de times.\n4. Na tabela, na coluna Ações, clique no ícone de lápis (Editar Prestador).",
      imagens: [
        {
          src: `${IMG}/01-gestao-staff-lista.png`,
          alt: "Gestão de Staff com cards de pendências e tabela de prestadores",
        },
      ],
    },
    {
      titulo: "2. Aba Dados de função",
      texto:
        "1. O modal Editar abre na aba Dados de função.\n2. Preencha ou ajuste Nickname, Estúdio, Turno, ID operacional e Barcode.\n3. Função e Escala são somente leitura — vêm do cadastro de RH.\n4. Em alguns times o Estúdio fica fixo em Todos Estúdios.",
      imagens: [
        {
          src: `${IMG}/02-editar-dados-funcao.png`,
          alt: "Modal Editar — aba Dados de função",
        },
      ],
    },
    {
      titulo: "3. Aba Dados de skills",
      texto:
        "1. Clique na aba Dados de skills.\n2. Informe Live no Estúdio (data).\n3. Fim do Treinamento é somente leitura.\n4. Para cada jogo (Baccarat, Blackjack, VIP, Roleta, Futebol Brasileiro), escolha Ativo, Treinamento ou Inativo.",
      imagens: [
        {
          src: `${IMG}/03-editar-dados-skills.png`,
          alt: "Modal Editar — aba Dados de skills",
        },
      ],
    },
    {
      titulo: "4. Aba Gestão de dealer (Game Presenter)",
      texto:
        "1. Em prestadores do time Game Presenter, clique na aba Gestão de dealer.\n2. Selecione o Gênero.\n3. Preencha a Bio do Dealer.\n4. Em Fotos, use Adicionar fotos (ou arraste / cole Ctrl+V).\n5. Em outros times essa aba não aparece.",
      imagens: [
        {
          src: `${IMG}/04-editar-gestao-dealer.png`,
          alt: "Modal Editar — aba Gestão de dealer",
        },
      ],
    },
    {
      titulo: "5. Salvar",
      texto:
        "1. Depois de revisar as abas, clique em Salvar — as alterações de todas as abas são gravadas de uma vez.\n2. O histórico do prestador registra o que mudou.",
    },
  ],
  notasFinais:
    "— Os cards Perfis sem dados operacionais / cadastrais / de jogo ajudam a priorizar quem ainda falta completar.\n— Service Manager também pode ter o campo ID TOS na aba Dados de função.",
};
