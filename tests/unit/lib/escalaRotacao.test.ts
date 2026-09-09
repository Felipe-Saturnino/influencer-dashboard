import { describe, expect, it } from "vitest";
import {
  aplicarLimitesDisponibilidadeNaMatrixRotacao,
  disponivelPorSlotPessoaRotacao,
  embaralharListaRotacao,
  filtrarPoolRotacaoPorPresencaCt,
  gerarGradeRotacao,
  gerarPatternRotacao,
  gerarSlotsRotacao,
  janelaHorarioLiderancaRotacao,
  isBlocoRotacaoShuffler,
  labelsMesasRotacao,
  liderancaCompativelComTurnoRotacao,
  maxMinutosMesaContinuaNaGrade,
  maxSlotsSeguidosAntesBreak,
  mensagemAvisoMesaContinuaPublicar,
  montarContextoRotacaoShuffler,
  montarPoolShufflerRotacaoDePresenca,
  parseIntervaloHorarioStaffRotacao,
  ROTACAO_MAX_MESAS_SEGUIDAS,
  ROTACAO_SHUFFLER_ESTUDIO_SLUG,
  ROTACAO_SHUFFLER_MESA_LABEL,
  slotDentroJanelaHorarioRotacao,
  tempoMesaContinuaQueExigeAviso,
  formatarTempoMesaContinuoPt,
  trocarPessoasLinhasPreviaRotacao,
  type RotacaoGeracaoPessoa,
  type RotacaoGpPool,
} from "../../../src/lib/escalaRotacao";

function gpFake(id: string, nome = id): RotacaoGpPool {
  return {
    funcionarioId: id,
    nomeCompleto: nome,
    nomeExibicao: nome,
    nickname: nome,
    falta: false,
    isShiftLead: false,
  };
}

function assertCoberturaTotal(
  matrix: string[][],
  mesas: string[],
  nGps: number,
  maxConsec = ROTACAO_MAX_MESAS_SEGUIDAS,
) {
  const nSlots = matrix[0]?.length ?? 0;
  for (let s = 0; s < nSlots; s++) {
    const working = matrix.map((row) => row[s]!).filter((v) => v !== "Break");
    expect(new Set(working).size, `slot ${s} mesas únicas`).toBe(mesas.length);
    expect(working).toHaveLength(mesas.length);
    for (const m of mesas) {
      expect(working).toContain(m);
    }
  }
  for (let p = 0; p < nGps; p++) {
    let streak = 0;
    for (const v of matrix[p]!) {
      if (v === "Break") streak = 0;
      else {
        streak += 1;
        expect(streak, `GP ${p}: ${streak} mesas seguidas`).toBeLessThanOrEqual(maxConsec);
      }
    }
  }
}

function assertSemMesaConsecutiva(matrix: string[][]) {
  for (let p = 0; p < matrix.length; p++) {
    const row = matrix[p]!;
    for (let s = 1; s < row.length; s++) {
      const a = row[s - 1]!;
      const b = row[s]!;
      if (a === "Break" || b === "Break" || a === "X" || b === "X" || a === "F" || b === "F") continue;
      expect(a === b, `pessoa ${p}: mesa ${a} repetida nos slots ${s - 1}/${s}`).toBe(false);
    }
  }
}

function gpsFake(n: number): RotacaoGeracaoPessoa[] {
  return Array.from({ length: n }, (_, i) => ({
    funcionarioId: `gp-${i}`,
    isShiftLead: false,
  }));
}

function slFake(n: number): RotacaoGeracaoPessoa[] {
  return Array.from({ length: n }, (_, i) => ({
    funcionarioId: `sl-${i}`,
    isShiftLead: true,
  }));
}

describe("labelsMesasRotacao", () => {
  it("mantém ordem, ignora vazio e deduplica", () => {
    expect(
      labelsMesasRotacao([
        { numeroMesa: "6130" },
        { numeroMesa: "  " },
        { numeroMesa: "6131" },
        { numeroMesa: "6130" },
      ]),
    ).toEqual(["6130", "6131"]);
  });
});

describe("maxSlotsSeguidosAntesBreak", () => {
  it("30 min → 4 slots; 20 min → 6 slots", () => {
    expect(maxSlotsSeguidosAntesBreak(30)).toBe(4);
    expect(maxSlotsSeguidosAntesBreak(20)).toBe(6);
  });
});

