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
});

describe("chunkIds", () => {
  it("parte em 500", () => {
    const ids = Array.from({ length: 501 }, (_, i) => String(i));
    expect(chunkIds(ids)).toHaveLength(2);
    expect(chunkIds(ids)[0]).toHaveLength(500);
    expect(chunkIds(ids)[1]).toHaveLength(1);
  });
});
