import { ShoppingCart } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/marketplace";

/** Tutorial: Marketplace — ofertar, propor/aprovar troca, aceitar vendas e cancelar. */
export const TUTORIAL_MARKETPLACE_OFERTAS: TutorialDef = {
  id: "marketplace-ofertas",
  urlSlug: "MarketplaceOfertas",
  titulo: "Marketplace",
  section: "Escala",
  icon: ShoppingCart,
  relatedPageKey: "escala_marketplace_turnos",
  objetivo:
    "Ofertar venda de turno, venda de folga ou troca, enviar proposta, aprovar ou recusar, desistir e cancelar uma oferta ainda aberta.",
  passos: [
    {
      titulo: "1. Abrir o Marketplace",
      texto:
        "1. No menu, seção Escala, clique em Marketplace.\n2. A aba Todas as Ofertas mostra o mural em três blocos: Ofertas de Turno, Ofertas de Folga e Ofertas de Troca. Cada linha traz a data, o turno, o estúdio, o ofertante e a observação de quem publicou.\n3. Na barra de filtros, o filtro Todos os Dias lista apenas os dias que têm oferta no período — escolha um dia para ver só ele.\n4. Use Nova Oferta para publicar.\n5. Em Minhas Ofertas você acompanha o que publicou, o que aceitou e o histórico.",
      imagens: [
        {
          src: `${IMG}/01-marketplace-todas-ofertas.png`,
          alt: "Marketplace — Todas as Ofertas e Nova Oferta",
        },
      ],
    },
    {
      titulo: "2. Regras antes de ofertar ou aceitar",
      texto:
        "1. Publicar exige 4h até o início do turno; enviar proposta e aprovar exigem 2h. Ex.: às 6h não dá para ofertar a Manhã das 7h, mas dá para ofertar e propor a Tarde das 15h no mesmo dia.\n2. Cancelamento a menos de 2h: se ninguém concluir a proposta ou a aprovação antes dessa janela, a oferta é cancelada automaticamente. Ofertas de datas já passadas também são canceladas.\n3. Descanso de 12h entre turnos: a plataforma só libera opções que respeitam o intervalo mínimo de 12h em relação ao seu último e ao próximo turno.\n4. A escala do mês precisa estar aprovada — só assim os dias aparecem no modal.\n5. Venda de Turno, Venda de Folga e Oferta de Troca seguem o mesmo fluxo: o colega envia uma proposta (Em análise) e quem publicou aprova ou recusa. A escala só muda na aprovação. Sem aprovação de gestor.\n6. Quem enviou a proposta pode Desistir da proposta enquanto estiver Em análise — a oferta volta ao mural.\n7. Enquanto a oferta estiver Em análise, os dias ficam reservados para os dois prestadores e não podem participar de outra negociação.",
      aviso:
        "Se um dia ou turno não aparecer, em geral é porque não cumpre as 4h, as 12h, está reservado em outra negociação ou a escala ainda não está aprovada.",
    },
    {
      titulo: "3. Ofertar Venda de Turno",
      texto:
        "1. Clique em Nova Oferta.\n2. Tipo de oferta: Venda de Turno — você deixa o turno e um colega de folga assume.\n3. Marque um ou vários Dias do turno (só dias em que você está escalado e com início ≥ 4h).\n4. Cada dia marcado gera uma oferta separada no mural, e pode ser aceito por colegas diferentes.\n5. Observação é opcional e vale para todos os dias marcados.\n6. Clique em Publicar oferta (ou Publicar N ofertas, quando marcar mais de um dia).",
      imagens: [
        {
          src: `${IMG}/02-ofertar-venda-turno.png`,
          alt: "Modal Ofertar — Venda de Turno",
        },
      ],
    },
    {
      titulo: "4. Ofertar Venda de Folga",
      texto:
        "1. Nova Oferta → Tipo: Venda de Folga — você está de folga e se oferece para trabalhar; quem aceita é o colega escalado naquele turno.\n2. Marque um ou vários Dias de folga.\n3. Escolha o turno em cada dia marcado: a lista é diferente por dia, porque já respeita as 4h de antecedência e as 12h de descanso em relação ao seu último e ao próximo turno. Quando só um turno é possível, ele vem selecionado.\n4. Publicar oferta (ou Publicar N ofertas) — cada dia vira uma oferta independente.",
      imagens: [
        {
          src: `${IMG}/03-ofertar-venda-folga.png`,
          alt: "Modal Ofertar — Venda de Folga com regra de 12h",
        },
      ],
    },
    {
      titulo: "5. Ofertar Troca",
      texto:
        "1. Nova Oferta → Tipo: Oferta de Troca — você entrega este turno e, em troca, assume um dia de quem enviar uma proposta.\n2. Escolha o Dia do turno que está oferecendo — na troca é um dia por oferta, porque o colega escolhe o dia que entrega em troca.\n3. Publique a oferta.\n4. Quando um colega propuser um dia/turno, a oferta ficará Em análise em Minhas ofertas abertas para você decidir.",
      imagens: [
        {
          src: `${IMG}/04-ofertar-troca.png`,
          alt: "Modal Ofertar — Oferta de Troca",
        },
      ],
    },
    {
      titulo: "6. Aceitar uma venda ou propor uma troca",
      texto:
        "1. Na aba Todas as Ofertas, localize a linha em Ofertas de Turno, Ofertas de Folga ou Ofertas de Troca.\n2. Clique no ícone Enviar proposta nas vendas ou Propor Troca nas trocas (na sua própria linha aparece «Sua oferta»).\n3. Confira tipo, dia, turno e ofertante. A proposta no mesmo dia é permitida se restarem pelo menos 2h até o início do turno.\n— Venda de Turno: depois da aprovação, você assume o turno (Compra - Turno na escala).\n— Venda de Folga: depois da aprovação, você sai do turno (Venda) e o ofertante assume.\n— Oferta de Troca: você deve estar livre no dia ofertado. Em Dia que você oferece em troca, aparecem somente seus dias escalados, com descanso mínimo de 12h e sem reserva em outra negociação.\n4. Confirme Enviar proposta: o status fica Em análise, a oferta some do mural e nenhuma escala muda ainda.\n5. A proposta fica em Minhas Ofertas → Ofertas que aceitei até a decisão de quem publicou. Use Desistir da proposta se quiser voltar atrás.",
    },
    {
      titulo: "7. Aprovar, recusar ou desistir",
      texto:
        "1. Abra Minhas Ofertas → Minhas ofertas abertas. Com permissão de Ver Sim, ligue antes o botão Minhas Negociações (ao lado do Histórico).\n2. Localize a oferta com status Em análise. A linha mostra o dia/turno que você publicou e, na troca, o dia/turno proposto.\n3. Use Aprovar compra (ou Aprovar Troca) para confirmar. Só nesse momento a escala é atualizada: quem sai recebe Venda e quem assume recebe Compra - Turno.\n4. Use Recusar Proposta para não aceitar. A oferta volta ao mural e a escala não muda.\n5. Quem enviou a proposta usa Desistir da proposta em Ofertas que aceitei — mesmo efeito da recusa.\n6. Cancelar Oferta, ainda em Minhas ofertas abertas, encerra a oferta de vez (não volta ao mural).",
      aviso:
        "Antes de aprovar, confira os dias e turnos. Se alguma célula da escala tiver sido alterada, a plataforma bloqueia a aprovação.",
    },
    {
      titulo: "8. Cancelar uma oferta em aberto",
      texto:
        "1. Abra a aba Minhas Ofertas (com Ver Sim, ligue Minhas Negociações).\n2. Em Minhas ofertas abertas, use o ícone Cancelar Oferta nas ofertas disponíveis ou ainda Em análise.\n3. Confirme no modal Cancelar oferta. Se já houver proposta, ela é descartada e a oferta não volta ao mural. A escala não muda.\n4. Oferta já aprovada: não há como cancelar. Ela aparece em Histórico (ou em Ofertas que aceitei, se você foi quem enviou a proposta) sem ação de cancelamento.",
      aviso:
        "Depois que a compra ou a troca for aprovada, a alteração na escala permanece.",
      imagens: [
        {
          src: `${IMG}/05-minhas-ofertas.png`,
          alt: "Aba Minhas Ofertas — abertas, aceitas e histórico",
        },
      ],
    },
  ],
  notasFinais:
    "— Marcar vários dias em Venda de Turno ou Venda de Folga cria uma oferta por dia; se algum dia não puder ser publicado, os demais seguem publicados e a mensagem indica o motivo.\n— Venda, folga e troca só mudam a escala depois que quem publicou aprova; nunca há aprovação de gestor.\n— Quem enviou a proposta pode desistir enquanto estiver Em análise; cancelar a oferta (autor) encerra de vez.\n— Respeite 4h para publicar, 2h para enviar proposta e para aprovar, e 12h de descanso entre turnos.\n— Shift Leader e Service Manager negociam entre si (grupo Liderança); Game Presenter e Shuffler só com o próprio time.\n— Com Ver Sim, use Minhas Negociações para ver Minhas Ofertas e o mural do seu grupo.\n— Na Home (Game Presenter, Shuffler, Shift Leader e Service Manager) aparece um aviso para aprovar ou para não esquecer a negociação até o início do turno.\n— Oferta ainda não aprovada é cancelada automaticamente quando faltam menos de 2h para o turno ou quando a data já passou.\n— Oferta aprovada não pode ser desfeita pelo Marketplace — o novo dia pode ser negociado novamente conforme as regras.",
};
