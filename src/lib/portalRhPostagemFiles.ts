import { supabase } from "./supabase";

export const RH_PORTAL_ASSETS_BUCKET = "rh-portal-assets";

export async function uploadPortalRhAsset(
  file: File,
  pasta: "imagens" | "anexos" | "pdfs",
): Promise<{ path: string; error: string | null }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(RH_PORTAL_ASSETS_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return { path: "", error: error.message };
  return { path, error: null };
}

export async function urlAssinadaPortalRhAsset(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath?.trim()) return null;
  const { data, error } = await supabase.storage.from(RH_PORTAL_ASSETS_BUCKET).createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export {
  abrirAssetAssinadoEmNovaAba,
  ERRO_ABRIR_ASSET_POPUP,
  ERRO_ABRIR_ASSET_URL,
} from "./abrirAssetAssinadoEmNovaAba";
export type { AbrirAssetAssinadoResultado } from "./abrirAssetAssinadoEmNovaAba";
