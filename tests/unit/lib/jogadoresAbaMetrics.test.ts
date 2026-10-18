import { describe, expect, it } from "vitest";
import { GAME_IDENTITY_HEX } from "@/lib/gameIdentityColors";
import {
  aplicarRegistrosUnicosPorInfluencer,
  contarRegistrosUnicosJogadores,
  filtrarRowsJogaramSpin,
  fmtPctJogadores,
  kpisJogadoresAba,
  mesasJogadoresAba,
  pctJogadores,
  rankingJogadoresAba,
  recortarJogadoresAbaDaily,
  uapSpinJogadoresAba,
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
  it("deduplica ID Ext e parte Registros em Spin, Outros e Não Jogaram", () => {
    const rows: JogadorAbaDailyFact[] = [
      fact({ ext_customer_id: "1", registration_count: 1 }),
      fact({ ext_customer_id: "1", deposit_count: 1, jogou_outros: true }),
      fact({ ext_customer_id: "2", registration_count: 1, rodadas_spin: 10, jogou_spin: true, ggr_spin: 50, turnover_spin: 400 }),
      fact({ ext_customer_id: "3", deposit_count: 2 }),
      fact({ ext_customer_id: "4", registration_count: 1 }),
    ];
    const k = kpisJogadoresAba(rows);
    expect(k.registros).toBe(3);
    expect(k.jogaramSpin).toBe(1);
    expect(k.jogaramOutros).toBe(1);
    expect(k.naoJogaram).toBe(1);
    expect(k.jogaramSpin + k.jogaramOutros + k.naoJogaram).toBe(k.registros);
    expect(k.jogaram).toBe(2);
    expect(k.rodadas).toBe(10);
    expect(k.ggrSpin).toBe(50);
    expect(k.turnoverSpin).toBe(400);
    expect(k.mediaRodadas).toBe(10);
    expect(k.taxaAtivacao).toBeCloseTo(100 / 3, 5);
  });

  it("Jogaram Spin só com rodadas_spin > 0 entre quem registrou", () => {
    const rows = [
      fact({ ext_customer_id: "1", registration_count: 1, jogou_spin: true, rodadas_spin: 0, deposit_count: 1 }),
    ];
    const k = kpisJogadoresAba(rows);
    expect(k.registros).toBe(1);
    expect(k.jogaramSpin).toBe(0);
    expect(k.jogaramOutros).toBe(1);
    expect(k.naoJogaram).toBe(0);
  });

  it("não conta como Outros quem jogou Spin no período", () => {
    const rows = [
      fact({ ext_customer_id: "1", registration_count: 1, deposit_count: 1, jogou_outros: true }),
      fact({ ext_customer_id: "1", rodadas_spin: 3, jogou_spin: true }),
    ];
    const k = kpisJogadoresAba(rows);
    expect(k.registros).toBe(1);
    expect(k.jogaramSpin).toBe(1);
    expect(k.jogaramOutros).toBe(0);
    expect(k.naoJogaram).toBe(0);
    expect(k.jogaram).toBe(1);
  });

  it("volume conta só quem entrou em Jogaram Spin (registro e rodada no período)", () => {
    const rows = [
      fact({ ext_customer_id: "1", registration_count: 1, rodadas_spin: 30, jogou_spin: true, ggr_spin: 90, turnover_spin: 700 }),
      // Rodou no período, mas cadastrou-se antes — fora da coorte, não infla volume nem média.
      fact({ ext_customer_id: "2", rodadas_spin: 500, jogou_spin: true, ggr_spin: 4000, turnover_spin: 20000 }),
    ];
    const k = kpisJogadoresAba(rows);
    expect(k.registros).toBe(1);
    expect(k.jogaramSpin).toBe(1);
    expect(k.rodadas).toBe(30);
    expect(k.ggrSpin).toBe(90);
    expect(k.turnoverSpin).toBe(700);
    expect(k.mediaRodadas).toBe(30);
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
    expect(ranking[0].jogaramOutros).toBe(1);
    expect(ranking[0].jogaramSpin).toBe(1);
    expect(ranking[0].naoJogaram).toBe(0);
    expect(ranking[0].jogaramSpin + ranking[0].jogaramOutros + ranking[0].naoJogaram).toBe(ranking[0].registros);
    expect(ranking[0].pctRegJog).toBe(100);
    expect(ranking[0].pctJogSpin).toBe(50);
    expect(ranking[1].pctRegSpin).toBe(100);
  });

  it("ignora no volume do influencer quem jogou sem registro no período", () => {
    const nomes = new Map([["inf-a", "Gabs Live"]]);
    const rows = [
      fact({ ext_customer_id: "1", influencer_id: "inf-a", registration_count: 1, rodadas_spin: 8, jogou_spin: true, ggr_spin: 20, turnover_spin: 120 }),
      fact({ ext_customer_id: "2", influencer_id: "inf-a", rodadas_spin: 400, jogou_spin: true, ggr_spin: 900, turnover_spin: 5000 }),
    ];
    const ranking = rankingJogadoresAba(rows, nomes);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].registros).toBe(1);
    expect(ranking[0].rodadas).toBe(8);
    expect(ranking[0].ggrSpin).toBe(20);
    expect(ranking[0].turnoverSpin).toBe(120);
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
          { estudio: "Dedicada", mesa: "Blackjack 2", rodadas: 100 },
          { estudio: "Network", mesa: "Speed Baccarat", rodadas: 40 },
        ],
      }),
      fact({
        ext_customer_id: "2",
        rodadas_por_mesa: [{ estudio: "Dedicada", mesa: "Blackjack 2", rodadas: 20 }],
      }),
    ];
    const mesas = mesasJogadoresAba(rows);
    expect(mesas[0]).toMatchObject({
      estudio: "Dedicada",
      mesa: "Blackjack 2",
      rodadas: 120,
      cor: GAME_IDENTITY_HEX.blackjack,
    });
    expect(mesas[1].cor).toBe(GAME_IDENTITY_HEX.baccarat);
  });

  it("não deixa o bloco vazio quando o RS não identifica a mesa", () => {
    const mesas = mesasJogadoresAba([
      fact({ ext_customer_id: "1", rodadas_spin: 25, rodadas_por_jogo: null, rodadas_por_mesa: [] }),
    ]);
    expect(mesas).toEqual([
      expect.objectContaining({ estudio: "—", mesa: "Mesa não informada", rodadas: 25 }),
    ]);
  });
});

