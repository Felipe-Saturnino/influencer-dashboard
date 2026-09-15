import { describe, expect, it } from "vitest";
import { streamersInfluencerIdsQuery } from "@/pages/dashboards/Streamers/streamersInfluencerFilterHelpers";

describe("streamersInfluencerIdsQuery", () => {
  it("admin com Todos Influencers não filtra (null), mesmo sem vêTodosInfluencers", () => {
    expect(
      streamersInfluencerIdsQuery("todos", {
        semRestricaoEscopo: true,
        influencersVisiveis: [],
      }),
    ).toBeNull();
  });

  it("vêTodosInfluencers com lista vazia também é visão global", () => {
    expect(
      streamersInfluencerIdsQuery("todos", {
        vêTodosInfluencers: true,
        influencersVisiveis: [],
      }),
    ).toBeNull();
  });

  it("agência sem influencers devolve array vazio (query deve zerar)", () => {
    expect(
      streamersInfluencerIdsQuery("todos", {
        semRestricaoEscopo: false,
        influencersVisiveis: [],
      }),
    ).toEqual([]);
  });

  it("filtro de um influencer ignora o escopo global", () => {
    expect(
      streamersInfluencerIdsQuery("inf-1", {
        semRestricaoEscopo: true,
        vêTodosInfluencers: true,
        influencersVisiveis: [],
      }),
    ).toEqual(["inf-1"]);
  });
});
