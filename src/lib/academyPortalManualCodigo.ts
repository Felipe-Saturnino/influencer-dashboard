import type { SupabaseClient } from "@supabase/supabase-js";

/** Prefixo de 3 letras da categoria (ex.: Jogos → JOG, Comunicação → COM). Espelha `_academy_portal_manual_code_prefix` no Postgres. */
export function prefixoCodigoManualCategoria(categoria: string): string {
  const base = categoria
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  return base.slice(0, 3).toUpperCase();
}

export async function previewProximoCodigoManual(
  supabase: SupabaseClient,
  categoria: string,
): Promise<string | null> {
  const cat = categoria.trim();
  if (!cat) return null;
  const { data, error } = await supabase.rpc("academy_portal_manual_preview_proximo_codigo", {
    p_categoria: cat,
  });
  if (error) {
    console.error("[previewProximoCodigoManual]", error);
    return null;
  }
  return typeof data === "string" ? data : null;
}

export async function reservarCodigoManual(
  supabase: SupabaseClient,
  categoria: string,
): Promise<{ codigo: string | null; error: string | null }> {
  const cat = categoria.trim();
  if (!cat) return { codigo: null, error: "Categoria inválida para gerar código." };
  const { data, error } = await supabase.rpc("academy_portal_manual_reservar_codigo", {
    p_categoria: cat,
  });
  if (error) {
    console.error("[reservarCodigoManual]", error);
    return { codigo: null, error: "Não foi possível gerar o código do manual." };
  }
  return { codigo: typeof data === "string" ? data : null, error: null };
}
