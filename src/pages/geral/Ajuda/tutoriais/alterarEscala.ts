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
        "1. No menu, seção Escala, clique em **Escala Estúdio**.\n2. Escolha o mês no carrossel.\n3. Selecione a aba da área (ex.: **Game Presenter**).\n4. Confirme que a escala do mês está **aprovada**: o botão **Alterar Escala** (azul) aparece na toolbar da Escala Diária.\n5. Clique em **Alterar Escala**.\n6. O modal exige permissão de **Editar** (não usa a permissão de Criar da toolbar de rascunho).",
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
        "1. No modal **Alterar Escala**, use a busca por **nome** ou **nickname**.\n2. Clique na linha do prestador cuja escala do mês será editada.\n3. Se escolher a pessoa errada, use **Trocar prestador** para voltar à lista.",
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
        "1. No topo, confira o **mês**, o selo **Escala aprovada** e os dados do prestador (nome, nickname, escala e turno).\n2. A grade mostra **todos os dias do mês**, cada um com um seletor de status.\n3. Dias **anteriores a hoje** ficam **travados** (não editáveis).\n4. Células de **Compra** ou **Venda** do Marketplace também ficam travadas (marcação **Mkt**) — esses estados só mudam pela automação do Marketplace.\n5. Altere quantos dias precisar a partir de hoje: **Folga**, **Manhã**, **Tarde**, **Noite** ou **Troca** (na aba Academy também pode haver **Comercial**).\n6. Dias alterados nesta sessão ficam destacados como **editado** (legenda no modal).",
      aviso:
        "Só este prestador é atualizado ao salvar — o restante da escala aprovada permanece intacto.",
      imagens: [
        {
          src: `${IMG}/03-alterar-escala-prestador-selecionado.png`,
          alt: "Modal Alterar Escala — grade do mês do prestador",
        },
      ],
    },
    {
      titulo: "4. Observação e salvar",
      texto:
        "1. Em **Observação**, descreva o motivo (campo **obrigatório** — a mesma observação vale para todos os dias alterados nesta gravação).\n2. Confira no rodapé o contador **N dia(s) alterado(s)**.\n3. Clique em **Salvar alterações**.\n4. Se desistir, feche pelo **X** — nada é gravado enquanto não salvar (não há botão Cancelar no rodapé).",
      aviso:
        "A observação fica registrada no histórico da escala em cada dia alterado. Escreva de forma clara (ex.: admissão no meio do mês, troca pontual, folga solicitada).",
      imagens: [
        {
          src: `${IMG}/04-alterar-escala-formulario-completo.png`,
          alt: "Grade com dias editados, observação e Salvar alterações",
        },
      ],
    },
    {
      titulo: "5. Conferir na grade e no histórico",
      texto:
        "1. Na **Escala Diária**, as células alteradas passam a mostrar o novo status.\n2. Um ícone de comentário aparece no canto de cada célula alterada: ao passar o mouse, veja autor, data/hora, valor anterior e a observação.\n3. Opcional: no ícone de histórico da barra de filtros (relógio), abra o **Histórico de ações** do mês — as linhas **Alterar Escala** listam prestador, dia, valor anterior → novo e observação.",
    },
  ],
  notasFinais:
    "— Use Alterar Escala com a escala já aprovada para ajustar um ou vários dias de um único prestador.\n— Não é necessário regenerar a escala do time (**Nova Escala**).\n— A alteração reflete no **Calendário** e na **Rotação** do prestador.",
};
