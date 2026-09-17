import { describe, expect, it } from "vitest";
import {
  streamersInfluencerIdsQuery,
  streamersOperadoraSlugsQuery,
  travarRecortePropriosStreamers,
} from "@/pages/dashboards/Streamers/streamersInfluencerFilterHelpers";

const ESC_ADMIN = { semRestricaoEscopo: true, vêTodosInfluencers: true, influencersVisiveis: [] as string[], operadorasVisiveis: [] as string[] };
const ESC_PROPRIOS = { semRestricaoEscopo: false, influencersVisiveis: ["inf-eu"], operadorasVisiveis: ["casa_apostas"] };
const ESC_AGENCIA = { semRestricaoEscopo: false, influencersVisiveis: ["inf-a", "inf-b"], operadorasVisiveis: ["casa_apostas", "blaze"] };
const ESC_OPERADOR = { semRestricaoEscopo: false, vêTodosInfluencers: true, influencersVisiveis: [] as string[], operadorasVisiveis: ["blaze"] };
const CAT_INFLUENCERS = ["inf-1", "inf-2", "inf-eu", "inf-a", "inf-b"];

describe("streamersInfluencerIdsQuery", () => {
  it("admin com Todos Influencers usa só o catálogo influencer (nunca null)", () => {
    expect(streamersInfluencerIdsQuery("todos", ESC_ADMIN, ["inf-1", "inf-2"])).toEqual(["inf-1", "inf-2"]);
  });

  it("catálogo vazio zera a query", () => {
    expect(streamersInfluencerIdsQuery("todos", { vêTodosInfluencers: true, influencersVisiveis: [] }, [])).toEqual([]);
  });

  it("proprios com Todos Influencers intersecta catálogo", () => {
    expect(streamersInfluencerIdsQuery("todos", ESC_PROPRIOS, CAT_INFLUENCERS)).toEqual(["inf-eu"]);
  });

  it("agência sem influencers devolve array vazio (query deve zerar)", () => {
    expect(streamersInfluencerIdsQuery("todos", { semRestricaoEscopo: false, influencersVisiveis: [] }, CAT_INFLUENCERS)).toEqual([]);
  });

  it("filtro de um influencer na visão global é permitido se estiver no catálogo", () => {
    expect(streamersInfluencerIdsQuery("inf-1", ESC_ADMIN, CAT_INFLUENCERS)).toEqual(["inf-1"]);
  });

  it("afiliado fora do catálogo não entra no recorte Streamers", () => {
    expect(streamersInfluencerIdsQuery("af-1", ESC_ADMIN, CAT_INFLUENCERS)).toEqual([]);
  });

  it("proprios não consegue pedir ID fora do escopo", () => {
    expect(streamersInfluencerIdsQuery("inf-outro", ESC_PROPRIOS, CAT_INFLUENCERS)).toEqual([]);
  });
});

describe("streamersOperadoraSlugsQuery", () => {
  it("admin com Todas Operadoras não filtra (null)", () => {
    expect(streamersOperadoraSlugsQuery("todas", ESC_ADMIN, null)).toBeNull();
  });

  it("proprios com Todas Operadoras fica nas casas do escopo", () => {
    expect(streamersOperadoraSlugsQuery("todas", ESC_PROPRIOS, null)).toEqual(["casa_apostas"]);
  });

  it("slug fora do escopo zera (não vaza outra casa)", () => {
    expect(streamersOperadoraSlugsQuery("blaze", ESC_PROPRIOS, null)).toEqual([]);
  });

  it("operador usa slugs forçados mesmo em Todas Operadoras", () => {
    expect(streamersOperadoraSlugsQuery("todas", ESC_OPERADOR, ["blaze"])).toEqual(["blaze"]);
  });
});

describe("travarRecortePropriosStreamers", () => {
  it("impede recorte global (null) de influencer", () => {
    const r = travarRecortePropriosStreamers(
      { influencerIds: null, operadoraSlugs: ["casa_apostas"] },
      ESC_PROPRIOS,
    );
    expect(r.influencerIds).toEqual(["inf-eu"]);
    expect(r.operadoraSlugs).toEqual(["casa_apostas"]);
  });

  it("remove ID e slug que não estão no escopo", () => {
    const r = travarRecortePropriosStreamers(
      { influencerIds: ["inf-eu", "inf-hacker"], operadoraSlugs: ["casa_apostas", "blaze"] },
      ESC_PROPRIOS,
    );
    expect(r.influencerIds).toEqual(["inf-eu"]);
    expect(r.operadoraSlugs).toEqual(["casa_apostas"]);
  });

  it("agência Todas = união do par, não plataforma", () => {
    const r = travarRecortePropriosStreamers(
      {
        influencerIds: streamersInfluencerIdsQuery("todos", ESC_AGENCIA, CAT_INFLUENCERS),
        operadoraSlugs: streamersOperadoraSlugsQuery("todas", ESC_AGENCIA, null),
      },
      ESC_AGENCIA,
    );
    expect(r.influencerIds).toEqual(["inf-a", "inf-b"]);
    expect(r.operadoraSlugs).toEqual(["casa_apostas", "blaze"]);
  });
});
