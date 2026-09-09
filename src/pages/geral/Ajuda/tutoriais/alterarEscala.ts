import { CalendarCog } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/alterar-escala";

/** Tutorial: alteração da grade de um prestador na Escala Estúdio (Service Manager / Shift Leader). */
export const TUTORIAL_ALTERAR_ESCALA: TutorialDef = {
  id: "alterar-escala",
  urlSlug: "AlterarEscala",
  titulo: "Alterar Escala",
  section: "Escala",
  icon: CalendarCog,
  relatedPageKey: "rh_gestao_escala",
  objetivo:
    "Alterar um ou vários dias de um prestador na Escala Estúdio com a escala já aprovada — sem regenerar a grade do time.",
  passos: [
    {
      titulo: "1. Abrir a Escala Estúdio",
      texto:
        "1. No menu, seção Escala, clique em Escala Estúdio.\n2. Escolha o mês no carrossel (ex.: Julho 2026).\n3. Selecione a aba da área — para Game Presenters, clique em Game Presenter.\n4. Confirme que a escala do mês está aprovada: o botão Alterar Escala (azul) aparece na toolbar da Escala Diária.\n5. Clique em Alterar Escala.",
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
        "1. No modal Alterar Escala, use a busca por nome ou nickname.\n2. Clique na linha do prestador cuja escala do mês será editada.\n3. Se escolher a pessoa errada, use Trocar prestador para voltar à lista.",
      imagens: [
        {
          src: `${IMG}/02-modal-alterar-escala.png`,
          alt: "Modal Alterar Escala — lista de prestadores",
        },
      ],
    },
    {
      titulo: "3. Editar a grade do mês",
      texto:
        "1. Confira o nome, nickname, escala e turno padrão do prestador no topo do modal.\n2. Na grade, cada dia do mês tem um seletor de status. Dias anteriores a hoje ficam travados.\n3. Células de Compra ou Venda do Marketplace também ficam travadas (não altere por aqui).\n4. Altere quantos dias precisar (Folga, Manhã, Tarde, Noite ou Troca).",
      imagens: [
        {
          src: `${IMG}/03-alterar-escala-prestador-selecionado.png`,
          alt: "Prestador selecionado — grade do mês",
        },
      ],
    },
    {
      titulo: "4. Observação e salvar",
      texto:
        "1. Em Observação, descreva o motivo (campo obrigatório — vale para todos os dias alterados nesta gravação).\n2. Confira o contador de dias alterados no rodapé.\n3. Clique em Salvar alterações.\n4. Se desistir, feche pelo X — nada é gravado enquanto não salvar.",
      aviso:
        "A observação é obrigatória e fica registrada no histórico da escala em cada dia alterado. Escreva de forma clara (ex.: admissão no meio do mês, troca pontual, folga solicitada).",
      imagens: [
        {
          src: `${IMG}/04-alterar-escala-formulario-completo.png`,
          alt: "Grade preenchida pronta para salvar",
        },
      ],
    },
    {
      titulo: "5. Conferir na grade e no histórico",
      texto:
        "1. Na Escala Diária, as células alteradas passam a mostrar o novo status.\n2. Um ícone de comentário aparece no canto de cada célula alterada: ao passar o mouse, veja autor, data/hora, valor anterior e a observação.\n3. Opcional: no ícone de histórico da barra de filtros (relógio), abra o Histórico de ações do mês — as linhas Alterar Escala listam prestador, dia e observação.",
    },
  ],
  notasFinais:
    "— Use Alterar Escala com a escala já aprovada para ajustar um ou vários dias de um único prestador.\n— Não é necessário regenerar a escala do time (Nova Escala).\n— A alteração reflete no Calendário do prestador.",
};
