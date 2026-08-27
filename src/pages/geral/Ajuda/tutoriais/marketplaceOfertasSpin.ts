import { Sparkles } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/marketplace/ofertas-spin";

/** Tutorial: Ofertas Spin — publicar cobertura ou liberação na visão de gestão (Shift Leader). */
export const TUTORIAL_MARKETPLACE_OFERTAS_SPIN: TutorialDef = {
  id: "marketplace-ofertas-spin",
  urlSlug: "MarketplaceOfertasSpin",
  titulo: "Ofertas Spin",
  section: "Escala",
  icon: Sparkles,
  relatedPageKey: "escala_marketplace_turnos",
  objetivo:
    "Publicar cobertura de turno ou liberação de vaga em nome da Spin Gaming, acompanhar aceites e cancelar ofertas abertas na aba Ofertas Spin.",
  passos: [
    {
      titulo: "1. Abrir a aba Ofertas Spin",
      texto:
        "1. No menu, seção Escala, clique em **Marketplace**.\n2. Com permissão de **Ver** ampla (gestão), a segunda linha da barra traz a aba **Ofertas Spin** — ao lado de **Todas as Ofertas** e **Ofertas Encerradas**.\n3. Clique em **Ofertas Spin**. O botão **Nova Oferta** aparece só nesta aba.\n4. Mantenha **Minhas Negociações** desligado para ver todas as ofertas Spin do estúdio, não só as suas negociações P2P.\n5. Use o carrossel de mês, o filtro **Todas as Ações** (Cobertura Spin / Liberação Spin), o filtro **Times** e a busca para localizar ofertas.",
      imagens: [
        {
          src: `${IMG}/01-aba-ofertas-spin.png`,
          alt: "Marketplace — aba Ofertas Spin com Nova Oferta",
        },
      ],
    },
    {
      titulo: "2. Cobertura de turno e Liberação de vaga",
      texto:
        "As ofertas Spin são publicadas pela **Spin Gaming** (ofertante fixo na tabela) e aparecem também no mural **Todas as Ofertas**:\n\n— **Cobertura de turno** — a empresa precisa de alguém para assumir um turno. Quem aceita precisa estar de **folga** naquele dia; a escala grava **Compra - Turno** na hora, sem aprovação extra. No mural, entra em **Ofertas de Turno**.\n\n— **Liberação de vaga** — a empresa libera um turno já escalado. Quem aceita precisa estar **escalado no mesmo dia e turno**; a escala grava **Venda** na hora. No mural, entra em **Ofertas de Folga**.\n\nDiferente das vendas entre colegas, **não há proposta Em análise** — o aceite do prestador atualiza a grade imediatamente.",
      aviso:
        "Escolha o **Time** (Game Presenter, Shuffler ou Liderança) conforme quem poderá aceitar a oferta no mural.",
    },
    {
      titulo: "3. Publicar Cobertura de turno",
      texto:
        "1. Na aba **Ofertas Spin**, clique em **Nova Oferta**.\n2. **Time** — selecione o grupo que poderá aceitar (ex.: Game Presenter).\n3. **Tipo da oferta** — **Cobertura de turno**.\n4. **Dia** — data futura com pelo menos **4h até o início do turno** escolhido.\n5. **Turno** — Manhã, Tarde ou Noite.\n6. **Estúdio** — estúdio onde o turno será coberto (horários vêm do cadastro de estúdios).\n7. **Observação** — opcional; aparece no mural para os colegas.\n8. Clique em **Publicar oferta**.\n\nA oferta entra em **Ofertas abertas** desta aba e no bloco **Ofertas de Turno** em **Todas as Ofertas**.",
      imagens: [
        {
          src: `${IMG}/02-modal-cobertura-turno.png`,
          alt: "Modal Nova Oferta Spin — Cobertura de turno",
        },
      ],
    },
    {
      titulo: "4. Publicar Liberação de vaga",
      texto:
        "1. **Nova Oferta** → **Tipo da oferta**: **Liberação de vaga**.\n2. Preencha **Time**, **Dia**, **Turno** e **Estúdio** — mesmas regras de antecedência mínima de **4h** na publicação.\n3. Use a observação para orientar quem está escalado naquele turno (ex.: realocação operacional).\n4. **Publicar oferta**.\n\nNo mural **Todas as Ofertas**, a linha aparece em **Ofertas de Folga** com ofertante **Spin Gaming**.",
      imagens: [
        {
          src: `${IMG}/03-modal-liberacao-vaga.png`,
          alt: "Modal Nova Oferta Spin — Liberação de vaga",
        },
      ],
    },
    {
      titulo: "5. Comprar turno ou folga de GP/Shuffler (P2P)",
      texto:
        "Abaixo de **Ofertas aceitas**, o bloco **Compra Turno** / **Compra Folga** lista vendas abertas de **Game Presenter** e **Shuffler** no mural P2P:\n\n1. Use os botões **Compra Turno** (padrão) ou **Compra Folga** na mesma linha do título.\n2. A tabela mostra **Data da Oferta**, **Turno**, **Ofertante**, **Time** e a ação **Aceitar em nome da Spin**.\n3. Com filtro **Todos Times**, aparecem GP e Shuffler; filtre por time na barra se precisar.\n4. Ao confirmar, a proposta fica **Em análise** — o ofertante vê **Spin Gaming** como interessado e aprova ou recusa em **Minhas Ofertas**.\n5. Se aprovado: em **Compra Turno** o prestador libera o dia (**Venda**); em **Compra Folga** assume o turno (**Compra - Turno**). Não há segunda célula — a Spin Gaming é a contraparte.\n\n**Ofertas de Troca** e times de **Liderança** não entram neste bloco.",
    },
    {
      titulo: "6. Acompanhar abertas, aceitas e histórico",
      texto:
        "Na aba **Ofertas Spin**, quatro blocos organizam a gestão:\n\n— **Ofertas abertas** — coberturas e liberações Spin aguardando aceite no mural; use **Cancelar Oferta** na linha se precisar encerrar.\n\n— **Ofertas aceitas** — aceites Spin concluídos; coluna **Aceito por** mostra o prestador; a escala já foi atualizada.\n\n— **Compra Turno / Compra Folga** — vendas P2P de GP/Shuffler para compra em nome da Spin (passo 5).\n\n— **Histórico** — ofertas Spin canceladas ou expiradas (menos de **2h** para o início do turno ou data passada).\n\nFiltros de mês, tipo, time e busca aplicam-se a todos os blocos.",
      imagens: [
        {
          src: `${IMG}/04-ofertas-abertas-spin.png`,
          alt: "Ofertas Spin — blocos abertas, aceitas e histórico",
        },
      ],
    },
    {
      titulo: "7. Cancelar uma oferta aberta",
      texto:
        "1. Em **Ofertas abertas**, clique no ícone **Cancelar Oferta** na linha.\n2. Confirme no modal. A oferta **não** volta ao mural — encerra de vez.\n3. Se ninguém aceitou, a escala não muda.\n\nOferta **já aceita** não pode ser cancelada pelo Marketplace; o dia segue na grade do aceitante conforme Compra ou Venda gravados.",
      aviso:
        "Ofertas abertas expiram automaticamente quando faltam menos de 2h para o início do turno ou quando a data já passou.",
    },
    {
      titulo: "8. Aceite no mural (visão do colega)",
      texto:
        "1. Na aba **Todas as Ofertas**, coberturas Spin aparecem em **Ofertas de Turno** e liberações em **Ofertas de Folga** — ofertante **Spin Gaming**.\n2. O colega elegível clica em **Enviar proposta** (ícone de check) e confirma no modal **Aceitar oferta Spin**.\n3. A escala atualiza **na hora** — **Compra - Turno** na cobertura ou **Venda** na liberação — sem passo de aprovação da liderança.\n4. Quem publicou a oferta Spin acompanha o aceite em **Ofertas aceitas**; quem aceitou vê o dia alterado no **Calendário** e na **Escala Estúdio**.",
      imagens: [
        {
          src: `${IMG}/07-mural-todas-ofertas-spin.png`,
          alt: "Todas as Ofertas — linha Spin Gaming no mural",
        },
      ],
    },
  ],
  notasFinais:
    "— **Nova Oferta** Spin só aparece na aba **Ofertas Spin** (permissão de gestão).\n— Publicar exige **4h** até o início do turno; aceitar no mural exige **2h** e escala **aprovada** do mês.\n— Cobertura: aceitante de **folga** + intervalo mínimo de **12h** entre turnos. Liberação: aceitante **escalado no mesmo turno** do dia.\n— Uma oferta Spin aberta por combinação time + dia + turno + tipo.\n— **Compra Turno/Folga** na aba Ofertas Spin: gestão propõe sobre vendas P2P de GP/Shuffler; ofertante aprova — interessado exibido como **Spin Gaming**.\n— Negociações P2P entre colegas continuam em **Minhas Negociações** / **Minhas Ofertas**.\n— Para publicar ofertas **próprias** como prestador, use **Nova Oferta** na aba **Minhas Ofertas** (tutorial **Marketplace**).",
};
