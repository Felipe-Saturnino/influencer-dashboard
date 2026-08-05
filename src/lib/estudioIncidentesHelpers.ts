import {
  TIPOS_INCIDENTE_BACCARAT_FB,
  TIPOS_INCIDENTE_BLACKJACK,
  TIPOS_INCIDENTE_ROLETA,
  TIPOS_INCIDENTE_SHUFFLER,
  type IncidenteCategoria,
  type IncidenteTimeAlvo,
  INCIDENTE_CATEGORIA_META,
} from "./estudioIncidentesTypes";
import {
  normRhOrgRotuloOrganograma,
  timeOrganogramaIndicaGamePresenter,
  timeOrganogramaIndicaShuffler,
} from "./rhPrestadorUsuarioSync";

function nomeOrganogramaEhAcademy(nome: string | null | undefined): boolean {
  const nt = normRhOrgRotuloOrganograma(nome);
  if (!nt) return false;
  if (nt.includes("performance coach")) return true;
  if (nt === "academy") return true;
  if (nt === "treinamento" || nt.startsWith("treinamento ")) return true;
  return false;
}

export function normalizarTipoJogoIncidente(tipoJogo: string | null | undefined): string {
  const raw = (tipoJogo ?? "").trim().toLowerCase();
  if (!raw) return "outro";
  if (raw.includes("black")) return "blackjack";
  if (raw.includes("roleta") || raw.includes("roulette")) return "roleta";
  if (raw.includes("baccarat") || raw.includes("bacará") || raw.includes("bacara")) return "baccarat";
  if (raw.includes("futebol") || raw.includes("football") || raw === "fb") return "fb";
  return raw;
}

export function labelTipoJogoIncidente(jogo: string): string {
  const k = normalizarTipoJogoIncidente(jogo);
  if (k === "blackjack") return "Blackjack";
  if (k === "roleta") return "Roleta";
  if (k === "baccarat") return "Baccarat";
  if (k === "fb") return "Futebol Brasileiro";
  return jogo || "—";
}

export function tiposIncidenteParaForm(
  timeAlvo: IncidenteTimeAlvo,
  tipoJogoMesa: string | null | undefined,
): string[] {
  if (timeAlvo === "shuf") return [...TIPOS_INCIDENTE_SHUFFLER];
  const jogo = normalizarTipoJogoIncidente(tipoJogoMesa);
  if (jogo === "blackjack") return [...TIPOS_INCIDENTE_BLACKJACK];
  if (jogo === "roleta") return [...TIPOS_INCIDENTE_ROLETA];
  if (jogo === "baccarat" || jogo === "fb") return [...TIPOS_INCIDENTE_BACCARAT_FB];
  return [];
}

export function labelMesaIncidente(
  numeroMesa: string | null | undefined,
  estudioNome: string | null | undefined,
  nomeMesa: string | null | undefined,
): string {
  const nRaw = (numeroMesa ?? "").trim();
  const n = nRaw ? nRaw.padStart(2, "0") : "—";
  const est = (estudioNome ?? "").trim() || "—";
  const nome = (nomeMesa ?? "").trim() || "—";
  return `${n} — ${est} — ${nome}`;
}

export function incidenteCategoriaLabel(cat: IncidenteCategoria): string {
  return INCIDENTE_CATEGORIA_META[cat]?.label ?? cat;
}

export function timeAlvoLabel(t: IncidenteTimeAlvo): string {
  return t === "gp" ? "Game Presenter" : "Shuffler";
}

/** Prestador elegível no filtro Staff da barra (só GP / Shuffler do organograma). */
export function orgTimeEhGpOuShuffler(nomeTime: string | null | undefined): IncidenteTimeAlvo | null {
  if (timeOrganogramaIndicaGamePresenter(nomeTime)) return "gp";
  if (timeOrganogramaIndicaShuffler(nomeTime)) return "shuf";
  return null;
}

/**
 * Prestador elegível no select do formulário Novo Incidente:
 * time GP ou Shuffler (conforme formulário) + SM / SL / Performance Coach / Academy.
 */
export function orgTimeElegivelFormIncidente(
  timeAlvo: IncidenteTimeAlvo,
  nomeTime: string | null | undefined,
): { ok: boolean; papel: string } {
  const nt = normRhOrgRotuloOrganograma(nomeTime);
  if (timeAlvo === "gp" && timeOrganogramaIndicaGamePresenter(nomeTime)) {
    return { ok: true, papel: "Game Presenter" };
  }
  if (timeAlvo === "shuf" && timeOrganogramaIndicaShuffler(nomeTime)) {
    return { ok: true, papel: "Shuffler" };
  }
  if (nt.includes("service manager")) return { ok: true, papel: "Service Manager" };
  if (nt.includes("shift leader")) return { ok: true, papel: "Shift Leader" };
  if (nt.includes("performance coach")) return { ok: true, papel: "Performance Coach" };
  if (nomeOrganogramaEhAcademy(nomeTime) || nt === "academy") {
    return { ok: true, papel: "Academy" };
  }
  return { ok: false, papel: "" };
}

export function formatDataHoraIncidente(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDataIsoBr(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate || "—";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatHoraRodada(hora: string): string {
  if (!hora) return "—";
  return hora.slice(0, 5);
}

export function hojeIsoDateLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Ordenação de mesa pelo número (numérico; sem número vai ao fim). */
export function compareNumeroMesaIncidente(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const digitos = (v: string | null | undefined) => {
    const m = String(v ?? "").trim().match(/\d+/);
    return m ? Number.parseInt(m[0]!, 10) : NaN;
  };
  const na = digitos(a);
  const nb = digitos(b);
  const aOk = Number.isFinite(na);
  const bOk = Number.isFinite(nb);
  if (aOk && bOk && na !== nb) return na - nb;
  if (aOk && !bOk) return -1;
  if (!aOk && bOk) return 1;
  return String(a ?? "").localeCompare(String(b ?? ""), "pt-BR", { numeric: true });
}

/**
 * Normaliza hora digitada (texto) para `HH:MM:SS` aceito pela coluna `time`.
 * Aceita `H:MM`, `HH:MM` e `HH:MM:SS`.
 */
export function normalizarHoraRodadaTexto(raw: string): string | null {
  const s = raw.trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) return null;
  const h = Number.parseInt(m[1]!, 10);
  const min = Number.parseInt(m[2]!, 10);
  const sec = m[3] != null ? Number.parseInt(m[3], 10) : 0;
  if (h > 23 || min > 59 || sec > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Rótulo do prestador no combo (nome · nickname). */
export function labelPrestadorIncidente(nome: string, nickname: string | null | undefined): string {
  const n = nome.trim();
  const nick = (nickname ?? "").trim();
  return nick ? `${n} · ${nick}` : n;
}
