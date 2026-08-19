import { AlertTriangle } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/estudio/incidentes";

/** Tutorial: abrir e editar incidente — público Service Manager (Editar = Sim). */
export const TUTORIAL_NOVO_INCIDENTE: TutorialDef = {
  id: "novo-incidente",
  urlSlug: "NovoIncidente",
  titulo: "Novo Incidente",
  section: "Estúdio",
  icon: AlertTriangle,
  relatedPageKey: "incidentes",
  relatedTabId: "tickets",
  objetivo: "Registrar um novo incidente de mesa e editar um ticket já aberto.",
  passos: [
    {
      titulo: "1. Abrir a página Incidentes",
      texto:
        "1. No menu, seção Estúdio, clique em Incidentes.\n2. A aba Tickets lista os registros do período, com KPIs por categoria e a tabela de protocolos.\n3. Use o carrossel de mês, Histórico, estúdio e os filtros (Time, Incidente, Tipo, Staff, Relator) para localizar tickets.\n4. Na linha da tabela, o ícone de olho abre a visualização; o lápis abre a edição.",
      imagens: [
        {
          src: `${IMG}/01-incidentes-tickets-novo.png`,
          alt: "Aba Tickets com botão Novo Incidente",
        },
      ],
    },
    {
      titulo: "2. Preencher o formulário",
      texto:
        "1. Clique em Novo Incidente.\n2. No topo do modal, escolha o Time: Game Presenter ou Shuffler — os campos e tipos mudam conforme o time.\n3. Preencha Mesa e Tipo (o Tipo só libera depois da Mesa).\n4. Ajuste Incidente (Caso, Erro, Oculto, Não Avisado, Avisado/Resolvido ou Avisado/Não Resolvido), Resolução e Payout necessário.\n5. Selecione o Prestador, informe o ID da Rodada (ou marque Não tem ID), a Data e a Hora da Rodada no formato HH:MM:SS.\n6. Em Descrição, escreva o ocorrido. Em alguns Tipos aparece Scripts — clique no nome do script para preencher a descrição e edite se precisar.\n7. Se houver evidência, use Adicionar anexo (imagem ou vídeo, até 50 MB). Clique na miniatura para ampliar antes de registrar.",
      imagens: [
        {
          src: `${IMG}/02-novo-incidente-formulario.png`,
          alt: "Modal Novo Incidente em branco",
        },
        {
          src: `${IMG}/03-novo-incidente-preenchido.png`,
          alt: "Modal Novo Incidente preenchido com mesa, tipo e descrição",
        },
      ],
    },
    {
      titulo: "3. Registrar — três botões no rodapé",
      texto:
        "1. No rodapé há três ações com cores distintas — escolha conforme o próximo passo do turno.\n2. **Registrar e Criar Outro** (âmbar): salva o ticket, atualiza a tabela e mantém o modal aberto. Permanecem Time, Mesa, Prestador, Data da Rodada, categoria Incidente, Resolução e Payout; limpam ID da Rodada, Hora, Tipo, Descrição e anexos. Use quando forem vários incidentes seguidos na mesma mesa ou com o mesmo prestador.\n3. **Registrar Incidente** (gradiente roxo/azul): salva e fecha o modal — o protocolo é gerado automaticamente (CASO-, ERRO- ou OCULTO-). Use quando terminou o lote de registros.\n4. **Registrar e Criar Novo** (azul): salva, atualiza a tabela e mantém o modal aberto com formulário totalmente limpo (Time Game Presenter, data de hoje e demais campos vazios). Use para um incidente sem relação com o anterior.\n5. Com Criar Outro ou Criar Novo, uma mensagem verde confirma o protocolo registrado antes de preencher o próximo.",
      aviso:
        "Campos com asterisco são obrigatórios. A Hora da Rodada aceita no máximo 9 caracteres no formato HH:MM:SS.",
      imagens: [
        {
          src: `${IMG}/03-novo-incidente-preenchido.png`,
          alt: "Rodapé do modal Novo Incidente com os três botões de registro",
        },
      ],
    },
    {
      titulo: "4. Editar um incidente",
      texto:
        "1. Na tabela, clique no ícone de lápis (Editar Incidente) na linha desejada.\n2. O modal Editar Incidente mostra o Protocolo somente leitura e os demais campos preenchidos.\n3. Altere o que for necessário — novos anexos são acrescentados aos já existentes.\n4. Clique em Salvar Alterações — no modo edição não aparecem os botões Criar Outro nem Criar Novo.",
      aviso:
        "Se mudar a categoria Incidente entre famílias (Caso, Erro ou Oculto), o protocolo é regenerado automaticamente. Mudanças dentro da mesma família (ex.: Erro → Não Avisado) mantêm o mesmo protocolo.",
      imagens: [
        {
          src: `${IMG}/04-editar-incidente.png`,
          alt: "Modal Editar Incidente com protocolo e Salvar Alterações",
        },
      ],
    },
  ],
  notasFinais:
    "— O Relator do ticket criado é o usuário logado; a data de Abertura na tabela é o momento do registro, não a data/hora da rodada.\n— Depois de registrar, os filtros da aba Tickets permanecem como você havia escolhido.",
};