describe("filtrarRowsJogaramSpin", () => {
  it("mantém só as linhas de quem registrou e rodou no período", () => {
    const rows = [
      fact({ ext_customer_id: "1", registration_count: 1 }),
      fact({ ext_customer_id: "1", rodadas_spin: 12, jogou_spin: true, rodadas_por_jogo: { roleta: 12 } }),
      fact({ ext_customer_id: "2", rodadas_spin: 900, jogou_spin: true, rodadas_por_jogo: { roleta: 900 } }),
      fact({ ext_customer_id: "3", registration_count: 1, deposit_count: 1 }),
    ];
    const elegiveis = filtrarRowsJogaramSpin(rows);
    expect(elegiveis.every((r) => r.ext_customer_id === "1")).toBe(true);
    expect(mesasJogadoresAba(elegiveis).reduce((s, m) => s + m.rodadas, 0)).toBe(
      kpisJogadoresAba(rows).rodadas,
    );
  });
});

describe("uapSpinJogadoresAba", () => {
  it("deduplica TAP ID no período e soma todas as rodadas, sem exigir registro no mês", () => {
    const rows = [
      fact({ ext_customer_id: "1", rodadas_spin: 10 }),
      fact({ ext_customer_id: "1", rodadas_spin: 5 }),
      fact({ ext_customer_id: "2", rodadas_spin: 20 }),
      fact({ ext_customer_id: "3", rodadas_spin: 0 }),
      fact({ ext_customer_id: "4", influencer_id: null, rodadas_spin: 99 }),
    ];
    expect(uapSpinJogadoresAba(rows)).toEqual({ uap: 2, rodadas: 35 });
  });

  it("trata o mesmo TAP ID em operadoras distintas como UAPs distintos e respeita influencer", () => {
    const rows = [
      fact({ ext_customer_id: "1", influencer_id: "inf-a", operadora_slug: "casa_apostas", rodadas_spin: 10 }),
      fact({ ext_customer_id: "1", influencer_id: "inf-a", operadora_slug: "blaze", rodadas_spin: 20 }),
      fact({ ext_customer_id: "2", influencer_id: "inf-b", operadora_slug: "blaze", rodadas_spin: 30 }),
    ];
    expect(uapSpinJogadoresAba(rows, new Set(["inf-a"]))).toEqual({ uap: 2, rodadas: 30 });
  });
});

