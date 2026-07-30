import { Send } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/academy/postagem-aprovacao";

/** Tutorial: Nova Dica/Comunicado no Portal da Academy com envio para aprovação (Editar = Próprios). */
export const TUTORIAL_POSTAGEM_ACADEMY_APROVACAO: TutorialDef = {
  id: "postagem-academy-aprovacao",
  urlSlug: "DicasAcademy",
  titulo: "Dicas Academy",
  section: "Academy",
  icon: Send,
  relatedPageKey: "academy_portal",
  relatedTabId: "gerenciamento",
  objetivo:
    "Criar uma Dica ou um Comunicado no Portal da Academy e enviar para aprovação.",
  passos: [
    {
      titulo: "1. Abrir o Gerenciamento",
      texto:
        "1. No menu, seção Academy, clique em Portal da Academy.\n2. Clique na aba Gerenciamento.\n3. Clique em Nova Postagem.",
      imagens: [
        {
          src: `${IMG}/01-gerenciamento-nova-postagem.png`,
          alt: "Aba Gerenciamento com botão Nova Postagem",
        },
      ],
    },
    {
      titulo: "2. Escolher o tipo de postagem",
      texto:
        "1. No modal Nova postagem, em Tipo de Postagem, escolha Comunicados ou Dicas.\n2. No rodapé, o botão principal é Enviar para aprovação (e também Salvar, para rascunho).",
      imagens: [
        {
          src: `${IMG}/02-modal-nova-postagem-tipo.png`,
          alt: "Modal Nova postagem — escolha do tipo e Enviar para aprovação",
        },
      ],
    },
    {
      titulo: "3. Preencher uma Dica",
      texto:
        "1. Tipo de Postagem: Dicas.\n2. Tipo de Dica: Jogos, Imagem, Comunicação ou Geral.\n— Se escolher Jogos, aparece Qual Jogo? (pode marcar mais de um).\n3. Título (obrigatório).\n4. Descrição (obrigatório) — use a barra de formatação se precisar.\n5. Imagem/Vídeo e Anexo são opcionais — use Adicionar imagem ou vídeo / Adicionar anexo.",
      imagens: [
        {
          src: `${IMG}/03-modal-dica-preenchida.png`,
          alt: "Formulário de Dica preenchido pronto para enviar",
        },
      ],
    },
    {
      titulo: "4. Preencher um Comunicado",
      texto:
        "1. Tipo de Postagem: Comunicados.\n2. Tipo de Comunicado: Treinamentos ou Geral.\n3. Título e Descrição (obrigatórios), nos mesmos padrões da Dica.\n4. Imagem/Vídeo e Anexo opcionais.",
      imagens: [
        {
          src: `${IMG}/04-modal-comunicado-campos.png`,
          alt: "Formulário de Comunicado com Enviar para aprovação",
        },
      ],
    },
    {
      titulo: "5. Salvar ou enviar para aprovação",
      texto:
        "1. Salvar: grava como Rascunho — você pode editar depois e enviar quando estiver pronto.\n2. Enviar para aprovação: envia a postagem com status Aprovação.\n3. Na tabela do Gerenciamento, acompanhe o status. Com o filtro Status da postagem, use Aprovação para ver o que ainda aguarda o aprovador.\n4. Quando um Gestor de Operações ou da Academy aprovar, o status passa a Publicado e a postagem aparece nas abas Comunicados ou Dicas.",
    },
  ],
  notasFinais:
    "— Enquanto estiver em Aprovação, a postagem ainda não aparece para a operação nas abas de leitura.\n— Você só edita as próprias postagens neste fluxo.\n— Cancelar no modal descarta o que ainda não foi salvo.",
};
