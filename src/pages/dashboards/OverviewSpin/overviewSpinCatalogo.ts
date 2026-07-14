/**
 * Catálogo Gestão de Estúdios → quais operadoras têm mesa Dedicada / Network.
 */

export type EstudioCatalogoRow = {
  slug: string;
  tipo: string | null;
  ativo: boolean;
  estudios_spin_operadoras?: { operadora_slug: string }[] | { operadora_slug: string } | null;
};

export type MesaCatalogoRow = {
  estudio_slug: string | null;
  operadora_slug: string | null;
};

export type OverviewSpinCatalogoCanais = {
  slugsComMesaDedicada: string[];
  slugsComMesaNetwork: string[];
};

function unwrapJunction(
  j: EstudioCatalogoRow["estudios_spin_operadoras"],
): { operadora_slug: string }[] {
  if (!j) return [];
  return Array.isArray(j) ? j : [j];
}

export function buildCatalogoCanaisMesas(
  estudios: EstudioCatalogoRow[],
  mesas: MesaCatalogoRow[],
): OverviewSpinCatalogoCanais {
  const tipoPorEstudio = new Map<string, "dedicado" | "network">();
  const opsPorEstudio = new Map<string, Set<string>>();

  for (const e of estudios) {
    if (!e.ativo) continue;
    const tipo = e.tipo === "network" ? "network" : e.tipo === "dedicado" ? "dedicado" : null;
    if (!tipo) continue;
    tipoPorEstudio.set(e.slug, tipo);
    const set = new Set<string>();
    for (const j of unwrapJunction(e.estudios_spin_operadoras)) {
      const s = j.operadora_slug?.trim();
      if (s) set.add(s);
    }
    opsPorEstudio.set(e.slug, set);
  }

  const dedicada = new Set<string>();
  const network = new Set<string>();

  for (const m of mesas) {
    const estSlug = m.estudio_slug?.trim();
    if (!estSlug) continue;
    const tipo = tipoPorEstudio.get(estSlug);
    if (!tipo) continue;
    const ops = new Set(opsPorEstudio.get(estSlug) ?? []);
    const legado = m.operadora_slug?.trim();
    if (legado) ops.add(legado);
    const target = tipo === "network" ? network : dedicada;
    for (const op of ops) target.add(op);
  }

  return {
    slugsComMesaDedicada: [...dedicada].sort((a, b) => a.localeCompare(b, "pt-BR")),
    slugsComMesaNetwork: [...network].sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}

/** Visibilidade das abas Estúdio Dedicado / Estúdio Network. */
export function podeVerAbaCanalCatalogo(opts: {
  canal: "dedicado" | "network";
  isAdmin: boolean;
  canView: "sim" | "proprios" | "nao";
  operadorasVisiveis: string[];
  catalogo: OverviewSpinCatalogoCanais;
}): boolean {
  if (opts.canView === "nao") return false;
  const pool =
    opts.canal === "network" ? opts.catalogo.slugsComMesaNetwork : opts.catalogo.slugsComMesaDedicada;
  if (pool.length === 0) return false;
  if (opts.isAdmin || opts.canView === "sim") return true;
  // proprios: interseção com escopo
  return opts.operadorasVisiveis.some((s) => pool.includes(s));
}