describe("pctJogadores / fmtPctJogadores", () => {
  it("devolve — com denominador zero", () => {
    expect(pctJogadores(1, 0)).toBeNull();
    expect(fmtPctJogadores(null)).toBe("—");
    expect(fmtPctJogadores(62.6)).toBe("62,6%");
  });
});

describe("recortarJogadoresAbaDaily", () => {
  const rows: JogadorAbaDailyFact[] = [
    fact({ ext_customer_id: "1", influencer_id: "inf-eu", operadora_slug: "casa_apostas", registration_count: 1 }),
    fact({ ext_customer_id: "2", influencer_id: "inf-outro", operadora_slug: "casa_apostas", registration_count: 1 }),
    fact({ ext_customer_id: "3", influencer_id: "inf-eu", operadora_slug: "blaze", registration_count: 1 }),
    fact({ ext_customer_id: "4", influencer_id: null, operadora_slug: "casa_apostas", registration_count: 1 }),
  ];

  it("proprios: KPIs só do influencer e da operadora do escopo (sem ID sem mapeamento)", () => {
    const visivel = recortarJogadoresAbaDaily(rows, {
      influencerIds: ["inf-eu"],
      operadoraSlugs: ["casa_apostas"],
      incluirSemInfluencer: false,
    });
    expect(kpisJogadoresAba(visivel).registros).toBe(1);
    expect(visivel.every((r) => r.influencer_id === "inf-eu" && r.operadora_slug === "casa_apostas")).toBe(true);
  });

  it("visão global da aba Jogadores: UTMs de influencer — sem ID Ext órfão", () => {
    const visivel = recortarJogadoresAbaDaily(rows, {
      influencerIds: null,
      operadoraSlugs: null,
      incluirSemInfluencer: false,
    });
    expect(kpisJogadoresAba(visivel).registros).toBe(3);
  });
});

describe("contarRegistrosUnicosJogadores", () => {
  it("deduplica o mesmo ID em dois dias e atribui first-touch ao influencer", () => {
    const u = contarRegistrosUnicosJogadores([
      fact({ ext_customer_id: "1", registration_count: 1, influencer_id: "inf-a" }),
      fact({ ext_customer_id: "1", registration_count: 1, influencer_id: "inf-b" }),
      fact({ ext_customer_id: "2", registration_count: 1, influencer_id: "inf-a" }),
      fact({ ext_customer_id: "3", registration_count: 0, influencer_id: "inf-a" }),
      fact({ ext_customer_id: "4", registration_count: 1, influencer_id: null }),
    ]);
    expect(u.total).toBe(2);
    expect(u.porInfluencer.get("inf-a")).toBe(2);
    expect(u.porInfluencer.has("inf-b")).toBe(false);
  });

  it("substitui a soma TAP no ranking pelo único por influencer", () => {
    const rows = aplicarRegistrosUnicosPorInfluencer(
      [
        { influencer_id: "inf-a", registros: 99 },
        { influencer_id: "inf-b", registros: 7 },
      ],
      new Map([["inf-a", 2]]),
    );
    expect(rows[0].registros).toBe(2);
    expect(rows[1].registros).toBe(0);
  });
});
