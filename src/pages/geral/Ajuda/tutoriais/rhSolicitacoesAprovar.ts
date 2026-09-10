import { ClipboardList } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/rh/solicitacoes";

/** Tutorial: aprovar atestado em Solicitações (seção RH) — visão do time de RH. */
export const TUTORIAL_RH_SOLICITACOES_APROVAR: TutorialDef = {
  id: "rh-solicitacoes-aprovar",
  urlSlug: "RhSolicitacoesAprovar",
  titulo: "Aprovar Atestado",
  section: "RH",
  icon: ClipboardList,
  relatedPageKey: "rh_solicitacoes",
  relatedTabId: "atestados",
  objetivo:
    "Como membro do RH, atender a solicitação de atestado — conferir o documento, definir abono remunerado e gravar o parecer.",
  passos: [
    {
      titulo: "1. Abrir a aba Atestados",
      texto:
        "1. No menu, seção RH, clique em **Solicitações**.\n2. O carrossel de status abre em **Em análise** — fila dos pedidos pendentes.\n3. Na segunda linha da barra, a aba **Atestados** já lista só esse tipo.\n4. Atestados entram nesta fila quando o prestador registra justificativa **Médico** no **Calendário** (Controle de Presença), com status **Em análise**.",
      aviso:
        "Gestores e outros perfis com permissão de **Ver** podem acompanhar os atestados na lista. A **aprovação** (ação **Atender** e parecer) é exclusiva do time de **RH**, com permissão de **Editar**.",
      imagens: [
        {
          src: `${IMG}/01-lista-em-analise.png`,
          alt: "Solicitações — aba Atestados em Em análise",
        },
      ],
    },
    {
      titulo: "2. Abrir Atender e conferir os dados",
      texto:
        "1. Com o carrossel em **Em análise**, na coluna **Ações** clique no ícone de lápis (**Atender solicitação**).\n2. No modal **Atender solicitação**, a aba **Dados** mostra solicitante, tipo, status **Em análise** e o período do atestado.\n3. Abra o **anexo** do documento e confira se o período e o arquivo estão corretos antes de decidir.",
      imagens: [
        {
          src: `${IMG}/02-atender-atestado-dados.png`,
          alt: "Modal Atender solicitação — aba Dados de um atestado",
        },
      ],
    },
    {
      titulo: "3. Aprovar o atestado",
      texto:
        "1. Clique na aba **Atendimento**.\n2. Em **Status**, escolha **Aprovado**.\n3. Em **Abono remunerado?**, selecione **SIM** ou **NÃO** — o campo é obrigatório neste tipo.\n4. Preencha **Observação do RH** (obrigatória ao mudar o status).\n5. Clique em **Salvar**.\n6. A solicitação sai de **Em análise** e passa para o carrossel **Aprovado**. A ação **Atender** some; fica só **Ver**.",
      imagens: [
        {
          src: `${IMG}/03-atender-atestado-aprovacao.png`,
          alt: "Aba Atendimento com Status Aprovado e Abono remunerado SIM",
        },
      ],
    },
    {
      titulo: "4. Abono remunerado = SIM",
      texto:
        "Ao aprovar com **Abono remunerado? = SIM**:\n\n1. O prestador **recebe o pagamento** correspondente aos **dias em que estava escalado** no período do afastamento (dias de **Escalado**, **Troca** ou **Compra** no Calendário).\n2. No **Calendário** (Controle de Presença), o Status desses dias passa a **Abonado**. Dias do período que não eram escala (ex.: Folga) mantêm o Status que já tinham — **não** entram no pagamento do abono.\n3. Na **Escala**, o período inteiro grava **Atestado** (inclusive Folga ou Venda).\n4. Vendas de Folga ainda abertas no **Marketplace** nesse intervalo são **canceladas**.",
      aviso:
        "Abono = SIM não é só um rótulo no Calendário: impacta o pagamento dos dias escalados em que o membro esteve afastado.",
    },
    {
      titulo: "5. Abono remunerado = NÃO e rejeição",
      texto:
        "1. Com **Abono remunerado? = NÃO**, o Status no Calendário fica **Atestado** em **todos** os dias do período — **sem** pagamento de abono pelos dias escalados.\n2. A Escala ainda grava **Atestado** em todo o período e o Marketplace cancela vendas de Folga abertas no intervalo.\n3. Para **rejeitar**: na aba **Atendimento**, Status **Rejeitado**, **Observação do RH** e **Salvar**. No Calendário, o Status desses dias volta a **Falta**. A solicitação fica no carrossel **Rejeitado**, só com a ação **Ver**.",
    },
  ],
  notasFinais:
    "— Solicitações já aprovadas ou rejeitadas ficam só com a ação **Ver**.\n— Reuniões, vagas e feedbacks nesta página têm fluxos próprios nas respectivas abas — este tutorial cobre apenas **Atestados**.",
};
