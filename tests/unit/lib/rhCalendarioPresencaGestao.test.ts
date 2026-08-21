import { describe, expect, it } from "vitest";
import {
  computePresencaKpisConsolidados,
  presencaCorrecaoAnaliseStatusEfetivo,
  presencaCorrecaoCampoAprovado,
  presencaCorrecaoTemCampoPendenteAnalise,
  resolverAcoesPresencaLinha,
  resolverStatusPresencaLinha,
  aplicarMascaraHorarioPresencaHHMM,
  normalizarHorarioPresencaHHMM,
  validarHorarioPresencaHHMM,
} from "@/lib/rhCalendarioPresencaGestao";

const base = {
  situacao: "Folga",
  diaIso: "2026-07-18",
  entEsc: "—",
  saiEsc: "—",
  statusBase: "Folga",
};

describe("horario presença HH:MM — máscara e normalização", () => {
  it("formata 4 dígitos contínuos", () => {
    expect(aplicarMascaraHorarioPresencaHHMM("0800")).toBe("08:00");
    expect(normalizarHorarioPresencaHHMM("0800")).toBe("08:00");
    expect(validarHorarioPresencaHHMM(normalizarHorarioPresencaHHMM("0800"))).toBe(true);
  });

  it("aceita ponto ou vírgula como separador (teclado numérico mobile)", () => {
    expect(aplicarMascaraHorarioPresencaHHMM("6.50")).toBe("06:50");
    expect(normalizarHorarioPresencaHHMM("6.50")).toBe("06:50");
    expect(normalizarHorarioPresencaHHMM("6,50")).toBe("06:50");
    expect(validarHorarioPresencaHHMM(normalizarHorarioPresencaHHMM("6.50"))).toBe(true);
  });

  it("interpreta 3 dígitos como HMM (zero da hora omitido)", () => {
    expect(aplicarMascaraHorarioPresencaHHMM("650")).toBe("06:50");
    expect(normalizarHorarioPresencaHHMM("650")).toBe("06:50");
  });

  it("normaliza hora com um dígito e minutos completos", () => {
    expect(normalizarHorarioPresencaHHMM("6:50")).toBe("06:50");
    expect(normalizarHorarioPresencaHHMM("15:17")).toBe("15:17");
  });

  it("na digitação com separador não completa minuto com um dígito (maxLength 5)", () => {
    expect(aplicarMascaraHorarioPresencaHHMM("12:3")).toBe("12:3");
    expect(aplicarMascaraHorarioPresencaHHMM("12:30")).toBe("12:30");
    expect(aplicarMascaraHorarioPresencaHHMM("6.5")).toBe("6:5");
  });

  it("no blur não inventa 06:05 a partir de minuto incompleto (6.5)", () => {
    expect(normalizarHorarioPresencaHHMM("6.5")).toBe("06:5");
    expect(validarHorarioPresencaHHMM(normalizarHorarioPresencaHHMM("6.5"))).toBe(false);
  });
});

describe("resolverAcoesPresencaLinha em Folga", () => {
  it("permite aprovar quando houve Check-in e Check-out", () => {
    expect(
      resolverAcoesPresencaLinha({
        ...base,
        temCheckIn: true,
        temCheckOut: true,
      }).acaoPrimaria,
    ).toBe("aprovar");
  });

  it("mantém sem aprovação quando o ponto está incompleto", () => {
    expect(
      resolverAcoesPresencaLinha({
        ...base,
        temCheckIn: true,
        temCheckOut: false,
      }).acaoPrimaria,
    ).toBeNull();
  });

  it("não oferece nova aprovação depois de aprovado", () => {
    expect(
      resolverAcoesPresencaLinha({
        ...base,
        temCheckIn: true,
        temCheckOut: true,
        gestao: {
          statusGestao: "aprovado",
          historico: [],
        },
      }).acaoPrimaria,
    ).toBeNull();
  });
});

describe("resolverAcoesPresencaLinha / resolverStatusPresencaLinha — Compra e Venda", () => {
  const agoraFalta = new Date("2026-07-18T20:00:00");

  it("Compra sem ponto após limite vira Falta e oferece Justificar", () => {
    const params = {
      situacao: "Compra - Manhã",
      diaIso: "2026-07-18",
      entEsc: "08:00",
      saiEsc: "14:00",
      temCheckIn: false,
      temCheckOut: false,
      statusBase: "Ausente",
      agora: agoraFalta,
    };
    expect(resolverStatusPresencaLinha(params)).toBe("Falta");
    expect(resolverAcoesPresencaLinha(params).acaoPrimaria).toBe("justificar");
  });

  it("Escalado sem horário programado em dia já passado vira Falta e oferece Justificar", () => {
    const params = {
      situacao: "Escalado",
      diaIso: "2026-07-10",
      entEsc: "—",
      saiEsc: "—",
      temCheckIn: false,
      temCheckOut: false,
      statusBase: "Sem horário",
      agora: new Date("2026-07-18T12:00:00"),
    };
    expect(resolverStatusPresencaLinha(params)).toBe("Falta");
    expect(resolverAcoesPresencaLinha(params).acaoPrimaria).toBe("justificar");
  });

  it("Escalado sem horário no próprio dia ainda não oferece Justificar", () => {
    const agora = new Date("2026-07-18T12:00:00");
    const params = {
      situacao: "Escalado",
      diaIso: "2026-07-18",
      entEsc: "—",
      saiEsc: "—",
      temCheckIn: false,
      temCheckOut: false,
      statusBase: "Sem horário",
      agora,
    };
    expect(resolverStatusPresencaLinha(params)).toBe("Sem horário");
    expect(resolverAcoesPresencaLinha(params).acaoPrimaria).toBeNull();
  });

  it("Venda com Check-in e Check-out permite aprovar como Folga", () => {
    expect(
      resolverAcoesPresencaLinha({
        situacao: "Venda",
        diaIso: "2026-07-18",
        entEsc: "—",
        saiEsc: "—",
        temCheckIn: true,
        temCheckOut: true,
        statusBase: "Registrado",
      }).acaoPrimaria,
    ).toBe("aprovar");
  });
});

