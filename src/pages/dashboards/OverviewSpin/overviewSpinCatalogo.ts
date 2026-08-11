/**
 * Catálogo Gestão de Estúdios → quais operadoras têm canal Dedicado / Network.
 * Fonte principal: estúdios ativos + junction `estudios_spin_operadoras` (tipo do estúdio).
 * Mesas em `mesas_spin_cadastro` só enriquecem legado (operadora_slug na mesa).
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
  /** Operadoras com ≥1 estúdio dedicado vinculado (ou mesa dedicada legado). */
  slugsComMesaDedicada: string[];
  /** Operadoras com ≥1 estúdio network vinculado (ou mesa network legado). */
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
  mesas: MesaCatalogoRow[] = [],
): OverviewSpinCatalogoCanais {
  const dedicada = new Set<string>();
  const network = new Set<string>();
  const tipoPorEstudio = new Map<string, "dedicado" | "network">();

  for (const e of estudios) {
    if (!e.ativo) continue;
    const tipo = e.tipo === "network" ? "network" : e.tipo === "dedicado" ? "dedicado" : null;
    if (!tipo) continue;
    tipoPorEstudio.set(e.slug, tipo);
    const target = tipo === "network" ? network : dedicada;
    for (const j of unwrapJunction(e.estudios_spin_operadoras)) {
      const s = j.operadora_slug?.trim();
      if (s) target.add(s);
    }
  }

  // Legado: mesa com operadora_slug e estúdio tipado (junction incompleta no passado).
  for (const m of mesas) {
    const estSlug = m.estudio_slug?.trim();
    if (!estSlug) continue;
    const tipo = tipoPorEstudio.get(estSlug);
    if (!tipo) continue;
    const legado = m.operadora_slug?.trim();
    if (!legado) continue;
    const target = tipo === "network" ? network : dedicada;
    target.add(legado);
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

/**
 * Aba Overview (soma Dedicado + Network) só quando o escopo tem os dois canais.
 * Operadora só Network → Network + Posicionamento; só Dedicado → Dedicado + Posicionamento.
 */
export function podeVerAbaOverviewCatalogo(verAbaDedicado: boolean, verAbaNetwork: boolean): boolean {
  return verAbaDedicado && verAbaNetwork;
}
