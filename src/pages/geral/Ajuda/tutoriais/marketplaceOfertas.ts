import { ShoppingCart } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/marketplace";

/** Tutorial: Marketplace — ofertar, aceitar e cancelar (GP / Shuffler). */
export const TUTORIAL_MARKETPLACE_OFERTAS: TutorialDef = {
  id: "marketplace-ofertas",
  urlSlug: "MarketplaceOfertas",
  titulo: "Marketplace",
  section: "Escala",
  icon: ShoppingCart,
  relatedPageKey: "escala_marketplace_turnos",
  objetivo:
    "Ofertar venda de turno, venda de folga ou troca, aceitar ofertas de colegas e cancelar uma oferta ainda em aberto.",
  passos: [
    {
      titulo: "1. Abrir o Marketplace",
      texto:
        "1. No menu, seção Escala, clique em Marketplace.\n2. A aba Todas as Ofertas mostra o mural: Ofertas de Vendas e Ofertas de Troca.\n3. Use Nova Oferta para publicar.\n4. Em Minhas Ofertas você acompanha o que publicou, o que aceitou e o histórico.",
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
        "1. Antecedência de 24h: só entram turnos cujo início esteja a pelo menos 24 horas da publicação (ou do momento do aceite, conforme o tipo).\n2. Descanso de 12h entre turnos: a plataforma só libera opções que respeitam o intervalo mínimo de 12h em relação ao seu último e ao próximo turno.\n3. A escala do mês precisa estar aprovada — só assim os dias aparecem no modal.\n4. O aceite é imediato: não passa por gestor. Ao aceitar, a Escala e o Calendário atualizam na hora.",
      aviso:
        "Se um dia ou turno não aparecer na lista, em geral é porque não cumpre as 24h, as 12h ou a escala ainda não está aprovada.",
    },
    {
      titulo: "3. Ofertar Venda de Turno",
      texto:
        "1. Clique em Nova Oferta.\n2. Tipo de oferta: Venda de Turno — você deixa o turno e um colega de folga assume.\n3. Escolha o Dia do turno (só dias em que você está escalado e com início ≥ 24h).\n4. Observação é opcional.\n5. Clique em Publicar oferta.",
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
        "1. Nova Oferta → Tipo: Venda de Folga — você está de folga e se oferece para trabalhar; quem aceita é o colega escalado naquele turno.\n2. Escolha o Dia de folga.\n3. Em Turno que pretende trabalhar, escolha Manhã, Tarde ou Noite — a lista já respeita 24h e 12h.\n4. Publicar oferta.",
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
        "1. Nova Oferta → Tipo: Oferta de Troca — você entrega este turno e, em troca, assume um dia de quem aceitar.\n2. Escolha o Dia do turno que está oferecendo.\n3. Publicar oferta.\n4. Quem aceitar escolhe, no modal de aceite, o dia que oferece em troca.",
      imagens: [
        {
          src: `${IMG}/04-ofertar-troca.png`,
          alt: "Modal Ofertar — Oferta de Troca",
        },
      ],
    },
    {
      titulo: "6. Aceitar uma oferta",
      texto:
        "1. Na aba Todas as Ofertas, localize a linha nas Ofertas de Vendas ou Ofertas de Troca.\n2. Clique no ícone Aceitar Oferta (não aparece na sua própria oferta — aí consta «Sua oferta»).\n3. Confira tipo, dia, turno e ofertante.\n— Venda de Turno: ao aceitar, você assume o turno (Compra na escala).\n— Venda de Folga: ao aceitar, você sai do turno (Venda) e o ofertante assume.\n— Oferta de Troca: escolha o Dia que você oferece em troca e confirme.\n4. Confirme Aceitar. A oferta some do mural e a escala é atualizada na hora.\n5. Em Minhas Ofertas → Ofertas que aceitei, a oferta fica registrada.",
    },
    {
      titulo: "7. Cancelar uma oferta em aberto",
      texto:
        "1. Abra a aba Minhas Ofertas.\n2. Em Minhas ofertas abertas, use o ícone Cancelar Oferta.\n3. Confirme no modal Cancelar oferta — a oferta sai do mural e a sua escala não muda.\n4. Oferta já aceita: não há como cancelar. Ela aparece em Histórico (ou em Ofertas que aceitei, se você foi quem aceitou) sem ação de cancelamento.",
      aviso:
        "Só é possível cancelar enquanto o status estiver aberto. Depois do aceite, a troca na escala permanece.",
      imagens: [
        {
          src: `${IMG}/05-minhas-ofertas.png`,
          alt: "Aba Minhas Ofertas — abertas, aceitas e histórico",
        },
      ],
    },
  ],
  notasFinais:
    "— Aceite é imediato: não depende de aprovação de gestor.\n— Respeite sempre as 24h até o início do turno e as 12h de descanso entre turnos.\n— Oferta aceita não pode ser desfeita pelo Marketplace — ajuste pontual de escala, se necessário, segue outro fluxo (Alterar Escala), com quem tiver permissão.",
};
