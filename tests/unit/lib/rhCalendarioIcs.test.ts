import { describe, expect, it } from "vitest";
import { montarIcsCalendarioPrestador } from "@/lib/rhCalendarioIcs";
import { urlPublicaCalendarioIcs } from "@/lib/rhCalendarioIcsFeed";

describe("montarIcsCalendarioPrestador", () => {
  const geradoEm = new Date("2026-09-09T15:00:00.000Z");

  it("monta VEVENT com horário em UTC e CRLF", () => {
    const ics = montarIcsCalendarioPrestador(
      {
        eventos: [
          {
            uid: "turno-abc-2026-09-10@data-intelligence.spingaming.com.br",
            titulo: "Turno Noite",
            startsAt: "2026-09-10T21:00:00.000Z",
            endsAt: "2026-09-11T09:00:00.000Z",
          },
        ],
      },
      geradoEm,
    );
    expect(ics.includes("\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("SUMMARY:Turno Noite");
    expect(ics).toContain("DTSTART:20260910T210000Z");
    expect(ics).toContain("DTEND:20260911T090000Z");
    expect(ics).toContain("UID:turno-abc-2026-09-10@data-intelligence.spingaming.com.br");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("usa VALUE=DATE em reunião de dia inteiro", () => {
    const ics = montarIcsCalendarioPrestador(
      {
        eventos: [
          {
            uid: "reuniao-1@data-intelligence.spingaming.com.br",
            titulo: "Reunião - RH",
            startsAt: "2026-09-15",
            endsAt: "2026-09-16",
            allDay: true,
          },
        ],
      },
      geradoEm,
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20260915");
    expect(ics).toContain("DTEND;VALUE=DATE:20260916");
    expect(ics).toContain("SUMMARY:Reunião - RH");
  });

  it("escapa vírgula e ponto e vírgula no SUMMARY", () => {
    const ics = montarIcsCalendarioPrestador(
      {
        eventos: [
          {
            uid: "t1@spin",
            titulo: "Turno Manhã, Estúdio; VIP",
            startsAt: "2026-09-10T12:00:00.000Z",
            endsAt: "2026-09-10T20:00:00.000Z",
          },
        ],
      },
      geradoEm,
    );
    expect(ics).toContain("SUMMARY:Turno Manhã\\, Estúdio\\; VIP");
  });

  it("ignora evento sem uid ou título", () => {
    const ics = montarIcsCalendarioPrestador(
      {
        eventos: [
          { uid: "", titulo: "X", startsAt: "2026-09-10T12:00:00.000Z", endsAt: "2026-09-10T13:00:00.000Z" },
          { uid: "ok@spin", titulo: "  ", startsAt: "2026-09-10T12:00:00.000Z", endsAt: "2026-09-10T13:00:00.000Z" },
        ],
      },
      geradoEm,
    );
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});

describe("urlPublicaCalendarioIcs", () => {
  it("monta o caminho público com o token", () => {
    const href = urlPublicaCalendarioIcs("abcToken");
    expect(href).toMatch(/\/ics\/calendario\/abcToken$/);
  });
});
