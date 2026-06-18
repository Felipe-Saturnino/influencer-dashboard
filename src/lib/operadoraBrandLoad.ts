import { supabase } from "./supabase";
import type { OperadoraBrandSnapshot } from "./operadoraBrandCache";

type OperadoraBrandRow = {
  nome?: string | null;
  brand_action?: string | null;
  brand_contrast?: string | null;
  brand_bg?: string | null;
  brand_text?: string | null;
  logo_url?: string | null;
  font_url?: string | null;
  home_template?: string | null;
};

const inflight = new Map<string, Promise<OperadoraBrandSnapshot | null>>();

export function operadoraBrandSnapshotFromRow(
  slug: string,
  data: OperadoraBrandRow | null | undefined,
): OperadoraBrandSnapshot {
  return {
    slug,
    nome: (data?.nome ?? "").trim() || null,
    brand_action: (data?.brand_action ?? "").trim() || null,
    brand_contrast: (data?.brand_contrast ?? "").trim() || null,
    brand_bg: (data?.brand_bg ?? "").trim() || null,
    brand_text: (data?.brand_text ?? "").trim() || null,
    logo_url: (data?.logo_url ?? "").trim() || null,
    font_url: (data?.font_url ?? "").trim() || null,
    home_template: (data?.home_template ?? "").trim() || null,
  };
}

export function operadoraBrandSnapshotHasVisual(snapshot: OperadoraBrandSnapshot): boolean {
  return !!(
    snapshot.brand_action ||
    snapshot.brand_contrast ||
    snapshot.brand_bg ||
    snapshot.brand_text ||
    snapshot.logo_url
  );
}

export async function fetchOperadoraBrandSnapshot(slug: string): Promise<OperadoraBrandSnapshot | null> {
  if (!slug) return null;
  const pending = inflight.get(slug);
  if (pending) return pending;

  const promise = (async () => {
    const { data } = await supabase
      .from("operadoras")
      .select(
        "nome, brand_action, brand_contrast, brand_bg, brand_text, logo_url, font_url, home_template",
      )
      .eq("slug", slug)
      .single();
    return operadoraBrandSnapshotFromRow(slug, data as OperadoraBrandRow | null);
  })();

  inflight.set(slug, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(slug);
  }
}