describe("gerarGradeRotacao", () => {
  it("Blaze 7 GP × 5 mesas: cobre todas, sem repetir mesa seguida, máx. 4 para GP", () => {
    const mesas = ["6140", "6141", "6142", "6143", "6144"];
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(7),
      shiftLeads: [],
      nSlots: 16,
      slotMinutos: 30,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    assertCoberturaTotal(res.matrix, mesas, 7, 4);
    assertSemMesaConsecutiva(res.matrix);
  });

  it("slot 20 min: GP pode fazer até 6 slots seguidos", () => {
    const mesas = ["A", "B", "C", "D", "E"];
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(6),
      shiftLeads: [],
      nSlots: 12,
      slotMinutos: 20,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    assertCoberturaTotal(res.matrix, mesas, 6, 6);
    assertSemMesaConsecutiva(res.matrix);
  });

  it("CDA 7 GP × 6 mesas + 1 SL: cobre todas; SL faz o mínimo de mesas", () => {
    const mesas = ["6130", "6131", "6132", "6133", "6134", "6135"];
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(7),
      shiftLeads: slFake(1),
      nSlots: 16,
      slotMinutos: 30,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    assertCoberturaTotal(res.matrix, mesas, 7, 4);
    assertSemMesaConsecutiva(res.matrix);

    const slRow = res.matrix[7]!;
    const slMesas = slRow.filter((v) => v !== "Break").length;
    const gpMesas = res.matrix.slice(0, 7).map((row) => row.filter((v) => v !== "Break").length);
    const minGp = Math.min(...gpMesas);
    expect(slMesas).toBeLessThanOrEqual(minGp);
  });

  it("5 GP × 5 mesas + 1 SL: SL quase só Break (GPs bastam no ritmo)", () => {
    const mesas = ["A", "B", "C", "D", "E"];
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(5),
      shiftLeads: slFake(1),
      nSlots: 10,
      slotMinutos: 30,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    assertCoberturaTotal(res.matrix, mesas, 5, 4);
    assertSemMesaConsecutiva(res.matrix);
    const slMesas = res.matrix[5]!.filter((v) => v !== "Break").length;
    expect(slMesas).toBeGreaterThan(0);
  });

  it("reingresso: preserva slots passados e regenera o futuro", () => {
    const mesas = ["A", "B", "C"];
    const base = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(4),
      shiftLeads: [],
      nSlots: 8,
      slotMinutos: 30,
    });
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    const from = 3;
    const again = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(4),
      shiftLeads: [],
      nSlots: 8,
      slotMinutos: 30,
      fromSlotIndex: from,
      matrixBase: base.matrix,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    for (let p = 0; p < 4; p++) {
      for (let s = 0; s < from; s++) {
        expect(again.matrix[p]![s]).toBe(base.matrix[p]![s]);
      }
    }
    assertCoberturaTotal(again.matrix, mesas, 4, 4);
  });

  it("nunca repete a mesma mesa seguida com 2+ mesas (pool folgado e enxuto)", () => {
    const cases: { mesas: string[]; nGp: number; nSl: number; nSlots: number }[] = [
      { mesas: ["A", "B", "C", "D", "E"], nGp: 7, nSl: 0, nSlots: 20 },
      { mesas: ["A", "B", "C", "D"], nGp: 5, nSl: 0, nSlots: 12 },
      { mesas: ["A", "B"], nGp: 3, nSl: 0, nSlots: 10 },
    ];
    for (const c of cases) {
      const res = gerarGradeRotacao({
        mesasLabels: c.mesas,
        gps: gpsFake(c.nGp),
        shiftLeads: slFake(c.nSl),
        nSlots: c.nSlots,
        slotMinutos: 30,
      });
      expect(res.ok, JSON.stringify(c)).toBe(true);
      if (!res.ok) continue;
      assertSemMesaConsecutiva(res.matrix);
      assertCoberturaTotal(res.matrix, c.mesas, c.nGp, 4);
    }
  });

  it("4 GP × 4 mesas: intercala mesmo sem Break (derangement)", () => {
    const mesas = ["A", "B", "C", "D"];
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(4),
      shiftLeads: [],
      nSlots: 8,
      slotMinutos: 30,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    assertSemMesaConsecutiva(res.matrix);
    // Cobertura total sem checar teto 2h — sem reserva não há Break possível
    for (let s = 0; s < 8; s++) {
      const working = res.matrix.map((row) => row[s]!).filter((v) => v !== "Break");
      expect(new Set(working).size).toBe(4);
    }
  });

  it("falha se pessoas < mesas", () => {
    const res = gerarGradeRotacao({
      mesasLabels: ["1", "2", "3"],
      gps: gpsFake(2),
      shiftLeads: [],
      nSlots: 4,
    });
    expect(res.ok).toBe(false);
  });
});

