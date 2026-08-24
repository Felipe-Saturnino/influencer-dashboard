import { describe, expect, it } from "vitest";
import {
  diasOfertaveisMarketplace,
  gapEntreTurnosOk,
  isDataNoHistoricoMarketplace,
  mensagemErroOfertaMarketplace,
  ofertaPassaFiltroTimeMarketplace,
  filtroTimeGrupoNegociacaoMarketplace,
  fraseTipoOfertaMarketplace,
  formatarDiaIsoPtBr,
  marketplaceMostrarNovaOferta,
  marketplaceModoLiderancaGestao,
  marketplacePodeEditarOferta,
  marketplacePodeMinhasNegociacoes,
  marketplacePodeOfertar,
  marketplacePodeProporNoMural,
  overlayIdentidadeMarketplaceOfertas,
  parseHomeMarketplaceAlertas,
  fontesAlertaHomeDePayloadListar,
  alertasHomeMarketplaceDoPrestador,
  parseMeuContextoMarketplace,
  parseMinhaGradeMarketplace,
  parseOfertasMarketplacePayload,
  primeiroDiaOfertavelIso,
  timeKeyFromOrgTimeNome,
  turnosOfertaveisNaFolgaMarketplace,
  turnoMarketplacePermitidoNaArea,
  turnoRespeitaAntecedencia4h,
} from "../../../src/lib/escalaMarketplace";

const HORARIO_4X2 = { escala: "4x2", staff_turno: "Manhã", staff_horario_turno: null };
const OPERADORA = {
  turno_manha_inicio: "07:00",
  turno_tarde_inicio: "13:00",
  turno_noite_inicio: "19:00",
};

describe("isDataNoHistoricoMarketplace", () => {
  const ref = new Date(2026, 6, 29);

  it("inclui a competência atual inteira, mesmo após o dia de hoje", () => {
    expect(isDataNoHistoricoMarketplace("2026-07-31", ref)).toBe(true);
  });

  it("mantém o início nas 13 competências inclusivas", () => {
    expect(isDataNoHistoricoMarketplace("2025-07-01", ref)).toBe(true);
    expect(isDataNoHistoricoMarketplace("2025-06-30", ref)).toBe(false);
    expect(isDataNoHistoricoMarketplace(null, ref)).toBe(false);
  });

  it("sem competênciaFimMax, não inclui mês futuro além da ref", () => {
    expect(isDataNoHistoricoMarketplace("2026-08-01", ref)).toBe(false);
  });

  it("com competênciaFimMax do carrossel, inclui meses futuros da Escala", () => {
    expect(isDataNoHistoricoMarketplace("2026-08-01", ref, "2026-09")).toBe(true);
    expect(isDataNoHistoricoMarketplace("2026-09-30", ref, "2026-09")).toBe(true);
    expect(isDataNoHistoricoMarketplace("2026-10-01", ref, "2026-09")).toBe(false);
  });
});

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
    /** Oferta legada sem estúdio no cadastro cai no rótulo da operadora. */
    expect(row.estudio).toBe("Blaze");
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

  it("usa o estúdio do ofertante quando a RPC resolve o cadastro de Staff", () => {
    const rows = parseOfertasMarketplacePayload([
      {
        id: "of-estudio",
        tipo: "oferta_troca",
        status: "em_analise",
        dia_iso: "2026-08-20",
        valor_celula_origem: "NGT",
        turno_label: "Noite",
        criado_em: "2026-07-29T12:00:00Z",
        ofertante_funcionario_id: "of-2",
        ofertante_nome: "Bia Lima",
        estudio_nome: "Sports Club",
        operadora_slug: "blaze",
        operadora_nome: "Blaze",
        org_time_id: "t-2",
        time_nome: "Game Presenter",
      },
    ]);

    expect(rows[0]!.estudio).toBe("Sports Club");
    expect(rows[0]!.operadora).toBe("Blaze");
    expect(rows[0]!.status).toBe("em_analise");
  });
});

