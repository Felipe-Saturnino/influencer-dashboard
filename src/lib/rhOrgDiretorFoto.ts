import { supabase } from "./supabase";

export const RH_ORG_DIRETOR_FOTOS_BUCKET = "rh-org-diretor-fotos";

/** Upload da foto do diretor; path `{diretoriaId}/{uuid}_{safeName}`. */
export async function uploadDiretorFotoDiretoria(
  diretoriaId: string,
  file: File,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const safe = file.name.replace(/[^\w.-]/g, "_").slice(0, 120);
  const path = `${diretoriaId}/${crypto.randomUUID()}_${safe}`;
  const { error } = await supabase.storage.from(RH_ORG_DIRETOR_FOTOS_BUCKET).upload(path, file, { upsert: false });
  if (error) return { ok: false, message: error.message };
  const { data: pub } = supabase.storage.from(RH_ORG_DIRETOR_FOTOS_BUCKET).getPublicUrl(path);
  return { ok: true, publicUrl: pub.publicUrl };
}
