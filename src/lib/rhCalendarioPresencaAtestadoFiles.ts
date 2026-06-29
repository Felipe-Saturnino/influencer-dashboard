import { supabase } from "./supabase";

export const RH_CALENDARIO_PRESENCA_ATESTADO_BUCKET = "rh-calendario-presenca-atestados";

export const RH_CALENDARIO_PRESENCA_ATESTADO_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/png,image/jpeg,image/webp";

export async function uploadAtestadoPresencaCalendario(
  funcionarioId: string,
  diaIso: string,
  file: File,
): Promise<{ ok: true; storagePath: string; fileName: string } | { ok: false }> {
  const safe = file.name.replace(/[^\w.-]/g, "_").slice(0, 120);
  const path = `${funcionarioId}/${diaIso}/${crypto.randomUUID()}_${safe}`;
  const { error } = await supabase.storage.from(RH_CALENDARIO_PRESENCA_ATESTADO_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    console.error(error);
    return { ok: false };
  }
  return { ok: true, storagePath: path, fileName: file.name };
}