describe("timeKeyFromOrgTimeNome", () => {
  it("normaliza acentos e prefixos do organograma", () => {
    expect(timeKeyFromOrgTimeNome("Time de Game Presenter")).toBe("game_presenter");
    expect(timeKeyFromOrgTimeNome("Performance Coach")).toBe("performance_coach");
    expect(timeKeyFromOrgTimeNome("Shift Leader")).toBe("shift_leader");
    expect(timeKeyFromOrgTimeNome("Service Manager")).toBe("service_manager");
    expect(timeKeyFromOrgTimeNome("Comercial B2B")).toBe("todos");
  });
});

describe("filtroTimeGrupoNegociacaoMarketplace", () => {
  it("Liderança para SL e SM", () => {
    expect(filtroTimeGrupoNegociacaoMarketplace("shift_leader")).toBe("lideranca");
    expect(filtroTimeGrupoNegociacaoMarketplace("service_manager")).toBe("lideranca");
  });

  it("demais áreas ficam no próprio time", () => {
    expect(filtroTimeGrupoNegociacaoMarketplace("game_presenter")).toBe("game_presenter");
    expect(filtroTimeGrupoNegociacaoMarketplace("shuffler")).toBe("shuffler");
    expect(filtroTimeGrupoNegociacaoMarketplace("")).toBeNull();
    expect(filtroTimeGrupoNegociacaoMarketplace(null)).toBeNull();
  });
});

describe("fraseTipoOfertaMarketplace e formatarDiaIsoPtBr", () => {
  it("usa frase curta e data BR", () => {
    expect(fraseTipoOfertaMarketplace("oferta_troca")).toBe("troca");
    expect(fraseTipoOfertaMarketplace("venda_turno")).toBe("venda de turno");
    expect(formatarDiaIsoPtBr("2026-08-18")).toBe("18/08/2026");
  });
});

describe("parseHomeMarketplaceAlertas", () => {
  it("ignora itens incompletos", () => {
    const rows = parseHomeMarketplaceAlertas([
      { id: "1", kind: "pendente", tipo: "venda_turno", dia_iso: "2026-08-20" },
      { id: "2", kind: "outro", tipo: "venda_turno", dia_iso: "2026-08-20" },
      { kind: "lembrete", tipo: "oferta_troca", dia_iso: "2026-08-21" },
    ]);
    expect(rows).toEqual([
      { id: "1", kind: "pendente", tipo: "venda_turno", diaIso: "2026-08-20" },
    ]);
  });
});

describe("ofertaPassaFiltroTimeMarketplace", () => {
  it("Liderança agrega Shift Leader e Service Manager", () => {
    expect(ofertaPassaFiltroTimeMarketplace("shift_leader", "lideranca")).toBe(true);
    expect(ofertaPassaFiltroTimeMarketplace("service_manager", "lideranca")).toBe(true);
    expect(ofertaPassaFiltroTimeMarketplace("game_presenter", "lideranca")).toBe(false);
    expect(ofertaPassaFiltroTimeMarketplace("shuffler", "lideranca")).toBe(false);
  });

  it("filtro específico não cruza times", () => {
    expect(ofertaPassaFiltroTimeMarketplace("game_presenter", "game_presenter")).toBe(true);
    expect(ofertaPassaFiltroTimeMarketplace("shift_leader", "game_presenter")).toBe(false);
    expect(ofertaPassaFiltroTimeMarketplace("shift_leader", "todos")).toBe(true);
  });
});

