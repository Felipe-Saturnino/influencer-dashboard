import { supabase } from "./supabase";
import {
  RH_PRESTADOR_SELF_MEDIA_BUCKET,
  type RhPrestadorDocumentoCategoria,
} from "./rhPrestadorDocumentosCadastro";
import { sanitizeStorageFileName } from "./rhVagaCandidaturaFiles";
import type { RhFuncionarioSelfMedia } from "../types/rhFuncionario";

export async function listarDocumentosPrestador(
  funcionarioId: string,
): Promise<{ rows: RhFuncionarioSelfMedia[]; error: string | null }> {
  const { data, error } = await supabase
    .from("rh_funcionario_self_media")
    .select("*")
    .eq("rh_funcionario_id", funcionarioId)
    .eq("kind", "documento")
    .order("created_at", { ascending: false });
  if (error) {
    return {
      rows: [],
      error: "Não foi possível carregar os documentos. Se o problema persistir, entre em contato com o suporte.",
    };
  }
  return { rows: (data ?? []) as RhFuncionarioSelfMedia[], error: null };
}

export async function urlsAssinadasDocumentosPrestador(
  rows: RhFuncionarioSelfMedia[],
  expiresSec = 7200,
): Promise<Record<string, string>> {
  const next: Record<string, string> = {};
  for (const m of rows) {
    const { data } = await supabase.storage
      .from(RH_PRESTADOR_SELF_MEDIA_BUCKET)
      .createSignedUrl(m.storage_path, expiresSec);
    if (data?.signedUrl) next[m.id] = data.signedUrl;
  }
  return next;
}

export async function uploadDocumentoPrestador(opts: {
  funcionarioId: string;
  categoria: RhPrestadorDocumentoCategoria;
  file: File;
}): Promise<{ ok: true; row: RhFuncionarioSelfMedia } | { ok: false; message: string }> {
  const path = `${opts.funcionarioId}/${opts.categoria}/${crypto.randomUUID()}_${sanitizeStorageFileName(opts.file.name)}`;
  const { error: upErr } = await supabase.storage.from(RH_PRESTADOR_SELF_MEDIA_BUCKET).upload(path, opts.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: opts.file.type || undefined,
  });
  if (upErr) {
    return {
      ok: false,
      message: "Não foi possível enviar o documento. Se o problema persistir, entre em contato com o suporte.",
    };
  }

  const { data, error: insErr } = await supabase
    .from("rh_funcionario_self_media")
    .insert({
      rh_funcionario_id: opts.funcionarioId,
      kind: "documento",
      document_category: opts.categoria,
      storage_path: path,
      file_name: opts.file.name,
      mime_type: opts.file.type || null,
    })
    .select("*")
    .single();

  if (insErr || !data) {
    await supabase.storage.from(RH_PRESTADOR_SELF_MEDIA_BUCKET).remove([path]);
    return {
      ok: false,
      message: "Não foi possível registrar o documento. Se o problema persistir, entre em contato com o suporte.",
    };
  }

  return { ok: true, row: data as RhFuncionarioSelfMedia };
}

export async function excluirDocumentoPrestador(
  row: RhFuncionarioSelfMedia,
): Promise<{ ok: boolean; message?: string }> {
  const { error: delErr } = await supabase.from("rh_funcionario_self_media").delete().eq("id", row.id);
  if (delErr) {
    return {
      ok: false,
      message: "Não foi possível excluir o documento. Se o problema persistir, entre em contato com o suporte.",
    };
  }
  await supabase.storage.from(RH_PRESTADOR_SELF_MEDIA_BUCKET).remove([row.storage_path]);
  return { ok: true };
}
