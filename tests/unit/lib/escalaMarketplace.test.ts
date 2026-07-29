import { describe, expect, it } from "vitest";
import {
  diasOfertaveisMarketplace,
  gapEntreTurnosOk,
  mensagemErroOfertaMarketplace,
  parseMeuContextoMarketplace,
  parseMinhaGradeMarketplace,
  parseOfertasMarketplacePayload,
  primeiroDiaOfertavelIso,
  timeKeyFromOrgTimeNome,
  turnosOfertaveisNaFolgaMarketplace,
} from "../../../src/lib/escalaMarketplace";

const HORARIO_4X2 = { escala: "4x2", staff_turno: "Manhã", staff_horario_turno: null };
const OPERADORA = {
  turno_manha_inicio: "07:00",
  turno_tarde_inicio: "13:00",
  turno_noite_inicio: "19:00",
};

describe("parseOfertasMarketplacePayload", () => {
  it("mapeia oferta enriquecida do jsonb", () => {
    const rows = parseOfertasMarketplacePayload([
      {
        id: "11111111-2222-3333-4444-555555555555",
        tipo: "venda_folga",
        status: "aberta",
        dia_iso: "2026-08-12",
        valor_celula_origem: "Folga",
        turno_label: "Tarde",
        dia_iso_interesse: null,
        valor_celula_interesse: null,
        criado_em: "2026-07-29T12:00:00Z",
        observacao: "Aceito trocar depois",
        ofertante_funcionario_id: "aaaa",
        ofertante_nome: "Ana Souza",
        operadora_slug: "blaze",
        operadora_nome: "Blaze",
        org_time_id: "bbbb",
        time_nome: "Game Presenter",
        interessado_funcionario_id: null,
        interessado_nome: null,
        sou_ofertante: false,
        sou_interessado: false,
        mesmo_time: true,
      },
    ]);

    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.tipo).toBe("venda_folga");
    expect(row.status).toBe("aberto");
    expect(row.turnoOferta).toBe("Tarde");
    expect(row.operadora).toBe("Blaze");
    expect(row.ofertante).toBe("Ana Souza");
    expect(row.timeKey).toBe("game_presenter");
    expect(row.observacao).toBe("Aceito trocar depois");
    expect(row.souOfertante).toBe(false);
    expect(row.mesmoTime).toBe(true);
  });

  it("aceita payload serializado como string e ignora linhas sem id", () => {
    const rows = parseOfertasMarketplacePayload(
      JSON.stringify([
        { tipo: "venda_turno", dia_iso: "2026-08-01" },
        {
          id: "abc",
          tipo: "venda_turno",
          status: "aceita",
          dia_iso: "2026-08-02",
          valor_celula_origem: "MRN",
          turno_label: null,
          criado_em: "2026-07-20T00:00:00Z",
          ofertante_funcionario_id: "of-1",
          ofertante_nome: null,
          org_time_id: "t-1",
          time_nome: "Shuffler",
          interessado_funcionario_id: "in-1",
          interessado_nome: "João",
          sou_interessado: true,
        },
      ]),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("aprovada");
    expect(rows[0]!.turnoOferta).toBe("Manhã");
    expect(rows[0]!.comprador).toBe("João");
    expect(rows[0]!.souInteressado).toBe(true);
    expect(rows[0]!.timeKey).toBe("shuffler");
  });
});

describe("timeKeyFromOrgTimeNome", () => {
  it("normaliza acentos e prefixos do organograma", () => {
    expect(timeKeyFromOrgTimeNome("Time de Game Presenter")).toBe("game_presenter");
    expect(timeKeyFromOrgTimeNome("Performance Coach")).toBe("performance_coach");
    expect(timeKeyFromOrgTimeNome("Comercial B2B")).toBe("todos");
  });
});

describe("parseMeuContextoMarketplace", () => {
  it("devolve contexto do prestador com horário e operadora", () => {
    const ctx = parseMeuContextoMarketplace({
      ok: true,
      escopo: "proprios",
      funcionario: {
        id: "f-1",
        nome: "Ana",
        org_time_id: "t-1",
        time_nome: "Game Presenter",
        area_key: "game_presenter",
        area_atuacao: "Estúdio",
        escala: "4x2",
        staff_turno: "Manhã",
      },
      operadora: OPERADORA,
    });

    expect(ctx?.escopo).toBe("proprios");
    expect(ctx?.funcionarioId).toBe("f-1");
    expect(ctx?.horario.escala).toBe("4x2");
    expect(ctx?.operadora?.turno_noite_inicio).toBe("19:00");
  });

  it("devolve contexto sem funcionário quando o usuário não é prestador", () => {
    const ctx = parseMeuContextoMarketplace({ ok: true, escopo: "sim", funcionario: null });
    expect(ctx?.funcionarioId).toBeNull();
    expect(ctx?.operadora).toBeNull();
  });

  it("devolve null quando a RPC não confirma ok", () => {
    expect(parseMeuContextoMarketplace({ ok: false, error: "forbidden" })).toBeNull();
  });
});

describe("parseMinhaGradeMarketplace", () => {
  it("indexa a célula por dia e mantém o flag de aprovação", () => {
    const grade = parseMinhaGradeMarketplace({
      ok: true,
      aprovada: true,
      area_key: "game_presenter",
      dias: [
        { dia_iso: "2026-08-01", valor: "MRN" },
        { dia_iso: "2026-08-02", valor: "Folga" },
        { dia_iso: "invalido", valor: "NGT" },
      ],
    });

    expect(grade.aprovada).toBe(true);
    expect(grade.valorPorIso.get("2026-08-01")).toBe("MRN");
    expect(grade.valorPorIso.has("invalido")).toBe(false);
    expect(grade.valorPorIso.size).toBe(2);
  });
});

