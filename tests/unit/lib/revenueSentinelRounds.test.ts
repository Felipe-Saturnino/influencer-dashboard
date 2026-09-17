import { describe, expect, it } from "vitest";
import {
  agruparOperatorPlayerRounds,
  nomeMesaRsCda,
  totalRsRoundsPayload,
  type RsMesaCatalogo,
} from "../../../src/lib/revenueSentinelRounds";

const catalogo: RsMesaCatalogo[] = [
  {
    id: "mesa-1",
    nome_mesa: "Blackjack 1",
    tipo_jogo: "Blackjack",
    mesa_identificacao: "tableSG6134",
    mesa_identificacao_operadora: null,
    operadora_slug: "casa_apostas",
    estudio_slug: "cda",
    estudio_tipo: "dedicado",
    identificacao_cda: null,
  },
  {
    id: "mesa-2",
    nome_mesa: "Roleta Brasileira",
    tipo_jogo: "Roleta",
    mesa_identificacao: "roulette-network",
    mesa_identificacao_operadora: null,
    operadora_slug: "sports_club",
    estudio_slug: "sports_club",
    estudio_tipo: "network",
    identificacao_cda: "cda-roulette-77",
  },
];

describe("operator-player-rounds", () => {
  it("remove o prefixo de lobby da Casa de Apostas", () => {
    expect(nomeMesaRsCda("Casa de Apostas Blackjack 1")).toBe("Blackjack 1");
  });

  it("lê o total paginado do envelope", () => {
    expect(totalRsRoundsPayload({ total: 40_686, items: [] })).toBe(40_686);
  });

  it("agrega por jogador, dia e mesa usando game_id como rodada", () => {
    const resumo = agruparOperatorPlayerRounds(
      [
        {
          total: 3,
          items: [
            {
              id: 1,
              external_id: "casadeapostas.if_dgc.CDA-2203598",
              game_id: "g-1",
              game_table_id: "tableSG6134",
              table_name: "Casa de Apostas Blackjack 1",
              game_type: "Blackjack",
              round_date: "2026-08-07",
              turnover: 100,
              ggr: 20,
              bet_count: 4,
            },
            {
              id: 2,
              external_id: "casadeapostas.if_dgc.CDA-2203598",
              game_id: "g-2",
              game_table_id: "tableSG6134",
              table_name: "Casa de Apostas Blackjack 1",
              game_type: "Blackjack",
              round_date: "2026-08-07",
              turnover: 35,
              ggr: -5,
              bet_count: 2,
            },
            {
              id: 3,
              external_id: "CDA-9999999",
              game_id: "fora-do-canal",
              round_date: "2026-08-07",
            },
          ],
        },
      ],
      new Set(["2203598"]),
      catalogo,
    );

    expect(resumo.linhasLidas).toBe(3);
    expect(resumo.linhasDosIds).toBe(2);
    expect(resumo.dias).toHaveLength(1);
    expect(resumo.dias[0]).toMatchObject({
      ext_customer_id: "2203598",
      data: "2026-08-07",
      rodadas_spin: 2,
      apostas_spin: 6,
      ggr_spin: 15,
      turnover_spin: 135,
      rodadas_por_jogo: { blackjack: 2 },
      rodadas_por_mesa: [
        {
          estudio: "Dedicada",
          mesa: "Blackjack 1",
          jogo: "blackjack",
          rodadas: 2,
        },
      ],
    });
  });

  it("classifica Network pelo cadastro da mesa", () => {
    const resumo = agruparOperatorPlayerRounds(
      [{
        items: [{
          external_id: "2203598",
          game_id: "g-network",
          game_table_id: "cda-roulette-77",
          table_name: "Casa de Apostas Roleta",
          game_type: "Roulette",
          round_date: "2026-08-08",
          turnover: 10,
          ggr: 2,
          bet_count: 1,
        }],
      }],
      new Set(["2203598"]),
      catalogo,
    );

    expect(resumo.dias[0]?.rodadas_por_mesa[0]).toMatchObject({
      estudio: "Network",
      mesa: "Roleta Brasileira",
    });
  });

  it("deduplica o mesmo game_id entre páginas", () => {
    const row = {
      external_id: "2203598",
      game_id: "g-duplicado",
      game_table_id: "tableSG6134",
      table_name: "Casa de Apostas Blackjack 1",
      round_date: "2026-08-07",
      bet_count: 1,
    };
    const resumo = agruparOperatorPlayerRounds(
      [{ items: [row] }, { items: [{ ...row, id: 999 }] }],
      new Set(["2203598"]),
      catalogo,
    );
    expect(resumo.dias[0]?.rodadas_spin).toBe(1);
    expect(resumo.duplicadas).toBe(1);
  });
});
