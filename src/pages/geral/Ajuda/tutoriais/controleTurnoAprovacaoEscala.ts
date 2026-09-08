import { ClipboardCheck } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/estudio/controle-turno/aprovacao-escala";

/** Tutorial: sinalizar presença e aprovar dias na aba Escala do Turno (liderança). */
export const TUTORIAL_CONTROLE_TURNO_APROVACAO_ESCALA: TutorialDef = {
  id: "controle-turno-aprovacao-escala",
  urlSlug: "ControleTurnoAprovacaoEscala",
  titulo: "Aprovação de Escala de Turno",
  section: "Estúdio",
  icon: ClipboardCheck,
  relatedPageKey: "escala_controle_turno",
  relatedTabId: "escala",
  objetivo:
    "Na aba Escala do Turno, registrar falta, saída antecipada, hora adicional ou horário manual e aprovar os dias dos prestadores.",
  passos: [
    {
      titulo: "1. Abrir a Escala do Turno",
      texto:
        "1. No menu, seção Estúdio, clique em **Controle de Turno**.\n2. A aba **Escala do Turno** já vem selecionada.\n3. Escolha o **dia** no carrossel (ou use **Hoje**) e o **turno** (Manhã, Tarde ou Noite).\n4. No bloco **Consolidado**, veja totais de Game Presenters e Shuffler; clique no card para filtrar a tabela.\n5. Em **Controle de Presença**, a tabela lista Nome, Nickname, Time, Estúdio, Entrada, Saída, Status e **Aprovado** (Sim/Não).",
      imagens: [
        {
          src: `${IMG}/01-escala-do-turno.png`,
          alt: "Controle de Turno — aba Escala do Turno com consolidado e tabela",
        },
      ],
    },
    {
      titulo: "2. Abrir o modal Registrar",
      texto:
        "1. Na linha do prestador, clique no ícone **Registrar** (folha com +).\n2. O modal **Registrar** mostra nome, nickname, turno e data.\n3. Em **Status**, escolha uma das opções: **Falta**, **Saída Antecipada**, **Hora Adicional** ou **Registrar Horário**.\n4. **Aprovar** não fica neste modal — é ação separada na linha.",
      aviso:
        "Registrar atualiza status e horários, mas **não** marca a coluna Aprovado. A aprovação é outro passo.",
      imagens: [
        {
          src: `${IMG}/02-modal-registrar.png`,
          alt: "Modal Registrar com opções de status",
        },
      ],
    },
    {
      titulo: "3. Sinalizar Falta",
      texto:
        "1. Em **Status**, selecione **Falta**.\n2. Preencha **Motivo da Falta** (obrigatório).\n3. Clique em **Salvar**.\n4. Na tabela, o Status passa a **Falta**. Entrada e Saída ficam vazias.\n5. A coluna **Aprovado** continua **Não** até a ação **Aprovar**.",
      imagens: [
        {
          src: `${IMG}/03-registrar-falta.png`,
          alt: "Modal Registrar — Falta com motivo",
        },
      ],
    },
    {
      titulo: "4. Saída Antecipada, Hora Adicional ou Registrar Horário",
      texto:
        "Use quando o prestador saiu antes, ficou além do turno ou o check-in/check-out do Calendário falhou.\n\n1. Em **Status**, escolha **Saída Antecipada**, **Hora Adicional** ou **Registrar Horário**.\n2. Preencha **Entrada realizada** e **Saída realizada** (obrigatórios).\n3. Preencha o texto obrigatório:\n   — Saída Antecipada → **Motivo da Saída Antecipada**\n   — Hora Adicional → **Motivo da Hora Adicional**\n   — Registrar Horário → **Comentário**\n4. Clique em **Salvar**.\n\nO Status na tabela reflete a opção escolhida. **Registrar Horário** cobre problemas de ponto sem mudar o tipo operacional para falta ou saída antecipada.",
      imagens: [
        {
          src: `${IMG}/04-registrar-horario.png`,
          alt: "Modal Registrar — horários e comentário",
        },
      ],
    },
    {
      titulo: "5. Aprovar o dia do prestador",
      texto:
        "1. O ícone **Aprovar** (check) só aparece quando:\n   — o Status é **Falta**, ou\n   — **Entrada** e **Saída** estão preenchidas.\n2. Clique em **Aprovar**.\n3. No modal, confira Status (e Entrada/Saída, se não for falta). **Observação** é opcional.\n4. Clique em **Aprovar** no rodapé.\n5. A coluna **Aprovado** muda para **Sim**. Depois disso, as ações de Registrar/Aprovar somem da linha (use **Histórico** para consultar o que foi gravado).",
      aviso:
        "Para publicar o Relatório de Turno, todos os prestadores da Escala do Turno precisam estar com **Aprovado Sim**.",
      imagens: [
        {
          src: `${IMG}/05-acoes-aprovar.png`,
          alt: "Coluna Ações com ícones Aprovar, Registrar e Histórico",
        },
      ],
    },
    {
      titulo: "6. Consultar o histórico da linha",
      texto:
        "1. Clique no ícone **Histórico** na linha.\n2. O modal lista registros anteriores daquele prestador (tipo, status, horários, liderança e motivo).\n3. Use para conferir o que já foi sinalizado ou aprovado no dia/turno.",
      imagens: [
        {
          src: `${IMG}/06-historico-presenca.png`,
          alt: "Modal Histórico de presença",
        },
      ],
    },
  ],
  notasFinais:
    "— Check-in do Calendário só preenche Entrada/Saída se cair na janela do turno.\n— **Hora Adicional** do turno anterior também entra no pool da Rotação do turno seguinte.",
};
