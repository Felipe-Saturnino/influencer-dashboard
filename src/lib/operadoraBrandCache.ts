/** Snapshot persistido do brandguide da operadora (perfil operador). */
export type OperadoraBrandSnapshot = {
  slug: string;
  nome: string | null;
  brand_action: string | null;
  brand_contrast: string | null;
  brand_bg: string | null;
  brand_text: string | null;
  logo_url: string | null;
  font_url: string | null;
  home_template: string | null;
};

const CACHE_VERSION = "v1";

function cacheKey(slug: string): string {
  return `spin-operadora-brand:${CACHE_VERSION}:${slug}`;
}

export function readOperadoraBrandCache(slug: string): OperadoraBrandSnapshot | null {
  if (!slug) return null;
  try {
    const raw = localStorage.getItem(cacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OperadoraBrandSnapshot;
    if (parsed?.slug !== slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOperadoraBrandCache(snapshot: OperadoraBrandSnapshot): void {
  if (!snapshot.slug) return;
  try {
    localStorage.setItem(cacheKey(snapshot.slug), JSON.stringify(snapshot));
  } catch {
    /* quota / modo privado — ignorar */
  }
}

export function clearOperadoraBrandCache(slug?: string): void {
  try {
    if (slug) {
      localStorage.removeItem(cacheKey(slug));
      return;
    }
    const prefix = `spin-operadora-brand:${CACHE_VERSION}:`;
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) localStorage.removeItem(k);
    }
  } catch {
    /* ignorar */
  }
}
