import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

function frame(rows: Row[]) {
  const fields = Object.keys(rows[0] ?? {});
  return {
    schema: { fields: fields.map((name) => ({ name })) },
    data: { values: fields.map((name) => rows.map((row) => row[name])) },
  };
}

function result(rows: Row[]) {
  return { frames: [frame(rows)] };
}

describe("grafana-mesas-spin-extract-browser", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __mesasGrafana?: unknown })
      .__mesasGrafana;
    vi.restoreAllMocks();
  });

  it("consulta BRL nativo e produz o contrato canônico do runner", async () => {
    let requestBody: {
      queries: Array<{ refId: string; rawSql: string }>;
    } | null = null;

    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      requestBody = JSON.parse(String(init.body));
      return new Response(
        JSON.stringify({
          results: {
            NB: result([
              {
                dia: "2026-09-17",
                slug: "casa_apostas",
                game_type: "Roulette",
                apostas: 10,
                turnover: 20.5,
                ggr: -2.25,
              },
            ]),
            DB: result([
              {
                dia: "2026-09-17",
                slug: "blaze",
                table_name: "Blaze Roulette",
                apostas: 30,
                turnover: 40.5,
                ggr: 3.25,
              },
            ]),
            EUT: result([]),
            EUJ: result([]),
            OUT: result([
              { dia: "2026-09-17", slug: "casa_apostas", uap: 4 },
            ]),
            OUJ: result([
              {
                dia: "2026-09-17",
                slug: "casa_apostas",
                game_type: "Roulette",
                uap: 5,
              },
            ]),
            DUT: result([{ dia: "2026-09-17", slug: "blaze", uap: 6 }]),
            DUJ: result([
              {
                dia: "2026-09-17",
                slug: "blaze",
                game_type: "Roulette",
                uap: 7,
              },
            ]),
            EM: result([]),
            OM: result([
              { mes: "2026-09-01", slug: "casa_apostas", uap: 8 },
            ]),
            DM: result([{ mes: "2026-09-01", slug: "blaze", uap: 9 }]),
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const source = readFileSync(
      resolve("scripts/grafana-mesas-spin-extract-browser.js"),
      "utf8",
    );
    const expression = source
      .slice(source.indexOf("(async () =>"))
      .trim()
      .replace(/;\s*$/, "");
    const execute = new Function(
      "fetch",
      "location",
      `return (${expression});`,
    ) as (
      fetchFn: typeof fetchMock,
      location: { origin: string },
    ) => Promise<{ ok: boolean }>;

    const summary = await execute(fetchMock, {
      origin: "https://grafana.example",
    });
    const extracted = (
      globalThis as typeof globalThis & {
        __mesasGrafana: {
          network: Record<string, Record<string, { byDay: Record<string, Row[]> }>>;
          dedicado: Record<string, Record<string, { byDay: Record<string, Row[]> }>>;
          monthly: Record<string, { uap: number }>;
        };
      }
    ).__mesasGrafana;

    expect(summary.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestBody?.queries).toHaveLength(11);

    const networkSql = requestBody?.queries.find(
      (query) => query.refId === "NB",
    )?.rawSql;
    expect(networkSql).toContain("sum(amount) AS turnover");
    expect(networkSql).toContain("sum(amount) - sum(payout) AS ggr");
    expect(networkSql).toContain("currency = 'BRL'");
    expect(networkSql).not.toContain("amount_eur");

    expect(extracted.network.casa.TO.byDay["2026-09-17"]).toEqual([
      { TO: 20.5, f: "Roulette" },
    ]);
    expect(extracted.network.casa.UAP_TOT.byDay["2026-09-17"]).toEqual([
      { UAP: 4, f: null },
    ]);
    expect(extracted.dedicado.blaze.BET.byDay["2026-09-17"]).toEqual([
      { BET: 30, f: "Blaze Roulette" },
    ]);
    expect(extracted.monthly.net_casa.uap).toBe(8);
    expect(extracted.monthly.ded_blaze.uap).toBe(9);
    expect(extracted.monthly.net_betponto.uap).toBe(0);
  });
});
