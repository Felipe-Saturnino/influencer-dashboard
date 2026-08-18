import { supabase } from "./supabase";

export type TurnosDealersPick = {
  turno_manha_inicio: string | null;
  turno_tarde_inicio: string | null;
  turno_noite_inicio: string | null;
};

/** Cadastro Staff: atende todos os estúdios ativos (Shuffler, SM, SL). */
export const ESTUDIO_SLUG_TODOS = "todos";

function slugsEstudioDoPrestador(p: {
  staff_estudio_slug?: string | null;
  staff_estudio_slugs?: string[] | null;
}): string[] {
  return Array.isArray(p.staff_estudio_slugs)
    ? p.staff_estudio_slugs.map((x) => String(x).trim()).filter(Boolean)
    : [];
}

export function staffEstudioCadastroAtendeTodos(p: {
  staff_estudio_slug?: string | null;
  staff_estudio_slugs?: string[] | null;
}): boolean {
  return slugsEstudioDoPrestador(p).includes(ESTUDIO_SLUG_TODOS);
}

function turnoPickTemHorario(t: TurnosDealersPick): boolean {
  return Boolean(t.turno_manha_inicio || t.turno_tarde_inicio || t.turno_noite_inicio);
}

/** Primeiro estúdio ativo com horário preenchido (ordem de slug). */
export function pickTurnosEstudioComHorario(
  mapPorEstudio: Map<string, TurnosDealersPick>,
): TurnosDealersPick | null {
  const rows = [...mapPorEstudio.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  for (const [, t] of rows) {
    if (turnoPickTemHorario(t)) return t;
  }
  return null;
}

/** Slug de estúdio específico para horários 4x2/5x1 (ignora «todos»). */
export function pickStaffEstudioSlugParaTurnos(p: {
  staff_estudio_slug?: string | null;
  staff_estudio_slugs?: string[] | null;
}): string | null {
  const fromArray = slugsEstudioDoPrestador(p);
  if (fromArray.includes(ESTUDIO_SLUG_TODOS)) return null;
  if (fromArray[0]) return fromArray[0]!;
  const legado = (p.staff_estudio_slug ?? "").trim();
  return legado || null;
}

/**
 * Horários Manhã/Tarde/Noite: preferência operadora (junction/legado), senão estúdio Spin do Staff.
 * **Todos Estúdios** (ou cadastro sem slug) usa o primeiro estúdio ativo com horário —
 * mesmo fallback do Marketplace (`_escala_marketplace_turnos_pick`).
 */
export function resolveTurnosHorarioPrestador(
  p: {
    staff_operadora_slug?: string | null;
    staff_estudio_slug?: string | null;
    staff_estudio_slugs?: string[] | null;
  },
  mapPorOperadora: Map<string, TurnosDealersPick>,
  mapPorEstudio: Map<string, TurnosDealersPick>,
): TurnosDealersPick | null {
  const opSlug = (p.staff_operadora_slug ?? "").trim();
  if (opSlug) {
    const fromOp = mapPorOperadora.get(opSlug);
    if (fromOp) return fromOp;
  }
  const estudioSlug = pickStaffEstudioSlugParaTurnos(p);
  if (estudioSlug) return mapPorEstudio.get(estudioSlug) ?? null;
  return pickTurnosEstudioComHorario(mapPorEstudio);
}

export function timeDbToInput(v: string | null | undefined): string {
  if (!v || typeof v !== "string") return "";
  const m = v.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1]!.padStart(2, "0")}:${m[2]}` : v.slice(0, 5);
}

type EstudioTurnoJoin = {
  operadora_slug: string;
  estudios_spin:
    | {
        slug: string;
        tipo: string;
        ativo: boolean;
        turno_manha_inicio: string | null;
        turno_tarde_inicio: string | null;
        turno_noite_inicio: string | null;
      }
    | {
        slug: string;
        tipo: string;
        ativo: boolean;
        turno_manha_inicio: string | null;
        turno_tarde_inicio: string | null;
        turno_noite_inicio: string | null;
      }[]
    | null;
};

function pickEstudioTurnos(rows: EstudioTurnoJoin[], operadoraSlug: string): TurnosDealersPick | null {
  const candidatos = rows
    .filter((r) => r.operadora_slug === operadoraSlug)
    .map((r) => {
      const e = r.estudios_spin;
      if (e == null) return null;
      return Array.isArray(e) ? e[0] : e;
    })
    .filter((e): e is NonNullable<typeof e> => e != null && e.ativo !== false);

  candidatos.sort((a, b) => {
    const pa = a.tipo === "dedicado" ? 0 : 1;
    const pb = b.tipo === "dedicado" ? 0 : 1;
    return pa - pb;
  });

  const escolhido = candidatos[0];
  if (!escolhido) return null;
  return {
    turno_manha_inicio: escolhido.turno_manha_inicio,
    turno_tarde_inicio: escolhido.turno_tarde_inicio,
    turno_noite_inicio: escolhido.turno_noite_inicio,
  };
}

/** Turnos por operadora: preferência estúdio vinculado; fallback colunas legadas em operadoras. */
export async function fetchTurnosPorOperadoraSlugs(
  slugs: string[],
): Promise<Map<string, TurnosDealersPick>> {
  const uniq = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  const map = new Map<string, TurnosDealersPick>();
  if (uniq.length === 0) return map;

  const [junctionRes, opRes] = await Promise.all([
    supabase
      .from("estudios_spin_operadoras")
      .select(
        "operadora_slug, estudios_spin(slug, tipo, ativo, turno_manha_inicio, turno_tarde_inicio, turno_noite_inicio)",
      )
      .in("operadora_slug", uniq),
    supabase
      .from("operadoras")
      .select("slug, turno_manha_inicio, turno_tarde_inicio, turno_noite_inicio")
      .in("slug", uniq),
  ]);

  const junctionRows = (junctionRes.data ?? []) as EstudioTurnoJoin[];
  const opRows = (opRes.data ?? []) as (TurnosDealersPick & { slug: string })[];

  for (const slug of uniq) {
    const fromEstudio = pickEstudioTurnos(junctionRows, slug);
    if (fromEstudio) {
      map.set(slug, fromEstudio);
      continue;
    }
    const legado = opRows.find((o) => o.slug === slug);
    if (legado) {
      map.set(slug, {
        turno_manha_inicio: legado.turno_manha_inicio,
        turno_tarde_inicio: legado.turno_tarde_inicio,
        turno_noite_inicio: legado.turno_noite_inicio,
      });
    }
  }

  return map;
}

function mapTurnosEstudioRows(
  rows: (TurnosDealersPick & { slug: string })[],
): Map<string, TurnosDealersPick> {
  const map = new Map<string, TurnosDealersPick>();
  for (const row of rows) {
    map.set(row.slug, {
      turno_manha_inicio: row.turno_manha_inicio,
      turno_tarde_inicio: row.turno_tarde_inicio,
      turno_noite_inicio: row.turno_noite_inicio,
    });
  }
  return map;
}

/** Turnos por estúdio (colunas em estudios_spin). */
export async function fetchTurnosPorEstudioSlugs(
  slugs: string[],
): Promise<Map<string, TurnosDealersPick>> {
  const uniq = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (uniq.length === 0) return new Map();

  const { data } = await supabase
    .from("estudios_spin")
    .select("slug, turno_manha_inicio, turno_tarde_inicio, turno_noite_inicio")
    .in("slug", uniq)
    .eq("ativo", true);

  return mapTurnosEstudioRows((data ?? []) as (TurnosDealersPick & { slug: string })[]);
}

/** Todos os estúdios ativos — fallback de horário para cadastro **Todos Estúdios**. */
export async function fetchTurnosEstudiosSpinAtivos(): Promise<Map<string, TurnosDealersPick>> {
  const { data } = await supabase
    .from("estudios_spin")
    .select("slug, turno_manha_inicio, turno_tarde_inicio, turno_noite_inicio")
    .eq("ativo", true);

  return mapTurnosEstudioRows((data ?? []) as (TurnosDealersPick & { slug: string })[]);
}

type PrestadorTurnosVinculo = {
  staff_operadora_slug?: string | null;
  staff_estudio_slug?: string | null;
  staff_estudio_slugs?: string[] | null;
};

/** Mapas de horário para Calendário / Overview — inclui fallback Todos Estúdios. */
export async function carregarMapasTurnosHorarioPrestadores(
  prestadores: readonly PrestadorTurnosVinculo[],
): Promise<{
  mapPorOperadora: Map<string, TurnosDealersPick>;
  mapPorEstudio: Map<string, TurnosDealersPick>;
}> {
  const opSlugs = [
    ...new Set(prestadores.map((p) => (p.staff_operadora_slug ?? "").trim()).filter(Boolean)),
  ];
  const estudioSlugs = [
    ...new Set(
      prestadores
        .map((p) => pickStaffEstudioSlugParaTurnos(p))
        .filter((s): s is string => Boolean(s)),
    ),
  ];
  const atendeTodos = prestadores.some((p) => staffEstudioCadastroAtendeTodos(p));
  if (opSlugs.length === 0 && estudioSlugs.length === 0 && !atendeTodos) {
    return { mapPorOperadora: new Map(), mapPorEstudio: new Map() };
  }
  const [mapPorOperadora, mapPorEstudio] = await Promise.all([
    opSlugs.length > 0
      ? fetchTurnosPorOperadoraSlugs(opSlugs)
      : Promise.resolve(new Map<string, TurnosDealersPick>()),
    atendeTodos ? fetchTurnosEstudiosSpinAtivos() : fetchTurnosPorEstudioSlugs(estudioSlugs),
  ]);
  return { mapPorOperadora, mapPorEstudio };
}
