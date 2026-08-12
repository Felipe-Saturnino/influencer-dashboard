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
      titulo: "2. Abrir Novo Incidente",
      texto:
        "1. Clique em Novo Incidente.\n2. No topo do modal, escolha o Time: Game Presenter ou Shuffler — os campos e tipos mudam conforme o time.\n3. Preencha Mesa e Tipo (o Tipo só libera depois da Mesa).\n4. Ajuste Incidente (Caso, Erro, Oculto, Não Avisado, Avisado/Resolvido ou Avisado/Não Resolvido), Resolução e Payout necessário.\n5. Selecione o Prestador, informe o ID da Rodada (ou marque Não tem ID), a Data e a Hora da Rodada no formato HH:MM:SS.\n6. Em Descrição, escreva o ocorrido. Em alguns Tipos aparece Scripts — clique no nome do script para preencher a descrição e edite se precisar.\n7. Se houver evidência, use Adicionar anexo (imagem ou vídeo, até 50 MB).",
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
      titulo: "3. Registrar o incidente",
      texto:
        "1. Clique em Registrar Incidente para salvar e fechar o modal — o protocolo é gerado automaticamente (CASO-, ERRO- ou OCULTO-).\n2. Ou use Registrar e criar outro: o ticket é gravado, a lista atualiza e o modal permanece aberto para o próximo registro (mantém Time, Mesa, Prestador, Data e classificação; limpa ID, hora, tipo, descrição e anexos).",
      aviso:
        "Campos com asterisco são obrigatórios. A Hora da Rodada aceita no máximo 9 caracteres no formato HH:MM:SS.",
    },
    {
      titulo: "4. Editar um incidente",
      texto:
        "1. Na tabela, clique no ícone de lápis (Editar Incidente) na linha desejada.\n2. O modal Editar Incidente mostra o Protocolo somente leitura e os demais campos preenchidos.\n3. Altere o que for necessário — novos anexos são acrescentados aos já existentes.\n4. Clique em Salvar Alterações.",
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
    "— O Relator do ticket criado é o usuário logado; a data de Abertura na tabela é o momento do registro, não a data/hora da rodada.",
};
