import { SlidersHorizontal } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/conteudo/portal-rh";

/** Tutorial: criar, editar e arquivar postagens no Gerenciamento do Portal de RH. */
export const TUTORIAL_PORTAL_RH_GERENCIAMENTO: TutorialDef = {
  id: "portal-rh-gerenciamento-postagens",
  urlSlug: "PortalRhGerenciamentoPostagens",
  titulo: "Gerenciamento de Postagens",
  section: "Conteúdo",
  icon: SlidersHorizontal,
  relatedPageKey: "rh_portal",
  relatedTabId: "gerenciamento",
  objetivo:
    "Criar uma nova postagem, editar uma já publicada e arquivar postagens no Portal de RH.",
  passos: [
    {
      titulo: "1. Abrir o Gerenciamento de Postagens",
      texto:
        "1. No menu, seção Conteúdo, clique em Portal de RH.\n2. Clique na aba Gerenciamento de Postagens.\n3. Use a busca e os filtros de tipo e status para localizar postagens.\n4. Clique em Nova Postagem para começar um cadastro.",
      imagens: [
        {
          src: `${IMG}/03-gerenciamento-lista.png`,
          alt: "Aba Gerenciamento de Postagens com tabela e botão Nova Postagem",
        },
      ],
    },
    {
      titulo: "2. Criar e publicar",
      texto:
        "1. Em Tipo de Postagem, escolha Comunicados, Políticas e Normativas ou RH Talks.\n2. Preencha os campos obrigatórios do tipo escolhido (por exemplo, em Comunicados: tipo, assunto e descrição).\n3. Inclua imagem ou anexo se precisar.\n4. Clique em Salvar para guardar rascunho, ou em Publicar para disponibilizar nas abas de leitura.",
      imagens: [
        {
          src: `${IMG}/04-criar-postagem.png`,
          alt: "Modal Criar postagem com tipo Comunicados e campos do formulário",
        },
      ],
    },
    {
      titulo: "3. Editar uma postagem existente",
      texto:
        "1. Na tabela do Gerenciamento, na coluna Ações, clique no ícone de lápis (Editar postagem).\n2. Ajuste os campos necessários.\n3. Em postagens já publicadas, clique em Salvar alterações — a postagem continua publicada, sem recriar a data de publicação.",
      imagens: [
        {
          src: `${IMG}/05-editar-postagem.png`,
          alt: "Modal Editar postagem com campos preenchidos e Salvar alterações",
        },
      ],
    },
    {
      titulo: "4. Arquivar",
      texto:
        "1. Em postagens com status Publicado, na coluna Ações, clique no ícone de arquivar.\n2. Confirme no pop-up Arquivar.\n3. A postagem deixa de aparecer nas abas de leitura (Comunicados, Políticas e RH Talks) e passa a status Arquivado no Gerenciamento — esta ação não poderá ser desfeita.",
      imagens: [
        {
          src: `${IMG}/06-arquivar-postagem.png`,
          alt: "Pop-up de confirmação para arquivar a postagem",
        },
      ],
    },
  ],
  notasFinais:
    "— Postagens arquivadas continuam visíveis no Gerenciamento (filtro Status). Use o ícone Ver para ler o conteúdo e consultar o histórico da postagem.",
};
