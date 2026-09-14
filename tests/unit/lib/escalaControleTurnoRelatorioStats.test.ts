import { describe, expect, it } from "vitest";
import {
  statsPresencaRelatorioCt,
  type CtEstudioHorarioTurno,
  type CtPresencaRow,
} from "../../../src/lib/escalaControleTurno";

const estudios: CtEstudioHorarioTurno[] = [
  {
    slug: "blaze",
    nome: "Blaze",
    turno_manha_inicio: "07:00:00",
    turno_tarde_inicio: "15:00:00",
    turno_noite_inicio: "23:00:00",
  },
];

function row(partial: Partial<CtPresencaRow> & Pick<CtPresencaRow, "id" | "time" | "status">): CtPresencaRow {
  return {
    nome: partial.nome ?? "Nome",
    nickname: partial.nickname ?? "Nick",
    estudio: partial.estudio ?? "Blaze",
    entrada: partial.entrada ?? "",
    saida: partial.saida ?? "",
    registrado: partial.registrado ?? true,
    ...partial,
  };
}

describe("statsPresencaRelatorioCt", () => {
  it("separa GP e Shuffler e conta Escalados / Presentes / Faltas", () => {
    const rows: CtPresencaRow[] = [
      row({ id: "1", time: "Game Presenter", status: "presente", entrada: "07:00" }),
      row({ id: "2", time: "Game Presenter", status: "falta" }),
      row({ id: "3", time: "Shuffler", status: "presente", entrada: "07:01" }),
      row({ id: "4", time: "Shuffler", status: "pendente" }),
    ];
    const st = statsPresencaRelatorioCt(rows, { turno: "manha", estudios });
    expect(st.gp).toEqual({ escalados: 2, presentes: 1, atrasados: 0, faltas: 1 });
    expect(st.shuffler).toEqual({ escalados: 2, presentes: 1, atrasados: 0, faltas: 0 });
  });

  it("conta atraso por status e por entrada >5 min após o previsto", () => {
    const rows: CtPresencaRow[] = [
      row({ id: "1", time: "Game Presenter", status: "atraso", entrada: "07:20" }),
      row({ id: "2", time: "Game Presenter", status: "presente", entrada: "07:10" }),
      row({ id: "3", time: "Game Presenter", status: "presente", entrada: "07:03" }),
    ];
    const st = statsPresencaRelatorioCt(rows, { turno: "manha", estudios });
    expect(st.gp).toEqual({ escalados: 3, presentes: 1, atrasados: 2, faltas: 0 });
  });
});
