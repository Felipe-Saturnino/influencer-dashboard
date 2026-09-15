import { describe, expect, it } from "vitest";
import {
  chunkIds,
  parseJogadoresSpinResponse,
  tapIdFromRsExternal,
} from "../../../src/lib/revenueSentinelJogadores";

describe("tapIdFromRsExternal", () => {
  it("mantém ID TAP numérico", () => {
    expect(tapIdFromRsExternal("2112839")).toBe("2112839");
  });

  it("extrai sufixo CDA- do OnAir", () => {
    expect(tapIdFromRsExternal("casadeapostas.if_dgc.L011_358_56.CDA-2185779")).toBe("2185779");
  });
});

describe("parseJogadoresSpinResponse", () => {
  it("lê items planos + missing", () => {
    const r = parseJogadoresSpinResponse({
      missing: ["999"],
      items: [
        {
          operator_name: "Casa de Apostas",
          external_id: "casadeapostas.if_dgc.L011_358_56.CDA-2112839",
          snapshot_date: "2026-09-14",
          turnover: 1200,
          ggr: 80,
          bet_count: 12,
        },
      ],
    });
    expect(r.missing).toEqual(["999"]);
    expect(r.dias).toHaveLength(1);
    expect(r.dias[0]?.ext_customer_id).toBe("2112839");
    expect(r.dias[0]?.jogou_spin).toBe(true);
    expect(r.dias[0]?.apostas_spin).toBe(12);
    expect(r.dias[0]?.ggr_spin).toBe(80);
  });

  it("lê mapa de jogadores + dias por data", () => {
    const r = parseJogadoresSpinResponse({
      missing: [],
      found: {
        "2112839": {
          days: {
            "2026-09-14": { ggr: 10, turnover: 100, bet_count: 3 },
          },
        },
      },
    });
    expect(r.dias).toHaveLength(1);
    expect(r.dias[0]?.ext_customer_id).toBe("2112839");
    expect(r.dias[0]?.data).toBe("2026-09-14");
    expect(r.dias[0]?.ggr_spin).toBe(10);
  });

  it("totais da janela em spin (sem dias) gravados no ate", () => {
    const r = parseJogadoresSpinResponse({
      de: "2025-12-01",
      ate: "2026-09-15",
      found: 1,
      missing: [],
      jogadores: [
        {
          ext_customer_id: "2203598",
          external_id: "casadeapostas.if_dgc.L011_358_56.CDA-2203598",
          spin: { turnover: 1200, ggr: 80, player_net: 80, bet_count: 12, round_count: 10 },
          bko: {},
        },
      ],
    });
    expect(r.dias).toHaveLength(1);
    expect(r.dias[0]?.ext_customer_id).toBe("2203598");
    expect(r.dias[0]?.data).toBe("2026-09-15");
    expect(r.dias[0]?.rodadas_spin).toBe(10);
    expect(r.dias[0]?.apostas_spin).toBe(12);
    expect(r.dias[0]?.ggr_spin).toBe(80);
    expect(r.dias[0]?.turnover_spin).toBe(1200);
    expect(r.dias[0]?.jogou_spin).toBe(true);
    expect(r.dias[0]?.player_id_bko).toBe("casadeapostas.if_dgc.L011_358_56.CDA-2203598");
  });

  it("BKO com dias é mesa Spin (não é outro produto)", () => {
    const r = parseJogadoresSpinResponse({
      ate: "2026-09-15",
      jogadores: [
        {
          ext_customer_id: "2203598",
          spin: {},
          bko: {
            days: { "2026-09-14": { ggr: 40, turnover: 300, bet_count: 5 } },
          },
        },
      ],
    });
    expect(r.dias).toHaveLength(1);
    expect(r.dias[0]?.data).toBe("2026-09-14");
    expect(r.dias[0]?.ggr_spin).toBe(40);
    expect(r.dias[0]?.apostas_spin).toBe(5);
  });

  it("lê jogadores[].spin.days chaveado por data", () => {
    const r = parseJogadoresSpinResponse({
      found: 1,
      jogadores: [
        {
          ext_customer_id: "2203598",
          spin: {
            days: { "2026-09-14": { ggr: 10, turnover: 100, bet_count: 3 } },
          },
        },
      ],
    });
    expect(r.dias).toHaveLength(1);
    expect(r.dias[0]?.ggr_spin).toBe(10);
    expect(r.dias[0]?.apostas_spin).toBe(3);
  });

  it("lê jogadores[].spin como lista de dias", () => {
    const r = parseJogadoresSpinResponse({
      jogadores: [
        {
          ext_customer_id: "2203598",
          spin: [{ snapshot_date: "2026-09-14", ggr: 7, bet_count: 2 }],
        },
      ],
    });
    expect(r.dias).toHaveLength(1);
    expect(r.dias[0]?.ggr_spin).toBe(7);
  });

  it("jogador no RS sem rodada Spin não conta (outras fontes no lake)", () => {
    const r = parseJogadoresSpinResponse({
      ate: "2026-09-15",
      found: 1,
      missing: [],
      jogadores: [
        {
          ext_customer_id: "2203598",
          spin: { turnover: 0, ggr: 80, bet_count: 0, round_count: 0 },
          bko: {},
        },
      ],
    });
    expect(r.dias).toHaveLength(0);
  });

  it("round_count > 0 na janela conta Jogaram Spin", () => {
    const r = parseJogadoresSpinResponse({
      ate: "2026-09-15",
      jogadores: [
        {
          ext_customer_id: "2203598",
          spin: { round_count: 4, bet_count: 4, ggr: 10, turnover: 100 },
          bko: { round_count: 99 },
        },
      ],
    });
    expect(r.dias).toHaveLength(1);
    expect(r.dias[0]?.rodadas_spin).toBe(4);
    expect(r.dias[0]?.jogou_spin).toBe(true);
  });
});

describe("chunkIds", () => {
  it("parte em 500", () => {
    const ids = Array.from({ length: 501 }, (_, i) => String(i));
    expect(chunkIds(ids)).toHaveLength(2);
    expect(chunkIds(ids)[0]).toHaveLength(500);
    expect(chunkIds(ids)[1]).toHaveLength(1);
  });
});