describe("primeiroDiaOfertavelIso", () => {
  it("exige 24h de antecedência — primeiro dia é hoje + 2", () => {
    expect(primeiroDiaOfertavelIso(new Date(2026, 7, 10, 23, 59))).toBe("2026-08-12");
    expect(primeiroDiaOfertavelIso(new Date(2026, 7, 30, 8, 0))).toBe("2026-09-01");
  });
});

describe("diasOfertaveisMarketplace", () => {
  const hoje = new Date(2026, 7, 10);
  const grade = new Map<string, string>([
    ["2026-08-09", "MRN"],
    ["2026-08-10", "AFT"],
    ["2026-08-11", "NGT"],
    ["2026-08-12", "Folga"],
    ["2026-08-13", "Venda"],
    ["2026-08-14", "MRN"],
  ]);

  it("lista só dias escalados com 24h de antecedência para venda de turno", () => {
    const dias = diasOfertaveisMarketplace("venda_turno", grade, hoje);
    expect(dias.map((d) => d.iso)).toEqual(["2026-08-14"]);
    expect(dias[0]!.turno).toBe("Manhã");
    expect(dias[0]!.label).toContain("14/08/2026");
  });

  it("descarta amanhã por não cumprir as 24h", () => {
    const dias = diasOfertaveisMarketplace("venda_turno", grade, hoje);
    expect(dias.map((d) => d.iso)).not.toContain("2026-08-11");
  });

  it("lista só folgas com 24h de antecedência para venda de folga", () => {
    const dias = diasOfertaveisMarketplace("venda_folga", grade, hoje);
    expect(dias.map((d) => d.iso)).toEqual(["2026-08-12"]);
    expect(dias[0]!.turno).toBe("");
  });

  it("lista dias escalados na oferta de troca e exclui dias já negociados", () => {
    const dias = diasOfertaveisMarketplace("oferta_troca", grade, hoje);
    expect(dias.map((d) => d.iso)).toEqual(["2026-08-14"]);
    expect(dias.map((d) => d.iso)).not.toContain("2026-08-13");
  });
});

describe("gapEntreTurnosOk", () => {
  it("bloqueia manhã depois de turno da noite (4h de intervalo)", () => {
    const grade = new Map<string, string>([["2026-08-09", "NGT"]]);
    expect(
      gapEntreTurnosOk({
        diaIso: "2026-08-10",
        turnoNome: "Manhã",
        valorPorIso: grade,
        horario: HORARIO_4X2,
        operadora: OPERADORA,
      }),
    ).toBe(false);
  });

  it("bloqueia noite quando o dia seguinte já tem manhã escalada", () => {
    const grade = new Map<string, string>([["2026-08-11", "MRN"]]);
    expect(
      gapEntreTurnosOk({
        diaIso: "2026-08-10",
        turnoNome: "Noite",
        valorPorIso: grade,
        horario: HORARIO_4X2,
        operadora: OPERADORA,
      }),
    ).toBe(false);
  });

  it("permite quando as duas pontas respeitam 12h", () => {
    const grade = new Map<string, string>([
      ["2026-08-09", "MRN"],
      ["2026-08-12", "MRN"],
    ]);
    expect(
      gapEntreTurnosOk({
        diaIso: "2026-08-10",
        turnoNome: "Manhã",
        valorPorIso: grade,
        horario: HORARIO_4X2,
        operadora: OPERADORA,
      }),
    ).toBe(true);
  });

  it("não bloqueia quando o horário não é resolvível (cadastro incompleto)", () => {
    expect(
      gapEntreTurnosOk({
        diaIso: "2026-08-10",
        turnoNome: "Manhã",
        valorPorIso: new Map([["2026-08-09", "NGT"]]),
        horario: { escala: "4x2" },
        operadora: null,
      }),
    ).toBe(true);
  });
});

describe("turnosOfertaveisNaFolgaMarketplace", () => {
  // Noite em 12/08 (19:00 → 03:00 do dia 13) e folga em 13 e 14.
  const grade = new Map<string, string>([
    ["2026-08-12", "NGT"],
    ["2026-08-13", "Folga"],
    ["2026-08-14", "Folga"],
  ]);

  it("no dia seguinte ao turno da noite sobra apenas a noite", () => {
    const turnos = turnosOfertaveisNaFolgaMarketplace("2026-08-13", grade, HORARIO_4X2, OPERADORA);
    expect(turnos).toEqual(["Noite"]);
  });

  it("dois dias depois todos os turnos voltam a caber", () => {
    const turnos = turnosOfertaveisNaFolgaMarketplace("2026-08-14", grade, HORARIO_4X2, OPERADORA);
    expect(turnos).toEqual(["Manhã", "Tarde", "Noite"]);
  });

  it("respeita também o próximo turno escalado depois da folga", () => {
    const comProximo = new Map(grade);
    comProximo.set("2026-08-15", "MRN");
    const turnos = turnosOfertaveisNaFolgaMarketplace(
      "2026-08-14",
      comProximo,
      HORARIO_4X2,
      OPERADORA,
    );
    expect(turnos).not.toContain("Noite");
    expect(turnos).toContain("Manhã");
  });
});

describe("mensagemErroOfertaMarketplace", () => {
  it("traduz códigos conhecidos", () => {
    expect(mensagemErroOfertaMarketplace("oferta_duplicada")).toBe(
      "Você já tem uma oferta aberta para este dia.",
    );
    expect(mensagemErroOfertaMarketplace("turno_diferente")).toContain("mesmo do seu turno");
  });

  it("usa mensagem genérica com fecho de suporte em código desconhecido", () => {
    expect(mensagemErroOfertaMarketplace("boom")).toContain("entre em contato com o suporte");
  });
});
