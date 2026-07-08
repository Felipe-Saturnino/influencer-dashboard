import { supabase } from "./supabase";
import type { CsChamadoEmailAnexo } from "../types/csAtendimento";

/** Bucket previsto para anexos de chamados E-mail (integração Outlook). */
export const CS_ATENDIMENTO_EMAIL_BUCKET = "cs-atendimento-email";

export async function urlAnexoCsChamadoEmail(anexo: CsChamadoEmailAnexo): Promise<string | null> {
  const direta = anexo.url?.trim();
  if (direta) return direta;

  const path = anexo.storage_path?.trim();
  if (!path) return null;

  const { data, error } = await supabase.storage.from(CS_ATENDIMENTO_EMAIL_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    console.error("[csAtendimentoEmailFiles] signed url", error);
    return null;
  }
  return data.signedUrl;
}

export async function abrirAnexoCsChamadoEmail(anexo: CsChamadoEmailAnexo): Promise<boolean> {
  const url = await urlAnexoCsChamadoEmail(anexo);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export async function baixarAnexoCsChamadoEmail(anexo: CsChamadoEmailAnexo): Promise<boolean> {
  const url = await urlAnexoCsChamadoEmail(anexo);
  if (!url) return false;
  const link = document.createElement("a");
  link.href = url;
  link.download = anexo.nome?.trim() || "anexo";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.click();
  return true;
}
