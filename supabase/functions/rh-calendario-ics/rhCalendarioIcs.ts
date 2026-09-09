/** Espelho de `src/lib/rhCalendarioIcs.ts` — o painel Supabase não inclui `src/`. */

export type RhCalendarioIcsEvento = {
  uid: string;
  titulo: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
};

export type RhCalendarioIcsPayload = {
  nome?: string | null;
  eventos: RhCalendarioIcsEvento[];
};

const PRODID = "-//Spin Gaming//Calendario Prestador//PT";
const CALNAME = "Calendário Spin Gaming";

function escapeIcsText(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

function icsUtcStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}

function icsDateValue(isoDate: string): string {
  return isoDate.slice(0, 10).replace(/-/g, "");
}

function addOneDayIso(isoDate: string): string {
  const [ys, ms, ds] = isoDate.slice(0, 10).split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return isoDate.slice(0, 10);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function montarIcsCalendarioPrestador(payload: RhCalendarioIcsPayload, geradoEm = new Date()): string {
  const stamp = icsUtcStamp(geradoEm.toISOString()) || "19700101T000000Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(CALNAME)}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
  ];

  for (const ev of payload.eventos) {
    const uid = (ev.uid ?? "").trim();
    const titulo = (ev.titulo ?? "").trim();
    if (!uid || !titulo) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    if (ev.allDay) {
      const de = icsDateValue(ev.startsAt);
      const ate = icsDateValue(ev.endsAt || addOneDayIso(ev.startsAt));
      if (!de) continue;
      lines.push(`DTSTART;VALUE=DATE:${de}`);
      lines.push(`DTEND;VALUE=DATE:${ate}`);
    } else {
      const a = icsUtcStamp(ev.startsAt);
      const b = icsUtcStamp(ev.endsAt);
      if (!a || !b) continue;
      lines.push(`DTSTART:${a}`);
      lines.push(`DTEND:${b}`);
    }
    lines.push(`SUMMARY:${escapeIcsText(titulo)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