describe("janela horário liderança na rotação", () => {
  it("parseIntervaloHorarioStaffRotacao lê 08-20 e 20-08", () => {
    expect(parseIntervaloHorarioStaffRotacao("08-20")).toEqual({ inicio: "08:00", fim: "20:00" });
    expect(parseIntervaloHorarioStaffRotacao("20-08")).toEqual({ inicio: "20:00", fim: "08:00" });
    expect(parseIntervaloHorarioStaffRotacao("18-06")).toEqual({ inicio: "18:00", fim: "06:00" });
  });

  it("slotDentroJanelaHorarioRotacao cobre overnight e fim exclusivo", () => {
    expect(slotDentroJanelaHorarioRotacao("08:00", "08:00", "20:00")).toBe(true);
    expect(slotDentroJanelaHorarioRotacao("19:30", "08:00", "20:00")).toBe(true);
    expect(slotDentroJanelaHorarioRotacao("20:00", "08:00", "20:00")).toBe(false);
    expect(slotDentroJanelaHorarioRotacao("07:30", "08:00", "20:00")).toBe(false);
    expect(slotDentroJanelaHorarioRotacao("22:00", "20:00", "08:00")).toBe(true);
    expect(slotDentroJanelaHorarioRotacao("06:00", "20:00", "08:00")).toBe(true);
    expect(slotDentroJanelaHorarioRotacao("08:00", "20:00", "08:00")).toBe(false);
    expect(slotDentroJanelaHorarioRotacao("12:00", "20:00", "08:00")).toBe(false);
  });

  it("Manhã 06–14 com SL 08–20 marca X antes das 08h", () => {
    const slots = gerarSlotsRotacao("06:00", "14:00", 30);
    const mask = disponivelPorSlotPessoaRotacao(
      slots,
      { isShiftLead: true, horarioTurno: "08-20" },
      "06:00",
    );
    expect(mask).toBeDefined();
    expect(mask![slots.indexOf("06:00")]).toBe(false);
    expect(mask![slots.indexOf("07:30")]).toBe(false);
    expect(mask![slots.indexOf("08:00")]).toBe(true);
    expect(mask![slots.indexOf("13:30")]).toBe(true);

    const matrix = [["1", "1", "1", "1", "Break", "Break", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1"]];
    const out = aplicarLimitesDisponibilidadeNaMatrixRotacao(
      slots,
      matrix,
      [{ isShiftLead: true, horarioTurno: "08-20" }],
      "06:00",
    );
    expect(out[0]![0]).toBe("X");
    expect(out[0]![slots.indexOf("07:30")]).toBe("X");
    expect(out[0]![slots.indexOf("08:00")]).not.toBe("X");
  });

  it("Manhã 06–14 com SL 20–08 marca X a partir das 08h", () => {
    const slots = gerarSlotsRotacao("06:00", "14:00", 30);
    const mask = disponivelPorSlotPessoaRotacao(
      slots,
      { isShiftLead: true, horarioTurno: "20-08" },
      "06:00",
    );
    expect(mask![slots.indexOf("06:00")]).toBe(true);
    expect(mask![slots.indexOf("07:30")]).toBe(true);
    expect(mask![slots.indexOf("08:00")]).toBe(false);
    expect(mask![slots.indexOf("13:00")]).toBe(false);
  });

  it("Tarde 14–22 com SL 20–08 marca X antes das 20h", () => {
    const slots = gerarSlotsRotacao("14:00", "22:00", 30);
    const mask = disponivelPorSlotPessoaRotacao(
      slots,
      { cargoLideranca: "service_manager", horarioTurno: "20-08" },
      "14:00",
    );
    expect(mask![slots.indexOf("14:00")]).toBe(false);
    expect(mask![slots.indexOf("19:30")]).toBe(false);
    expect(mask![slots.indexOf("20:00")]).toBe(true);
    expect(mask![slots.indexOf("21:30")]).toBe(true);
  });

  it("Tarde 15–23 com liderança 08–20 marca X a partir das 20h (mesmo sem horarioTurno no cadastro)", () => {
    const slots = gerarSlotsRotacao("15:00", "23:00", 30);
    const mask = disponivelPorSlotPessoaRotacao(
      slots,
      { isShiftLead: true, gradeValor: "AFT" },
      "15:00",
    );
    expect(mask![slots.indexOf("15:00")]).toBe(true);
    expect(mask![slots.indexOf("19:30")]).toBe(true);
    expect(mask![slots.indexOf("20:00")]).toBe(false);
    expect(mask![slots.indexOf("22:30")]).toBe(false);

    const matrix = [slots.map(() => "6133")];
    const out = aplicarLimitesDisponibilidadeNaMatrixRotacao(
      slots,
      matrix,
      [{ isShiftLead: true, horarioTurno: "08-20" }],
      "15:00",
    );
    expect(out[0]![slots.indexOf("19:30")]).toBe("6133");
    expect(out[0]![slots.indexOf("20:00")]).toBe("X");
    expect(out[0]![slots.indexOf("22:00")]).toBe("X");
  });

  it("janelaHorarioLiderancaRotacao usa fallback diurno quando horário ausente", () => {
    expect(janelaHorarioLiderancaRotacao({ horarioTurno: "08-20" })).toEqual({
      inicio: "08:00",
      fim: "20:00",
    });
    expect(janelaHorarioLiderancaRotacao({ gradeValor: "NGT" })).toEqual({
      inicio: "20:00",
      fim: "08:00",
    });
    expect(janelaHorarioLiderancaRotacao({})).toEqual({ inicio: "08:00", fim: "20:00" });
  });

  it("gerador não aloca mesa em slot indisponível da liderança", () => {
    const slots = gerarSlotsRotacao("06:00", "10:00", 30);
    const maskSl = disponivelPorSlotPessoaRotacao(
      slots,
      { isShiftLead: true, horarioTurno: "08-20" },
      "06:00",
    );
    const res = gerarGradeRotacao({
      mesasLabels: ["1", "2"],
      gps: [
        { funcionarioId: "g1", isShiftLead: false },
        { funcionarioId: "g2", isShiftLead: false },
      ],
      shiftLeads: [
        { funcionarioId: "sl1", isShiftLead: true, disponivelPorSlot: maskSl },
      ],
      nSlots: slots.length,
      slotMinutos: 30,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const slRow = res.matrix[res.pessoas.findIndex((p) => p.funcionarioId === "sl1")]!;
    expect(slRow[slots.indexOf("06:00")]).toBe("X");
    expect(slRow[slots.indexOf("07:30")]).toBe("X");
    // Cobertura: cada slot tem as 2 mesas
    for (let s = 0; s < slots.length; s++) {
      const working = res.matrix.map((row) => row[s]!).filter((v) => v !== "Break" && v !== "X");
      expect(new Set(working).size).toBe(2);
    }
  });
});

describe("liderancaCompativelComTurnoRotacao", () => {
  it("libera SL/SM em Manhã, Tarde e Noite", () => {
    expect(liderancaCompativelComTurnoRotacao("manha", { horarioTurno: "20-08" })).toBe(true);
    expect(liderancaCompativelComTurnoRotacao("tarde", { horarioTurno: "08-20" })).toBe(true);
    expect(liderancaCompativelComTurnoRotacao("noite", { horarioTurno: "08-20" })).toBe(true);
    expect(liderancaCompativelComTurnoRotacao("manha", { gradeValor: "NGT" })).toBe(true);
  });
});

describe("gerarPatternRotacao (compat)", () => {
  it("delega para gerarGradeRotacao sem SL", () => {
    const mesas = ["1", "2", "3", "4"];
    const matrix = gerarPatternRotacao(mesas, 5, 8);
    expect(matrix).toHaveLength(5);
    assertCoberturaTotal(matrix, mesas, 5, 4);
    assertSemMesaConsecutiva(matrix);
  });
});

describe("embaralharListaRotacao / ordem aleatória na prévia", () => {
  it("embaralha com RNG determinístico", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    let n = 0;
    const rng = () => {
      n += 1;
      return (n % 7) / 7;
    };
    const out = embaralharListaRotacao(ids, rng);
    expect(out).toHaveLength(6);
    expect([...out].sort()).toEqual([...ids].sort());
    expect(out.join(",")).not.toBe(ids.join(","));
  });

  it("gerarGradeRotacao embaralha GPs na geração completa", () => {
    const mesas = ["1", "2", "3"];
    const gps: RotacaoGeracaoPessoa[] = ["p1", "p2", "p3", "p4", "p5"].map((id) => ({
      funcionarioId: id,
      isShiftLead: false,
    }));
    let n = 0;
    const rng = () => {
      n += 1;
      return (n % 11) / 11;
    };
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps,
      shiftLeads: [],
      nSlots: 6,
      rng,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const ordem = res.pessoas.map((p) => p.funcionarioId);
    expect(ordem).toHaveLength(5);
    expect([...ordem].sort()).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(ordem.join(",")).not.toBe("p1,p2,p3,p4,p5");
    assertCoberturaTotal(res.matrix, mesas, 5, 4);
  });

  it("gerarGradeRotacao respeita embaralharGps false", () => {
    const mesas = ["1", "2", "3"];
    const gps: RotacaoGeracaoPessoa[] = ["p1", "p2", "p3", "p4"].map((id) => ({
      funcionarioId: id,
      isShiftLead: false,
    }));
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps,
      shiftLeads: [],
      nSlots: 4,
      embaralharGps: false,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.pessoas.map((p) => p.funcionarioId)).toEqual(["p1", "p2", "p3", "p4"]);
  });
});

describe("trocarPessoasLinhasPreviaRotacao", () => {
  it("move a pessoa para a sequência de mesas da outra linha", () => {
    const slots = ["15:00", "15:30", "16:00"];
    const amanda = gpFake("a", "Amanda");
    const maria = gpFake("m", "Maria");
    const res = trocarPessoasLinhasPreviaRotacao({
      gps: [amanda, maria],
      matrix: [
        ["6130", "6131", "6130"],
        ["6150", "6134", "6150"],
      ],
      fromIndex: 1,
      toIndex: 0,
      slots,
      turnoInicio: "15:00",
    });
    expect(res).not.toBeNull();
    expect(res!.gps[0]!.funcionarioId).toBe("m");
    expect(res!.gps[1]!.funcionarioId).toBe("a");
    expect(res!.matrix[0]).toEqual(["6130", "6131", "6130"]);
    expect(res!.matrix[1]).toEqual(["6150", "6134", "6150"]);
  });
});

describe("filtrarPoolRotacaoPorPresencaCt", () => {
  it("inclui Saída Antecipada e Hora Adicional do turno atual", () => {
    const pool = filtrarPoolRotacaoPorPresencaCt({
      gps: [gpFake("a"), gpFake("b"), gpFake("c"), gpFake("d")],
      presencaAtual: [
        { id: "a", status: "presente", saida: "" },
        { id: "b", status: "saida_antecipada", saida: "16:00" },
        { id: "c", status: "hora_adicional", saida: "22:00" },
        { id: "d", status: "falta", saida: "" },
      ],
      presencaAnterior: [],
      gpsTurnoAnteriorMesmoEstudio: [],
    });
    expect(pool.map((g) => g.funcionarioId).sort()).toEqual(["a", "b", "c"]);
    expect(pool.find((g) => g.funcionarioId === "b")?.saidaLimiteHhmm).toBe("16:00");
    expect(pool.find((g) => g.funcionarioId === "c")?.saidaLimiteHhmm).toBe("22:00");
  });

  it("inclui Saída Antecipada mesmo sem horário de saída", () => {
    const pool = filtrarPoolRotacaoPorPresencaCt({
      gps: [gpFake("b")],
      presencaAtual: [{ id: "b", status: "saida_antecipada", saida: "" }],
      presencaAnterior: [],
      gpsTurnoAnteriorMesmoEstudio: [],
    });
    expect(pool).toHaveLength(1);
    expect(pool[0]?.saidaLimiteHhmm).toBeUndefined();
  });

  it("traz Hora Adicional do turno anterior no turno seguinte", () => {
    const pool = filtrarPoolRotacaoPorPresencaCt({
      gps: [gpFake("a")],
      presencaAtual: [{ id: "a", status: "presente", saida: "" }],
      presencaAnterior: [{ id: "x", status: "hora_adicional", saida: "10:00" }],
      gpsTurnoAnteriorMesmoEstudio: [gpFake("x")],
    });
    expect(pool.map((g) => g.funcionarioId).sort()).toEqual(["a", "x"]);
    expect(pool.find((g) => g.funcionarioId === "x")?.saidaLimiteHhmm).toBe("10:00");
  });
});

describe("aviso de mesa contínua ao publicar", () => {
  it("mede o maior trecho contínuo em mesa", () => {
    const matrix = [
      ["1", "2", "3", "4", "Break", "1"],
      ["Break", "1", "2", "Break", "3", "4"],
    ];
    expect(maxMinutosMesaContinuaNaGrade(matrix, 30)).toBe(120);
    expect(maxMinutosMesaContinuaNaGrade(matrix, 20)).toBe(80);
  });

  it("formata tempo em pt-BR", () => {
    expect(formatarTempoMesaContinuoPt(120)).toBe("2 horas");
    expect(formatarTempoMesaContinuoPt(140)).toBe("2 horas e 20 min");
    expect(formatarTempoMesaContinuoPt(60)).toBe("1 hora");
  });

  it("exige aviso a partir de 2h e monta a mensagem", () => {
    const ok = [
      ["1", "2", "3", "Break"],
      ["Break", "1", "2", "3"],
    ];
    expect(tempoMesaContinuaQueExigeAviso(ok, 30)).toBeNull();

    const limiar = [["1", "2", "3", "4", "Break"]];
    expect(tempoMesaContinuaQueExigeAviso(limiar, 30)).toBe("2 horas");

    const acima = [["1", "2", "3", "4", "5"]];
    expect(tempoMesaContinuaQueExigeAviso(acima, 30)).toBe("2 horas e 30 min");

    expect(mensagemAvisoMesaContinuaPublicar("2 horas e 20 min")).toBe(
      "Nesta rotação temos Prestadores realizando 2 horas e 20 min tempo direto de mesa, quer seguir com esta rotação?",
    );
  });
});

describe("bloco Shuffler (TODOS)", () => {
  it("monta contexto com mesa TODOS e slug shuffler", () => {
    const ctx = montarContextoRotacaoShuffler({
      diaIso: "2026-09-09",
      turno: "tarde",
      turnoInicio: "12:00",
      turnoFim: "20:00",
      escalaAprovada: true,
      shufflers: [gpFake("s1", "Ana Shuffler")],
    });
    expect(ctx.estudioSlug).toBe(ROTACAO_SHUFFLER_ESTUDIO_SLUG);
    expect(isBlocoRotacaoShuffler(ctx.estudioSlug)).toBe(true);
    expect(labelsMesasRotacao(ctx.mesas)).toEqual([ROTACAO_SHUFFLER_MESA_LABEL]);
    expect(ctx.liderancas).toEqual([]);
  });

  it("filtra pool Shuffler pela presença CT", () => {
    const pool = montarPoolShufflerRotacaoDePresenca({
      presencaAtual: [
        {
          id: "s1",
          nome: "Ana Silva",
          nickname: "Ana",
          time: "Shuffler",
          status: "presente",
          saida: "",
        },
        {
          id: "g1",
          nome: "Beto GP",
          nickname: "Beto",
          time: "Game Presenter",
          status: "presente",
          saida: "",
        },
        {
          id: "s2",
          nome: "Carla",
          nickname: "Carla",
          time: "Shuffler",
          status: "falta",
          saida: "",
        },
      ],
      presencaAnterior: [],
    });
    expect(pool.map((p) => p.funcionarioId)).toEqual(["s1"]);
  });
});
