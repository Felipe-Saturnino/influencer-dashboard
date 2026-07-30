/** Times suportados na v1 do Overview Prestador (aba Escala). */
export const OVERVIEW_PRESTADOR_TIMES_ORDEM = [
  "Game Presenter",
  "Shuffler",
  "Shift Leader",
  "Service Manager",
] as const;

export type OverviewPrestadorTimeRotulo = (typeof OVERVIEW_PRESTADOR_TIMES_ORDEM)[number];

export const OVERVIEW_PRESTADOR_TIME_DEFAULT: OverviewPrestadorTimeRotulo = "Game Presenter";

export type OverviewPrestadorTimeCaps = {
  /** Negocia turno no Marketplace (troca / venda / compra). */
  negocia: boolean;
  /** Mostra bloco Cobertura por estúdio (visão de time). */
  porEstudio: boolean;
  /** Mostra pizza Distribuição por estúdio (visão individual). */
  distribuicaoEstudioIndividual: boolean;
  /** Turnos exibidos na Cobertura por turno. */
  turnos: { key: "MRN" | "AFT" | "NGT"; label: string }[];
};

const CAPS: Record<OverviewPrestadorTimeRotulo, OverviewPrestadorTimeCaps> = {
  "Game Presenter": {
    negocia: true,
    porEstudio: true,
    distribuicaoEstudioIndividual: true,
    turnos: [
      { key: "MRN", label: "Manhã" },
      { key: "AFT", label: "Tarde" },
      { key: "NGT", label: "Noite" },
    ],
  },
  Shuffler: {
    negocia: true,
    porEstudio: false,
    distribuicaoEstudioIndividual: false,
    turnos: [
      { key: "MRN", label: "Manhã" },
      { key: "AFT", label: "Tarde" },
      { key: "NGT", label: "Noite" },
    ],
  },
  "Shift Leader": {
    negocia: false,
    porEstudio: false,
    distribuicaoEstudioIndividual: false,
    turnos: [
      { key: "MRN", label: "Diurno (08h–20h)" },
      { key: "NGT", label: "Noturno (20h–08h)" },
    ],
  },
  "Service Manager": {
    negocia: false,
    porEstudio: false,
    distribuicaoEstudioIndividual: false,
    turnos: [
      { key: "MRN", label: "Diurno (08h–20h)" },
      { key: "NGT", label: "Noturno (20h–08h)" },
    ],
  },
};

export function isOverviewPrestadorTimeRotulo(s: string): s is OverviewPrestadorTimeRotulo {
  return (OVERVIEW_PRESTADOR_TIMES_ORDEM as readonly string[]).includes(s);
}

export function capsOverviewPrestadorTime(rotulo: string | null | undefined): OverviewPrestadorTimeCaps {
  if (rotulo && isOverviewPrestadorTimeRotulo(rotulo)) return CAPS[rotulo];
  return CAPS["Game Presenter"];
}

export function rotuloTimeFromNomeOrganograma(nome: string | null | undefined): OverviewPrestadorTimeRotulo | null {
  const n = (nome ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!n) return null;
  if (n.includes("game presenter")) return "Game Presenter";
  if (n.includes("shuffler")) return "Shuffler";
  if (n.includes("shift leader")) return "Shift Leader";
  if (n.includes("service manager")) return "Service Manager";
  return null;
}
