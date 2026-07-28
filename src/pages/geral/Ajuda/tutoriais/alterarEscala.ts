import { CalendarCog } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/alterar-escala";

/** Tutorial: alteração pontual de um dia na Escala Estúdio (Service Manager / Shift Leader). */
export const TUTORIAL_ALTERAR_ESCALA: TutorialDef = {
  id: "alterar-escala",
  titulo: "Alterar Escala",
  section: "Escala",
  icon: CalendarCog,
  relatedPageKey: "rh_gestao_escala",
  objetivo:
    "Alterar o status de um dia pontual de outro prestador do Estúdio na Escala Estúdio (escala já aprovada).",
  passos: [
    {
      titulo: "1. Abrir a Escala Estúdio",
      texto:
        "1. No menu, seção Escala, clique em Escala Estúdio.\n2. Escolha o mês no carrossel (ex.: Julho 2026).\n3. Selecione a aba da área — para Game Presenters, clique em Game Presenter.\n4. Confirme que a escala do mês está aprovada: o botão Alterar Escala (azul) aparece na toolbar da Escala Diária.\n5. Clique em Alterar Escala.",
      aviso:
        "O botão Alterar Escala só aparece com permissão de Editar e com a escala do mês já aprovada. Não use este fluxo para montar rascunho — use apenas para ajuste pontual de um dia.",
      imagens: [
        {
          src: `${IMG}/01-escala-estudio-game-presenter.png`,
          alt: "Escala Estúdio — aba Game Presenter com botão Alterar Escala",
        },
      ],
    },
    {
      titulo: "2. Buscar o prestador",
      texto:
        "1. No modal Alterar Escala, use a busca por nome ou nickname.\n2. Clique na linha do prestador que terá o dia alterado (ex.: outro Game Presenter do Estúdio).\n3. Se escolher a pessoa errada, use Trocar prestador para voltar à lista.",
      imagens: [
        {
          src: `${IMG}/02-modal-alterar-escala.png`,
          alt: "Modal Alterar Escala — lista de prestadores",
        },
      ],
    },
    {
      titulo: "3. Conferir dados e escolher o dia",
      texto:
        "1. Confira Nome, Nickname, Escala (ex.: 4×2) e Turno padrão do prestador (somente leitura).\n2. Em Dia, selecione a data da alteração. Só entram dias a partir de hoje (datas passadas não aparecem).\n3. Veja o Status atual do dia escolhido (ex.: Manhã) antes de mudar.",
      imagens: [
        {
          src: `${IMG}/03-alterar-escala-prestador-selecionado.png`,
          alt: "Prestador selecionado — campos e seletor de dia",
        },
      ],
    },
    {
      titulo: "4. Definir o novo status e a observação",
      texto:
        "1. Em Status do dia, escolha o novo valor:\n— Folga\n— Manhã, Tarde ou Noite (troca o turno daquele dia)\n— Compra, Venda ou Troca\n2. Em Observação, descreva o motivo (campo obrigatório).\n3. Clique em Salvar alteração.\n4. Se desistir, clique em Cancelar — nada é gravado.",
      aviso:
        "A observação é obrigatória e fica registrada no histórico da escala. Escreva de forma clara (ex.: troca pontual, folga solicitada, venda de plantão).",
      imagens: [
        {
          src: `${IMG}/04-alterar-escala-formulario-completo.png`,
          alt: "Formulário completo pronto para salvar",
        },
      ],
    },
    {
      titulo: "5. Conferir na grade e no histórico",
      texto:
        "1. Na Escala Diária, a célula do dia alterado passa a mostrar o novo status.\n2. Um ícone de comentário aparece no canto da célula: ao passar o mouse, veja autor, data/hora, valor anterior e a observação.\n3. Opcional: no ícone de histórico da barra de filtros (relógio), abra o Histórico de ações do mês — a linha Alterar Escala lista prestador, dia e observação.",
    },
  ],
  notasFinais:
    "— Use Alterar Escala apenas para ajuste pontual de um dia em escala já aprovada.\n— Service Manager e Shift Leader seguem o mesmo fluxo quando têm permissão de Editar em Escala Estúdio.\n— A alteração reflete no Calendário do prestador (compromissos daquele dia).\n— Não altere a própria escala por este modal se o processo interno exigir outro canal — o fluxo é para outro prestador do Estúdio.",
};
