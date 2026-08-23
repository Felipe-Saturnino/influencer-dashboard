import { describe, expect, it } from "vitest";
import {
  indexPosicoesLobby,
  posicaoLobbyParaMesa,
  posicaoLobbyPorSpinIds,
} from "../../../supabase/functions/relatorio-diario-diretoria/posicionamentoLobby";

describe("relatorioDiretoria posicionamentoLobby", () => {
  const blazeLobby = indexPosicoesLobby([
    {
      mesa_identificacao: "network-fb-blaze",
      nome_mesa: "Futebol Brasileiro",
      posicao: 277,
    },
    {
      mesa_identificacao: "dedicado-bj-blaze",
      nome_mesa: "Blackjack 1",
      posicao: 8,
    },
  ]);

  it("Mesas Dedicadas: sem ID dedicado na operadora → null (—), mesmo com nome no lobby Network", () => {
    expect(posicaoLobbyPorSpinIds(blazeLobby, [])).toBeNull();
    expect(
      posicaoLobbyPorSpinIds(blazeLobby, ["dedicado-fb-cda-only"]),
    ).toBeNull();
  });

  it("Mesas Dedicadas: não usa fallback por nome (evita P277 da mesa Network)", () => {
    const porNome = posicaoLobbyParaMesa(blazeLobby, {
      nomeKey: "futebol brasileiro",
      spinIdsPreferidos: [],
      spinIdsFallback: [],
    });
    expect(porNome).toBe(277);

    const somenteIds = posicaoLobbyPorSpinIds(blazeLobby, []);
    expect(somenteIds).toBeNull();
  });

  it("resolve posição quando o ID Spin dedicado existe no lobby", () => {
    expect(posicaoLobbyPorSpinIds(blazeLobby, ["dedicado-bj-blaze"])).toBe(8);
  });

  it("Mesas Network: match exclusivo por ID Spin", () => {
    expect(posicaoLobbyPorSpinIds(blazeLobby, ["network-fb-blaze"])).toBe(277);
    expect(posicaoLobbyPorSpinIds(blazeLobby, ["outro-id"])).toBeNull();
  });
});
