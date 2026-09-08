import { Bell } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/estudio/controle-turno/notificacoes";

/** Tutorial: registrar e acompanhar quadros da aba Notificações do Controle de Turno. */
export const TUTORIAL_CONTROLE_TURNO_NOTIFICACOES: TutorialDef = {
  id: "controle-turno-notificacoes",
  urlSlug: "ControleTurnoNotificacoes",
  titulo: "Notificação",
  section: "Estúdio",
  icon: Bell,
  relatedPageKey: "escala_controle_turno",
  relatedTabId: "notificacoes",
  objetivo:
    "Registrar fechamentos, ausências, feedbacks e manutenções na aba Notificações e acompanhar o atendimento pelas demais áreas.",
  passos: [
    {
      titulo: "1. Abrir a aba Notificações",
      texto:
        "1. No menu, seção Estúdio, clique em **Controle de Turno**.\n2. Clique na aba **Notificações**.\n3. Escolha o **dia** no carrossel (ou **Hoje**). O filtro de turno não aparece — os registros são por dia.\n4. A página tem **quatro blocos**: **Fechamento de Mesa**, **Ausências Prolongadas**, **Feedbacks** e **Solicitação de Manutenção**.\n5. Itens em aberto (mesa não reaberta, ausência sem fim, feedback a revisar, manutenção aberta ou em andamento) **continuam visíveis** nos dias seguintes até serem resolvidos.",
      imagens: [
        {
          src: `${IMG}/01-aba-notificacoes.png`,
          alt: "Aba Notificações com os quatro blocos",
        },
      ],
    },
    {
      titulo: "2. Fechamento de Mesa",
      texto:
        "1. Clique em **Registrar Fechamento**.\n2. Selecione uma ou mais mesas.\n3. Para cada mesa, informe **Data de Fechamento** e **Hora de Fechamento**.\n4. Informe **Data de Abertura** e **Hora de Abertura**, ou marque **Mesa ainda não foi reaberta**.\n5. Observação é opcional. Salve o registro.\n6. Na tabela, o status do dia fica **Não aberta** ou **Reaberta**. Com **Editar**, use o lápis para atualizar a reabertura.\n7. Se a mesa ficar fechada de um dia para o outro, o registro aparece em **todos** os dias do intervalo até a abertura.",
      imagens: [
        {
          src: `${IMG}/02-fechamento-mesa.png`,
          alt: "Modal Registrar Fechamento de Mesa",
        },
      ],
    },
    {
      titulo: "3. Ausências Prolongadas",
      texto:
        "1. Clique em **Registrar Ausência**.\n2. Selecione o prestador, o **Motivo** (**Médico** ou **Pessoal**), o **Início da Ausência** e o **Fim da Ausência** (ou marque que o fim ainda não foi informado).\n3. Salve. A linha fica no bloco com início, fim e liderança que registrou.\n4. Com **Editar**, atualize o fim quando a ausência encerrar — enquanto estiver aberta, o item segue aparecendo nos dias seguintes.\n\n**Motivo Médico:** use este quadro só se o prestador **ainda não tiver atestado**. Se já tiver o documento, o encaminhamento ao RH é pela página **Calendário** (fluxo de justificativa de presença).",
      imagens: [
        {
          src: `${IMG}/03-ausencia-prolongada.png`,
          alt: "Modal Registrar Ausência Prolongada",
        },
      ],
    },
    {
      titulo: "4. Feedbacks",
      texto:
        "1. Clique em **Registrar Feedback**.\n2. Selecione o **Time** (Game Presenter ou Shuffler) e o **Prestador**.\n3. Escolha a **Recomendação**: Orientação, Alinhamento de Execução, Notificação de Descumprimento Contratual, Notificação de Suspensão da Execução Contratual ou Persistência do Descumprimento.\n4. Se a recomendação for **Orientação**, o campo de texto chama-se **Ata da Orientação**; nos demais, **Observação**. Preencha e salve.\n5. O status inicial é **Revisar**. Todas as recomendações são aprovadas pela Gerência e RH em outra página.\n6. Acompanhe aqui a coluna **Status** (**Revisar** / **Aplicado** / **Rejeitado**) e **Aplicado Por** quando o RH e Gerência concluir.",
      imagens: [
        {
          src: `${IMG}/04-registrar-feedback.png`,
          alt: "Modal Registrar Feedback",
        },
      ],
    },
    {
      titulo: "5. Solicitação de Manutenção",
      texto:
        "1. Clique em **Solicitar Manutenção**.\n2. Selecione o **Tipo** (**TI**, **Limpeza** ou **Tech Ops**), o **Local** e, se for estúdio, a **Mesa**.\n3. Preencha a **Observação** e salve.\n4. O status inicia como **Aberto**. As áreas responsáveis atualizam para **Em andamento** e **Concluído** fora desta tela de registro.\n5. Com **Editar**, a liderança pode **Cancelar** pedidos ainda **Aberto** ou **Em andamento**.\n6. Use a tabela do bloco para acompanhar abertura, tipo, local, status e solicitante ao longo dos dias.",
      imagens: [
        {
          src: `${IMG}/05-solicitar-manutencao.png`,
          alt: "Modal Solicitar Manutenção",
        },
      ],
    },
    {
      titulo: "6. Acompanhar atendimentos no dia a dia",
      texto:
        "1. Volte à aba **Notificações** nos dias seguintes com o carrossel — itens não resolvidos **reaparecem** até fecharem.\n2. **Fechamento:** espere **Reaberta** (ou edite a abertura quando a mesa voltar).\n3. **Ausência:** complete o **Fim da Ausência** quando souber.\n4. **Feedback:** acompanhe **Revisar** → **Aplicado** (ou **Rejeitado**) após o RH em Solicitações.\n5. **Manutenção:** acompanhe **Aberto** → **Em andamento** → **Concluído** (ou cancele se não for mais necessário).\n6. Use a busca por mesa, prestador ou palavra-chave e o ícone **Ver** em cada linha para o detalhe completo.",
      imagens: [
        {
          src: `${IMG}/06-acompanhar-status.png`,
          alt: "Tabelas da aba Notificações com status de atendimento",
        },
      ],
    },
  ],
};
