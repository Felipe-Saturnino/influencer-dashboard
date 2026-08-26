import { Shirt } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/estudio/figurinos/retirada-devolucao";

/** Tutorial: retirada e devolução de peças — Shift Leader e liderança (Editar = Sim). */
export const TUTORIAL_FIGURINO_RETIRADA_DEVOLUCAO: TutorialDef = {
  id: "figurino-retirada-devolucao",
  urlSlug: "FigurinoRetiradaDevolucao",
  titulo: "Figurino Retirada e Devolução",
  section: "Estúdio",
  icon: Shirt,
  relatedPageKey: "rh_figurinos",
  objetivo:
    "Registrar retirada e devolução de peças disponíveis — pelo botão na tabela ou pela bipagem — classificando o estado da peça na devolução.",
  passos: [
    {
      titulo: "1. Abrir Figurinos",
      texto:
        "1. No menu, seção Estúdio, clique em **Figurinos**.\n2. Os cards no topo mostram totais do inventário (**Disponíveis**, **Emprestada**, **Fixo**, etc.) conforme os filtros ativos.\n3. Use estúdio, categoria, tamanho, cor, gênero ou a busca para localizar a peça.\n4. A aba **Disponíveis** lista peças prontas para retirada.",
      imagens: [
        {
          src: `${IMG}/01-figurinos-disponiveis.png`,
          alt: "Figurinos — aba Disponíveis com botão Retirada",
        },
      ],
    },
    {
      titulo: "2. Retirada manual (botão)",
      texto:
        "1. Na linha da peça, clique em **Retirada**.\n2. No modal, pesquise o prestador em **Pesquisar Staff...** (nome ou setor) e selecione na lista — mesma base da Gestão de Prestadores (ativos e indisponíveis).\n3. Em **Tipo de retirada**, mantenha **Emprestada** — é o fluxo da liderança para empréstimo temporário no turno.\n4. Confira **Registrado por** e a data/hora; clique em **Confirmar Retirada**.\n\nA peça sai de **Disponíveis** e passa a aparecer na aba **Emprestada**.",
      imagens: [
        {
          src: `${IMG}/02-modal-retirada-emprestada.png`,
          alt: "Modal Retirada com tipo Emprestada",
        },
        {
          src: `${IMG}/03-retirada-prestador-emprestada.png`,
          alt: "Modal Retirada com prestador selecionado",
        },
      ],
    },
    {
      titulo: "3. Retirada por bipagem",
      texto:
        "1. Na barra de filtros, clique em **Bipar código**.\n2. Aponte a pistola de leitor para a etiqueta, pressione **Enter** ou **Buscar**.\n3. Também é possível digitar o código ou código de barras manualmente. Para câmera, expanda **Usar câmera (opcional)**.\n4. Se a peça estiver **disponível**, o sistema abre o modal **Retirada** (mesmo fluxo do passo 2).\n5. Se já estiver emprestada, abre direto o modal **Devolução** (passo 5).",
      imagens: [
        {
          src: `${IMG}/04-modal-bipar-codigo.png`,
          alt: "Modal Bipar código com leitor USB",
        },
      ],
    },
    {
      titulo: "4. Conferir na aba Emprestada",
      texto:
        "1. Clique na aba **Emprestada**.\n2. A tabela exibe código, estúdio, categoria, tamanho, data do empréstimo, **Emprestado para** e **Registrado por**.\n3. Use a busca para achar a peça ou o nome do prestador.\n\nPeças do tipo **Fixo** ficam na aba **Fixo** — não misturam com empréstimos temporários.",
      imagens: [
        {
          src: `${IMG}/05-aba-emprestada-lista.png`,
          alt: "Aba Emprestada com peça retirada",
        },
      ],
    },
    {
      titulo: "5. Devolução manual (botão)",
      texto:
        "1. Na aba **Emprestada**, clique em **Devolução** na linha da peça.\n2. O modal mostra os dados da retirada ativa (prestador e data).\n3. Em **Condição da devolução**, escolha uma opção:\n\n— **Boa condição** (verde) — peça volta ao estoque disponível.\n— **Possível descarte** (amarelo) — peça disponível, mas marcada para avaliação; a **Observações** é obrigatória.\n— **Manutenção** (roxo) — envia para manutenção; informe **Tipo** (Costura, Lavagem, Perda ou Descarte) e **Motivo**.\n4. Clique em **Confirmar devolução**.\n\nApós **Boa condição** ou **Possível descarte**, a peça retorna à aba **Disponíveis**. **Manutenção** move para a aba **Manutenção**.",
      aviso:
        "A classificação na devolução atualiza o status e a condição da peça no inventário. Escolha conforme o estado físico real ao receber a peça.",
      imagens: [
        {
          src: `${IMG}/06-modal-devolucao-condicao.png`,
          alt: "Modal Devolução com opções de condição",
        },
        {
          src: `${IMG}/07-devolucao-boa-condicao.png`,
          alt: "Devolução com Boa condição selecionada",
        },
      ],
    },
    {
      titulo: "6. Devolução por bipagem",
      texto:
        "1. Com a peça ainda emprestada, abra **Bipar código** e leia a etiqueta (ou digite o código).\n2. O sistema reconhece retirada ativa e abre o modal **Devolução** — não é necessário buscar na tabela.\n3. Classifique a condição e confirme como no passo 5.\n\nO mesmo atalho vale para qualquer peça em **Emprestada** ou **Fixo** visível ao seu perfil.",
      imagens: [
        {
          src: `${IMG}/08-pos-devolucao-disponiveis.png`,
          alt: "Peça de volta na aba Disponíveis após devolução",
        },
      ],
    },
  ],
  notasFinais:
    "— **Emprestada** = empréstimo temporário (turno); **Fixo** = alocação contínua — usado apenas pela equipe de Figurino.\n— Peças em **Manutenção** ou **Descartada** não abrem fluxo de retirada/devolução pela bipagem — a tela avisa o status.\n— O histórico completo da peça fica no detalhe ao clicar no **código** na tabela.",
};
