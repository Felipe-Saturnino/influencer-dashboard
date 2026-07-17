import { afterEach, describe, expect, it, vi } from "vitest";
import type { BancaRowDb } from "@/pages/aquisicao/BancaJogo/bancaJogoTypes";
import {
  formatarCPFVisivel,
  mascaraCPF,
  periodoDoMes,
  rowInteressaConsolidado,
  rowNoMesSolicitacao,
  rowPassaFiltrosComunsBanca,
} from "@/pages/aquisicao/BancaJogo/bancaJogoHelpers";
import type { BlocoFiltros } from "@/pages/aquisicao/BancaJogo/bancaJogoFiltros";

const rowBase = (over: Partial<BancaRowDb> = {}): BancaRowDb => ({
  id: "1",
  influencer_id: "inf-1",
  operadora_slug: "spin",
  id_operadora_exibicao: null,
  valor: 100,
  status: "solicitado",
  solicitado_em: "2026-03-10T12:00:00.000Z",
  aprovado_em: null,
  aprovado_por: null,
  liberado_em: null,
  liberado_por: null,
  ...over,
});

const filtrosBase = (): BlocoFiltros => ({
  podeVerInfluencer: () => true,
  podeVerOperadora: () => true,
  filterInfluencers: [],
  filtroOp: null,
  filterOperadora: "todas",
  operadorasList: [],
  mesFiltro: "2026-03",
  historico: false,
});

describe("mascaraCPF / formatarCPFVisivel", () => {
  it("mascara CPF completo", () => {
    expect(mascaraCPF("12345678901")).toBe("***.***.***-**");
  });

  it("formata CPF com 11 dígitos", () => {
    expect(formatarCPFVisivel("12345678901")).toBe("123.456.789-01");
  });

  it("retorna — para CPF incompleto na máscara", () => {
    expect(mascaraCPF("123")).toBe("—");
  });
});

describe("periodoDoMes", () => {
  it("retorna null para Total", () => {
    expect(periodoDoMes("")).toBeNull();
  });

  it("calcula último dia do mês", () => {
    expect(periodoDoMes("2026-02")).toEqual({ inicio: "2026-02-01", fim: "2026-02-28" });
  });
});

describe("rowNoMesSolicitacao", () => {
  const periodo = { inicio: "2026-03-01", fim: "2026-03-31" };

  afterEach(() => vi.useRealTimers());

  it("inclui linha dentro do período", () => {
    expect(rowNoMesSolicitacao(rowBase(), periodo, false)).toBe(true);
  });

  it("exclui fora do período", () => {
    expect(
      rowNoMesSolicitacao(rowBase({ solicitado_em: "2026-02-01T00:00:00.000Z" }), periodo, false),
    ).toBe(false);
  });

  it("histórico limita a competência atual e as 12 anteriores", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 16));
    expect(
      rowNoMesSolicitacao(rowBase({ solicitado_em: "2025-07-01T00:00:00.000Z" }), periodo, true),
    ).toBe(true);
    expect(
      rowNoMesSolicitacao(rowBase({ solicitado_em: "2025-06-30T23:59:59.000Z" }), periodo, true),
    ).toBe(false);
  });
});

describe("rowInteressaConsolidado", () => {
  const periodo = { inicio: "2026-03-01", fim: "2026-03-31" };

  it("inclui quando liberado_em cai no período", () => {
    expect(
      rowInteressaConsolidado(
        rowBase({
          solicitado_em: "2026-01-01T00:00:00.000Z",
          liberado_em: "2026-03-15T00:00:00.000Z",
        }),
        periodo,
        false,
      ),
    ).toBe(true);
  });
});

describe("rowPassaFiltrosComunsBanca", () => {
  it("filtra por operadora e influencer", () => {
    const f = filtrosBase();
    expect(rowPassaFiltrosComunsBanca(rowBase(), f)).toBe(true);
    expect(
      rowPassaFiltrosComunsBanca(rowBase({ operadora_slug: "spin" }), {
        ...f,
        filterOperadora: "spin",
      }),
    ).toBe(true);
    expect(
      rowPassaFiltrosComunsBanca(rowBase({ operadora_slug: "x" }), {
        ...f,
        filterOperadora: "spin",
      }),
    ).toBe(false);
    expect(
      rowPassaFiltrosComunsBanca(rowBase(), {
        ...f,
        podeVerInfluencer: () => false,
      }),
    ).toBe(false);
    expect(
      rowPassaFiltrosComunsBanca(rowBase(), {
        ...f,
        filterInfluencers: ["outro-id"],
      }),
    ).toBe(false);
  });
});
