import { describe, expect, it } from "vitest";
import { GAME_IDENTITY_HEX } from "@/lib/gameIdentityColors";
import {
  fmtPctJogadores,
  kpisJogadoresAba,
  mesasJogadoresAba,
  pctJogadores,
  rankingJogadoresAba,
  type JogadorAbaDailyFact,
} from "@/lib/jogadoresAbaMetrics";

function fact(partial: Partial<JogadorAbaDailyFact> & Pick<JogadorAbaDailyFact, "ext_customer_id">): JogadorAbaDailyFact {
  return {
    operadora_slug: "casa_apostas",
    influencer_id: "inf-a",
    registration_count: 0,
    deposit_count: 0,
    rodadas_spin: 0,
    ggr_spin: null,
    turnover_spin: null,
    jogou_spin: null,
    jogou_outros: null,
    rodadas_por_jogo: null,
    rodadas_por_mesa: [],
    ...partial,
  };
}

describe("kpisJogadoresAba", () => {
  it("conta ID Ext único com registro e separa Spin vs Outros", () => {
    const rows: JogadorAbaDailyFact[] = [
      fact({ ext_customer_id: "1", registration_count: 1 }),
      fact({ ext_customer_id: "1", deposit_count: 1, jogou_outros: true }),
      fact({ ext_customer_id: "2", registration_count: 1, rodadas_spin: 10, jogou_spin: true, ggr_spin: 50, turnover_spin: 400 }),
      fact({ ext_customer_id: "3", deposit_count: 2 }),
    ];
    const k = kpisJogadoresAba(rows);
    expect(k.registros).toBe(2);
    expect(k.jogaramSpin).toBe(1);
    expect(k.jogaramOutros).toBe(2);
    expect(k.jogaram).toBe(3);
    expect(k.rodadas).toBe(10);
    expect(k.ggrSpin).toBe(50);
    expect(k.turnoverSpin).toBe(400);
    expect(k.mediaRodadas).toBe(10);
    expect(k.taxaAtivacao).toBeCloseTo(100 / 3, 5);
  });

  it("não conta como Outros quem jogou Spin no período", () => {
    const rows = [
      fact({ ext_customer_id: "1", deposit_count: 1, jogou_outros: true }),
      fact({ ext_customer_id: "1", rodadas_spin: 3, jogou_spin: true }),
    ];
    const k = kpisJogadoresAba(rows);
    expect(k.jogaramSpin).toBe(1);
    expect(k.jogaramOutros).toBe(0);
    expect(k.jogaram).toBe(1);
  });

  it("trata o mesmo ID em operadoras distintas como jogadores distintos", () => {
    const rows = [
      fact({ ext_customer_id: "1", operadora_slug: "casa_apostas", registration_count: 1 }),
      fact({ ext_customer_id: "1", operadora_slug: "blaze", registration_count: 1 }),
    ];
    expect(kpisJogadoresAba(rows).registros).toBe(2);
  });
});

describe("rankingJogadoresAba", () => {
  it("agrega por influencer e ordena por rodadas Spin", () => {
    const nomes = new Map([
      ["inf-a", "Gabs Live"],
      ["inf-b", "Lua Cassino"],
    ]);
    const rows = [
      fact({ ext_customer_id: "1", influencer_id: "inf-a", registration_count: 1, rodadas_spin: 5, jogou_spin: true }),
      fact({ ext_customer_id: "2", influencer_id: "inf-b", registration_count: 1, deposit_count: 1 }),
      fact({ ext_customer_id: "3", influencer_id: "inf-b", registration_count: 1, rodadas_spin: 20, jogou_spin: true }),
    ];
    const ranking = rankingJogadoresAba(rows, nomes);
    expect(ranking.map((r) => r.influencer_id)).toEqual(["inf-b", "inf-a"]);
    expect(ranking[0].rodadas).toBe(20);
    expect(ranking[0].registros).toBe(2);
    expect(ranking[0].jogaram).toBe(2);
    expect(ranking[0].jogaramSpin).toBe(1);
    expect(ranking[1].pctRegSpin).toBe(100);
  });

  it("omite jogadores sem influencer mapeado", () => {
    const rows = [fact({ ext_customer_id: "9", influencer_id: null, registration_count: 1 })];
    expect(rankingJogadoresAba(rows, new Map([["inf-a", "Gabs"]]))).toEqual([]);
    expect(kpisJogadoresAba(rows).registros).toBe(1);
  });
});

describe("mesasJogadoresAba", () => {
  it("soma rodadas por estúdio + mesa e pinta com identidade de jogo", () => {
    const rows = [
      fact({
        ext_customer_id: "1",
        rodadas_por_mesa: [
          { estudio: "Casa de Apostas", mesa: "Blackjack 2", rodadas: 100 },
          { estudio: "Sports Club", mesa: "Speed Baccarat", rodadas: 40 },
        ],
      }),
      fact({
        ext_customer_id: "2",
        rodadas_por_mesa: [{ estudio: "Casa de Apostas", mesa: "Blackjack 2", rodadas: 20 }],
      }),
    ];
    const mesas = mesasJogadoresAba(rows);
    expect(mesas[0]).toMatchObject({
      estudio: "Casa de Apostas",
      mesa: "Blackjack 2",
      rodadas: 120,
      cor: GAME_IDENTITY_HEX.blackjack,
    });
    expect(mesas[1].cor).toBe(GAME_IDENTITY_HEX.baccarat);
  });
});

describe("pctJogadores / fmtPctJogadores", () => {
  it("devolve — com denominador zero", () => {
    expect(pctJogadores(1, 0)).toBeNull();
    expect(fmtPctJogadores(null)).toBe("—");
    expect(fmtPctJogadores(62.6)).toBe("62,6%");
  });
});
