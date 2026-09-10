import { describe, expect, it } from "vitest";
import {
  checkInDentroJanelaTurno,
  checkOutDentroJanelaTurno,
  comentarioOverlayLiderancaCt,
  horarioJustificativaDentroJanela,
  MSG_CHECKIN_FORA_JANELA,
  MSG_CHECKOUT_FORA_JANELA,
  COMENTARIO_APROVADO_LIDERANCA,
  COMENTARIO_REGISTRADO_LIDERANCA,
  prestadorTimeAplicaJanelaTurnoCalendario,
  situacaoPermitePontoJanelaTurno,
  podeVerAbaRelatorioJustificativas,
  resolverTurnoEfetivoHhmm,
} from "../../../src/lib/calendarioPresencaJanelaTurno";

describe("calendarioPresencaJanelaTurno", () => {
  it("aplica só GP e Shuffler", () => {
    expect(prestadorTimeAplicaJanelaTurnoCalendario("Game Presenter")).toBe(true);
    expect(prestadorTimeAplicaJanelaTurnoCalendario("Shufflers")).toBe(true);
    expect(prestadorTimeAplicaJanelaTurnoCalendario(null, "game_presenter")).toBe(true);
    expect(prestadorTimeAplicaJanelaTurnoCalendario("Shift Leader")).toBe(false);
  });

  it("situação permite ponto", () => {
    expect(situacaoPermitePontoJanelaTurno("Escalado")).toBe(true);
    expect(situacaoPermitePontoJanelaTurno("Compra - Manhã")).toBe(true);
    expect(situacaoPermitePontoJanelaTurno("Troca")).toBe(true);
    expect(situacaoPermitePontoJanelaTurno("Folga")).toBe(false);
    expect(situacaoPermitePontoJanelaTurno("Venda")).toBe(false);
  });

  it("check-in: abre 15min antes e fecha no fim (diurno)", () => {
    const dia = "2026-09-10";
    // Turno 07:00–15:00 → janela 06:45–15:00
    expect(checkInDentroJanelaTurno(new Date(2026, 8, 10, 6, 44), dia, "07:00", "15:00").ok).toBe(
      false,
    );
    expect(checkInDentroJanelaTurno(new Date(2026, 8, 10, 6, 45), dia, "07:00", "15:00").ok).toBe(
      true,
    );
    expect(checkInDentroJanelaTurno(new Date(2026, 8, 10, 14, 59), dia, "07:00", "15:00").ok).toBe(
      true,
    );
    expect(checkInDentroJanelaTurno(new Date(2026, 8, 10, 15, 1), dia, "07:00", "15:00").ok).toBe(
      false,
    );
  });

  it("check-in noturno 18–06 → abre 17:45", () => {
    const dia = "2026-09-10";
    expect(checkInDentroJanelaTurno(new Date(2026, 8, 10, 17, 45), dia, "18:00", "06:00").ok).toBe(
      true,
    );
    expect(checkInDentroJanelaTurno(new Date(2026, 8, 11, 5, 59), dia, "18:00", "06:00").ok).toBe(
      true,
    );
    expect(checkInDentroJanelaTurno(new Date(2026, 8, 11, 6, 1), dia, "18:00", "06:00").ok).toBe(
      false,
    );
  });

  it("check-out até fim+15 e após check-in", () => {
    const dia = "2026-09-10";
    const ci = new Date(2026, 8, 10, 7, 5);
    expect(
      checkOutDentroJanelaTurno(new Date(2026, 8, 10, 15, 10), dia, "07:00", "15:00", ci).ok,
    ).toBe(true);
    expect(
      checkOutDentroJanelaTurno(new Date(2026, 8, 10, 15, 16), dia, "07:00", "15:00", ci).ok,
    ).toBe(false);
    expect(checkOutDentroJanelaTurno(new Date(2026, 8, 10, 15, 0), dia, "07:00", "15:00", null).ok).toBe(
      false,
    );
  });

  it("mensagens canónicas", () => {
    const r = checkInDentroJanelaTurno(new Date(2026, 8, 10, 5, 0), "2026-09-10", "07:00", "15:00");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensagem).toBe(MSG_CHECKIN_FORA_JANELA);
    const o = checkOutDentroJanelaTurno(
      new Date(2026, 8, 10, 16, 0),
      "2026-09-10",
      "07:00",
      "15:00",
      new Date(2026, 8, 10, 7, 0),
    );
    expect(o.ok).toBe(false);
    if (!o.ok) expect(o.mensagem).toBe(MSG_CHECKOUT_FORA_JANELA);
  });

  it("justificativa HH:MM na janela", () => {
    expect(horarioJustificativaDentroJanela("entrada", "06:50", "2026-09-10", "07:00", "15:00")).toBe(
      true,
    );
    expect(horarioJustificativaDentroJanela("entrada", "06:30", "2026-09-10", "07:00", "15:00")).toBe(
      false,
    );
    expect(horarioJustificativaDentroJanela("saida", "15:10", "2026-09-10", "07:00", "15:00")).toBe(
      true,
    );
    expect(horarioJustificativaDentroJanela("saida", "15:20", "2026-09-10", "07:00", "15:00")).toBe(
      false,
    );
  });

  it("comentário overlay CT", () => {
    expect(comentarioOverlayLiderancaCt("07:00", "15:00", "07:00", "15:00")).toBe(
      COMENTARIO_APROVADO_LIDERANCA,
    );
    expect(comentarioOverlayLiderancaCt("07:00", "16:00", "07:00", "15:00")).toBe(
      COMENTARIO_REGISTRADO_LIDERANCA,
    );
  });

  it("resolverTurnoEfetivoHhmm prefere HA válida e cai na escala", () => {
    expect(
      resolverTurnoEfetivoHhmm("07:00", "15:00", { entrada: "06:00", saida: "16:00" }),
    ).toEqual({ entrada: "06:00", saida: "16:00", origem: "hora_adicional" });
    expect(resolverTurnoEfetivoHhmm("07:00", "15:00", { entrada: "xx", saida: "16:00" })).toEqual({
      entrada: "07:00",
      saida: "15:00",
      origem: "escala",
    });
    expect(resolverTurnoEfetivoHhmm("—", "—", null)).toBeNull();
    expect(resolverTurnoEfetivoHhmm("07:00", "15:00", null)?.origem).toBe("escala");
  });

  it("visibilidade Relatório de Justificativas", () => {
    expect(
      podeVerAbaRelatorioJustificativas({
        isAdmin: false,
        canView: "proprios",
        canEditar: "proprios",
        canCriar: "nao",
        meuModoAtivo: false,
      }),
    ).toBe(false);
    expect(
      podeVerAbaRelatorioJustificativas({
        isAdmin: false,
        canView: "sim",
        canEditar: "sim",
        canCriar: "nao",
        meuModoAtivo: false,
      }),
    ).toBe(true);
    expect(
      podeVerAbaRelatorioJustificativas({
        isAdmin: false,
        canView: "sim",
        canEditar: "sim",
        canCriar: "nao",
        meuModoAtivo: true,
      }),
    ).toBe(false);
    expect(
      podeVerAbaRelatorioJustificativas({
        isAdmin: false,
        canView: "proprios",
        canEditar: "nao",
        canCriar: "sim",
        meuModoAtivo: false,
      }),
    ).toBe(true);
  });
});