describe("presencaCorrecao — análise por campo", () => {
  const correcaoBase = {
    entradaRealAnterior: "08:00",
    saidaRealAnterior: "17:00",
    entradaCorrigida: "08:15",
    saidaCorrigida: "17:30",
    observacao: null,
    corrigidoPorNome: "Ana",
    corrigidoEm: "2026-07-18T12:00:00.000Z",
    entradaAnaliseStatus: "pendente" as const,
    saidaAnaliseStatus: "pendente" as const,
  };

  it("aprovação de um campo não aplica o outro no Realizado", () => {
    const parcial = {
      ...correcaoBase,
      entradaAnaliseStatus: "aprovada" as const,
      saidaAnaliseStatus: "pendente" as const,
    };
    expect(presencaCorrecaoCampoAprovado(parcial, "entrada")).toBe(true);
    expect(presencaCorrecaoCampoAprovado(parcial, "saida")).toBe(false);
    expect(presencaCorrecaoAnaliseStatusEfetivo(parcial)).toBe("pendente");
    expect(presencaCorrecaoTemCampoPendenteAnalise(parcial)).toBe(true);
  });

  it("só consolida aprovada quando entrada e saída alteradas estão aprovadas", () => {
    const ok = {
      ...correcaoBase,
      entradaAnaliseStatus: "aprovada" as const,
      saidaAnaliseStatus: "aprovada" as const,
    };
    expect(presencaCorrecaoAnaliseStatusEfetivo(ok)).toBe("aprovada");
    expect(presencaCorrecaoTemCampoPendenteAnalise(ok)).toBe(false);
  });
});

describe("computePresencaKpisConsolidados — Troca, Venda e Compra", () => {
  const dia = (over: Partial<Parameters<typeof computePresencaKpisConsolidados>[0][number]>) => ({
    situacao: "Folga",
    status: "Folga",
    temCheckIn: false,
    ...over,
  });

  it("conta como Troca os dias de Venda e Compra - Turno vindos de Oferta de Troca", () => {
    const kpis = computePresencaKpisConsolidados([
      dia({ situacao: "Venda", origemTrocaMarketplace: true }),
      dia({ situacao: "Compra - Manhã", origemTrocaMarketplace: true }),
    ]);
    expect(kpis.trocas).toBe(2);
    expect(kpis.venda).toBe(0);
    expect(kpis.compra).toBe(0);
  });

  it("mantém Venda e Compra quando a origem não é troca", () => {
    const kpis = computePresencaKpisConsolidados([
      dia({ situacao: "Venda" }),
      dia({ situacao: "Compra - Noite" }),
      dia({ situacao: "Compra" }),
    ]);
    expect(kpis.trocas).toBe(0);
    expect(kpis.venda).toBe(1);
    expect(kpis.compra).toBe(2);
  });

  it("conta a célula Troca gravada manualmente na Escala", () => {
    const kpis = computePresencaKpisConsolidados([dia({ situacao: "Troca" })]);
    expect(kpis.trocas).toBe(1);
  });
});

describe("resolverStatusPresencaLinha — atestado aprovado", () => {
  const justAprovado = (abono: "sim" | "nao") => ({
    statusGestao: "aprovado" as const,
    justificativa: {
      motivo: "medico" as const,
      atestadoInicio: "2026-07-10",
      atestadoFim: "2026-07-12",
      atestadoStatus: "aprovado" as const,
      abonoRemunerado: abono,
    },
  });

  it("com abono remunerado mostra Abonado", () => {
    expect(
      resolverStatusPresencaLinha({
        situacao: "Escalado",
        diaIso: "2026-07-10",
        entEsc: "08:00",
        saiEsc: "16:00",
        temCheckIn: false,
        temCheckOut: false,
        statusBase: "Falta",
        gestao: justAprovado("sim"),
      }),
    ).toBe("Abonado");
  });

  it("sem abono remunerado mostra Atestado", () => {
    expect(
      resolverStatusPresencaLinha({
        situacao: "Atestado",
        diaIso: "2026-07-11",
        entEsc: "—",
        saiEsc: "—",
        temCheckIn: false,
        temCheckOut: false,
        statusBase: "Folga",
        gestao: justAprovado("nao"),
      }),
    ).toBe("Atestado");
  });

  it("Troca com abono também vira Abonado", () => {
    expect(
      resolverStatusPresencaLinha({
        situacao: "Troca",
        diaIso: "2026-07-10",
        entEsc: "—",
        saiEsc: "—",
        temCheckIn: false,
        temCheckOut: false,
        statusBase: "Sem horário",
        gestao: justAprovado("sim"),
      }),
    ).toBe("Abonado");
  });
});