describe("turnoMarketplacePermitidoNaArea", () => {
  it("Liderança só Manhã e Noite", () => {
    expect(turnoMarketplacePermitidoNaArea("shift_leader", "Manhã")).toBe(true);
    expect(turnoMarketplacePermitidoNaArea("service_manager", "Noite")).toBe(true);
    expect(turnoMarketplacePermitidoNaArea("shift_leader", "Tarde")).toBe(false);
    expect(turnoMarketplacePermitidoNaArea("game_presenter", "Tarde")).toBe(true);
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
  it("devolve o dia calendário de referência (atalho; a regra real é pelo início do turno)", () => {
    expect(primeiroDiaOfertavelIso(new Date(2026, 7, 10, 23, 59))).toBe("2026-08-10");
    expect(primeiroDiaOfertavelIso(new Date(2026, 7, 30, 8, 0))).toBe("2026-08-30");
  });
});

describe("turnoRespeitaAntecedencia4h", () => {
  // Operadora: Manhã 07:00 · Tarde 15:00 · Noite 19:00
  const opExemplo = {
    turno_manha_inicio: "07:00",
    turno_tarde_inicio: "15:00",
    turno_noite_inicio: "19:00",
  };

  it("às 6h bloqueia Manhã de hoje (7h) e permite Tarde (15h)", () => {
    const agora = new Date(2026, 7, 3, 6, 0); // 03/08 06:00
    expect(
      turnoRespeitaAntecedencia4h("2026-08-03", "Manhã", HORARIO_4X2, opExemplo, agora),
    ).toBe(false);
    expect(
      turnoRespeitaAntecedencia4h("2026-08-03", "Tarde", HORARIO_4X2, opExemplo, agora),
    ).toBe(true);
  });

  it("bloqueia turno com menos de 4h até o início", () => {
    const agora = new Date(2026, 7, 3, 12, 0); // 03/08 12:00 → Tarde 15:00 = 3h
    expect(
      turnoRespeitaAntecedencia4h("2026-08-03", "Tarde", HORARIO_4X2, opExemplo, agora),
    ).toBe(false);
  });

  it("permite turno com exatamente 4h até o início", () => {
    const agora = new Date(2026, 7, 3, 11, 0); // 03/08 11:00 → Tarde 15:00 = 4h
    expect(
      turnoRespeitaAntecedencia4h("2026-08-03", "Tarde", HORARIO_4X2, opExemplo, agora),
    ).toBe(true);
  });
});

describe("diasOfertaveisMarketplace", () => {
  const hoje = new Date(2026, 7, 10, 6, 0); // 10/08 06:00
  const opts = { hoje, horario: HORARIO_4X2, operadora: OPERADORA };
  const grade = new Map<string, string>([
    ["2026-08-10", "MRN"], // 07:00 — 1h → fora
    ["2026-08-11", "NGT"], // 19:00 → ok
    ["2026-08-12", "Folga"],
    ["2026-08-13", "Venda"],
    ["2026-08-14", "MRN"],
    ["2026-08-15", "Compra - Tarde"],
  ]);

  it("lista só dias escalados com início do turno a ≥4h", () => {
    const dias = diasOfertaveisMarketplace("venda_turno", grade, opts);
    expect(dias.map((d) => d.iso)).toEqual(["2026-08-11", "2026-08-14", "2026-08-15"]);
    expect(dias[0]!.turno).toBe("Noite");
    expect(dias[1]!.turno).toBe("Manhã");
    expect(dias[2]!.turno).toBe("Tarde");
  });

  it("descarta Manhã de hoje quando faltam 4h até o início", () => {
    const dias = diasOfertaveisMarketplace("venda_turno", grade, opts);
    expect(dias.map((d) => d.iso)).not.toContain("2026-08-10");
  });

  it("trata Venda como folga e exige ao menos um turno desejado elegível", () => {
    const dias = diasOfertaveisMarketplace("venda_folga", grade, opts);
    expect(dias.map((d) => d.iso)).toEqual(["2026-08-12", "2026-08-13"]);
    expect(dias[0]!.turno).toBe("");
  });

  it("trata Compra - Turno como escalado para oferta de troca", () => {
    const dias = diasOfertaveisMarketplace("oferta_troca", grade, opts);
    expect(dias.map((d) => d.iso)).toEqual(["2026-08-11", "2026-08-14", "2026-08-15"]);
    expect(dias.map((d) => d.iso)).not.toContain("2026-08-13");
  });

  it("inclui Tarde de hoje quando o início respeita 4h", () => {
    const g = new Map<string, string>([["2026-08-10", "AFT"]]); // 13:00 — 7h depois das 06:00
    const dias = diasOfertaveisMarketplace("venda_turno", g, opts);
    expect(dias.map((d) => d.iso)).toContain("2026-08-10");
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

  it("considera Compra - Turno no cálculo de descanso", () => {
    expect(
      gapEntreTurnosOk({
        diaIso: "2026-08-10",
        turnoNome: "Manhã",
        valorPorIso: new Map([["2026-08-09", "Compra - Noite"]]),
        horario: HORARIO_4X2,
        operadora: OPERADORA,
      }),
    ).toBe(false);
  });

  it("considera Venda como folga no cálculo de descanso", () => {
    expect(
      gapEntreTurnosOk({
        diaIso: "2026-08-10",
        turnoNome: "Manhã",
        valorPorIso: new Map([["2026-08-09", "Venda"]]),
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
  // Congela o relógio: sem isto, no próprio 13/08 o CI (UTC) corta a Noite pela regra de 4h.
  const agora = new Date(2026, 7, 10, 8, 0);

  it("no dia seguinte ao turno da noite sobra apenas a noite", () => {
    const turnos = turnosOfertaveisNaFolgaMarketplace(
      "2026-08-13",
      grade,
      HORARIO_4X2,
      OPERADORA,
      agora,
    );
    expect(turnos).toEqual(["Noite"]);
  });

  it("dois dias depois todos os turnos voltam a caber", () => {
    const turnos = turnosOfertaveisNaFolgaMarketplace(
      "2026-08-14",
      grade,
      HORARIO_4X2,
      OPERADORA,
      agora,
    );
    expect(turnos).toEqual(["Manhã", "Tarde", "Noite"]);
  });

  it("Liderança não lista Tarde mesmo com escala 4x2", () => {
    const turnos = turnosOfertaveisNaFolgaMarketplace(
      "2026-08-14",
      grade,
      HORARIO_4X2,
      OPERADORA,
      agora,
      "shift_leader",
    );
    expect(turnos).toEqual(["Manhã", "Noite"]);
  });

  it("respeita também o próximo turno escalado depois da folga", () => {
    const comProximo = new Map(grade);
    comProximo.set("2026-08-15", "MRN");
    const turnos = turnosOfertaveisNaFolgaMarketplace(
      "2026-08-14",
      comProximo,
      HORARIO_4X2,
      OPERADORA,
      agora,
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
    expect(mensagemErroOfertaMarketplace("oferta_expirada")).toContain("menos de 2h");
    expect(mensagemErroOfertaMarketplace("dia_nao_futuro")).toContain("publicar oferta");
    expect(mensagemErroOfertaMarketplace("times_diferentes")).toContain("Shift Leader e Service Manager");
    expect(mensagemErroOfertaMarketplace("nao_e_interessado")).toContain("desistir");
    expect(mensagemErroOfertaMarketplace("horario_turno_indisponivel")).toContain(
      "horário de início",
    );
  });

  it("usa mensagem genérica com fecho de suporte em código desconhecido", () => {
    expect(mensagemErroOfertaMarketplace("boom")).toContain("entre em contato com o suporte");
  });
});

describe("overlayIdentidadeMarketplaceOfertas", () => {
  const base = {
    id: "o1",
    dataOfertaIso: "2026-08-20",
    tipo: "venda_turno" as const,
    turnoOferta: "Manhã",
    operadora: "Blaze",
    ofertante: "Ana",
    timeKey: "game_presenter" as const,
    solicitanteStaffId: "gp-1",
    interessadoStaffId: "gp-2",
    souOfertante: false,
    souInteressado: false,
    mesmoTime: false,
  };

  it("marca souOfertante / souInteressado / mesmoTime pelo prestador visível", () => {
    const out = overlayIdentidadeMarketplaceOfertas([base], "gp-1", "game_presenter");
    expect(out[0]?.souOfertante).toBe(true);
    expect(out[0]?.souInteressado).toBe(false);
    expect(out[0]?.mesmoTime).toBe(true);
  });

  it("sem funcionarioId não altera as flags da RPC", () => {
    const out = overlayIdentidadeMarketplaceOfertas([base], null, "game_presenter");
    expect(out[0]?.souOfertante).toBe(false);
    expect(out[0]?.mesmoTime).toBe(false);
  });
});

describe("alertasHomeMarketplaceDoPrestador", () => {
  const agora = new Date("2026-08-18T12:00:00-03:00");
  const base = {
    id: "a1",
    tipo: "venda_turno",
    status: "em_analise",
    dia_iso: "2026-08-20",
    ofertante_funcionario_id: "gp-1",
    interessado_funcionario_id: "gp-2" as string | null,
    inicio_turno_at: "2026-08-20T10:00:00-03:00",
    dia_iso_interesse: null as string | null,
  };

  it("mostra pendente só para o ofertante em análise", () => {
    const out = alertasHomeMarketplaceDoPrestador([base], "gp-1", agora);
    expect(out).toEqual([{ id: "a1", kind: "pendente", tipo: "venda_turno", diaIso: "2026-08-20" }]);
    expect(alertasHomeMarketplaceDoPrestador([base], "gp-2", agora)).toEqual([]);
  });

  it("mostra lembrete de oferta aceita enquanto o turno não começou", () => {
    const aceita = { ...base, status: "aceita", inicio_turno_at: "2026-08-20T19:00:00-03:00" };
    const out = alertasHomeMarketplaceDoPrestador([aceita], "gp-2", agora);
    expect(out).toEqual([{ id: "a1", kind: "lembrete", tipo: "venda_turno", diaIso: "2026-08-20" }]);
  });

  it("esconde lembrete depois do início do turno", () => {
    const aceita = { ...base, status: "aceita", inicio_turno_at: "2026-08-18T07:00:00-03:00" };
    expect(alertasHomeMarketplaceDoPrestador([aceita], "gp-1", agora)).toEqual([]);
  });

  it("lembrete usa o fim do dia quando a listagem não traz inicio_turno_at", () => {
    const aceita = { ...base, status: "aceita", inicio_turno_at: null };
    const out = alertasHomeMarketplaceDoPrestador([aceita], "gp-1", agora);
    expect(out).toEqual([{ id: "a1", kind: "lembrete", tipo: "venda_turno", diaIso: "2026-08-20" }]);
  });

  it("esconde lembrete de troca depois do último início (interesse), não no fim do dia", () => {
    const troca = {
      ...base,
      tipo: "oferta_troca",
      status: "aceita",
      inicio_turno_at: "2026-08-18T07:00:00-03:00",
      dia_iso_interesse: "2026-08-18",
      inicio_turno_interesse_at: "2026-08-18T10:00:00-03:00",
    };
    expect(alertasHomeMarketplaceDoPrestador([troca], "gp-1", agora)).toEqual([]);
  });
});

describe("fontesAlertaHomeDePayloadListar", () => {
  const listar = [
    {
      id: "aberta-1",
      tipo: "venda_turno",
      status: "aberta",
      dia_iso: "2026-08-21",
      ofertante_funcionario_id: "gp-1",
      interessado_funcionario_id: null,
    },
    {
      id: "analise-1",
      tipo: "venda_folga",
      status: "em_analise",
      dia_iso: "2026-08-22",
      ofertante_funcionario_id: "gp-1",
      interessado_funcionario_id: "gp-2",
      dia_iso_interesse: null,
    },
    {
      id: "aceita-1",
      tipo: "oferta_troca",
      status: "aceita",
      dia_iso: "2026-08-23",
      ofertante_funcionario_id: "gp-3",
      interessado_funcionario_id: "gp-1",
      dia_iso_interesse: "2026-08-24",
      inicio_turno_at: "2026-08-23T07:00:00-03:00",
      inicio_turno_interesse_at: "2026-08-24T19:00:00-03:00",
    },
  ];

  it("mantém só ofertas em análise ou aceitas do payload da RPC de listagem", () => {
    expect(fontesAlertaHomeDePayloadListar(listar)).toEqual([
      {
        id: "analise-1",
        tipo: "venda_folga",
        status: "em_analise",
        dia_iso: "2026-08-22",
        ofertante_funcionario_id: "gp-1",
        interessado_funcionario_id: "gp-2",
        inicio_turno_at: null,
        inicio_turno_interesse_at: null,
        dia_iso_interesse: null,
      },
      {
        id: "aceita-1",
        tipo: "oferta_troca",
        status: "aceita",
        dia_iso: "2026-08-23",
        ofertante_funcionario_id: "gp-3",
        interessado_funcionario_id: "gp-1",
        inicio_turno_at: "2026-08-23T07:00:00-03:00",
        inicio_turno_interesse_at: "2026-08-24T19:00:00-03:00",
        dia_iso_interesse: "2026-08-24",
      },
    ]);
  });

  it("aplica o corte de início de turno no recorte da Home", () => {
    const agora = new Date("2026-08-23T12:00:00-03:00");
    const aceita = listar.find((row) => row.id === "aceita-1");
    const fontes = fontesAlertaHomeDePayloadListar([aceita]);
    expect(alertasHomeMarketplaceDoPrestador(fontes, "gp-1", agora)).toEqual([
      {
        id: "aceita-1",
        kind: "lembrete",
        tipo: "oferta_troca",
        diaIso: "2026-08-23",
      },
    ]);
    const depoisDoTurno = new Date("2026-08-24T20:00:00-03:00");
    expect(alertasHomeMarketplaceDoPrestador(fontes, "gp-1", depoisDoTurno)).toEqual([]);
  });
});

describe("marketplaceMostrarNovaOferta", () => {
  const fid = "prestador-1";
  const criarOk = { canCriarOk: true };

  it("Ver Próprios: sempre com Criar ok e cadastro", () => {
    expect(
      marketplaceMostrarNovaOferta({ canView: "proprios", ...criarOk }, fid, false),
    ).toBe(true);
  });

  it("Ver Sim: só com Minhas Negociações ligado", () => {
    expect(
      marketplaceMostrarNovaOferta({ canView: "sim", ...criarOk }, fid, false),
    ).toBe(false);
    expect(
      marketplaceMostrarNovaOferta({ canView: "sim", ...criarOk }, fid, true),
    ).toBe(true);
  });

  it("sem cadastro ou sem Criar: nunca", () => {
    expect(
      marketplaceMostrarNovaOferta({ canView: "proprios", ...criarOk }, null, true),
    ).toBe(false);
    expect(
      marketplaceMostrarNovaOferta({ canView: "sim", canCriarOk: false }, fid, true),
    ).toBe(false);
  });
});

describe("marketplace permissões UI", () => {
  const fid = "aaaa-bbbb";

  const lideranca = {
    canView: "sim" as const,
    canCriar: "proprios" as const,
    canEditar: "proprios" as const,
    canCriarOk: true,
    canEditarOk: true,
  };

  it("modo liderança gestão = Ver Sim + Criar/Editar Próprios", () => {
    expect(marketplaceModoLiderancaGestao(lideranca)).toBe(true);
    expect(
      marketplaceModoLiderancaGestao({ ...lideranca, canCriar: "sim", canEditar: "sim" }),
    ).toBe(false);
  });

  it("Minhas Negociações exige Ver Sim e prestador cadastrado", () => {
    expect(marketplacePodeMinhasNegociacoes(lideranca, fid)).toBe(true);
    expect(marketplacePodeMinhasNegociacoes(lideranca, null)).toBe(false);
    expect(marketplacePodeMinhasNegociacoes({ canView: "proprios" }, fid)).toBe(false);
  });

  it("Nova Oferta com Criar Próprios e cadastro", () => {
    expect(marketplacePodeOfertar(lideranca, fid)).toBe(true);
    expect(marketplacePodeOfertar({ canCriarOk: false }, fid)).toBe(false);
  });

  it("modo liderança (Ver Sim + Criar/Editar Próprios) bloqueia proposta no mural alheio", () => {
    expect(marketplacePodeProporNoMural(lideranca, fid)).toBe(false);
    expect(
      marketplacePodeProporNoMural(
        { canView: "sim", canCriar: "sim", canEditar: "sim", canCriarOk: true },
        fid,
      ),
    ).toBe(true);
  });

  it("prestador Ver Próprios + Criar/Editar Próprios pode propor no mural", () => {
    expect(
      marketplacePodeProporNoMural(
        {
          canView: "proprios",
          canCriar: "proprios",
          canEditar: "proprios",
          canCriarOk: true,
        },
        fid,
      ),
    ).toBe(true);
  });

  it("Editar Próprios limita ações às linhas próprias", () => {
    expect(marketplacePodeEditarOferta(lideranca, { souOfertante: true })).toBe(true);
    expect(marketplacePodeEditarOferta(lideranca, { souInteressado: true })).toBe(true);
    expect(marketplacePodeEditarOferta(lideranca, {})).toBe(false);
    expect(
      marketplacePodeEditarOferta(
        { canEditar: "sim", canEditarOk: true },
        {},
      ),
    ).toBe(true);
  });
});
