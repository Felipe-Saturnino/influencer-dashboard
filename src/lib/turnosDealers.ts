import { supabase } from "./supabase";

export type TurnosDealersPick = {
  turno_manha_inicio: string | null;
  turno_tarde_inicio: string | null;
  turno_noite_inicio: string | null;
};

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
