import { supabase } from "./supabase";
import { fetchAllPages } from "./supabasePaginate";
import type {
  EstudioIncidenteAnexoRow,
  EstudioIncidenteInsert,
  EstudioIncidenteRow,
  IncidenteStaffOption,
  IncidenteTimeAlvo,
} from "./estudioIncidentesTypes";
import { orgTimeEhGpOuShuffler, orgTimeElegivelFormIncidente } from "./estudioIncidentesHelpers";
import {
  ESTUDIO_INCIDENTES_ANEXO_MAX_BYTES,
  ESTUDIO_INCIDENTES_STORAGE_BUCKET,
} from "./estudioIncidentesTypes";
import { sanitizeStorageFileName } from "./rhVagaCandidaturaFiles";

const INCIDENTE_SELECT =
  "id, protocolo, ocorrido_em, time_alvo, prestador_id, prestador_nome, mesa_id, mesa_label, estudio_slug, jogo, incidente, tipo, id_rodada, data_rodada, hora_rodada, local_mesa, resolucao, payout_necessario, descricao, relator_user_id, relator_nome, created_by, created_at, updated_at";

export async function fetchEstudioIncidentesPeriodo(opts: {
  dataIni: string;
  dataFim: string;
}): Promise<EstudioIncidenteRow[]> {
  const ini = `${opts.dataIni}T00:00:00.000Z`;
  const fim = `${opts.dataFim}T23:59:59.999Z`;
  return fetchAllPages<EstudioIncidenteRow>(async (from, to) =>
    supabase
      .from("estudio_incidentes")
      .select(INCIDENTE_SELECT)
      .gte("ocorrido_em", ini)
      .lte("ocorrido_em", fim)
      .order("ocorrido_em", { ascending: false })
      .range(from, to),
  );
}

/** Incidentes de um prestador no período, filtrados por `data_rodada` (alinhado ao dia operacional). */
export async function fetchEstudioIncidentesPrestadorPeriodo(opts: {
  prestadorId: string;
  dataIni: string;
  dataFim: string;
}): Promise<EstudioIncidenteRow[]> {
  return fetchAllPages<EstudioIncidenteRow>(async (from, to) =>
    supabase
      .from("estudio_incidentes")
      .select(INCIDENTE_SELECT)
      .eq("prestador_id", opts.prestadorId)
      .gte("data_rodada", opts.dataIni)
      .lte("data_rodada", opts.dataFim)
      .order("data_rodada", { ascending: false })
      .range(from, to),
  );
}

export async function fetchEstudioIncidenteAnexos(
  incidenteId: string,
): Promise<EstudioIncidenteAnexoRow[]> {
  const { data, error } = await supabase
    .from("estudio_incidente_anexos")
    .select("id, incidente_id, storage_path, file_name, content_type, file_size, created_at")
    .eq("incidente_id", incidenteId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[Incidentes] anexos:", error);
    return [];
  }
  return (data ?? []) as EstudioIncidenteAnexoRow[];
}

export async function insertEstudioIncidente(
  row: EstudioIncidenteInsert,
): Promise<{ data: EstudioIncidenteRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("estudio_incidentes")
    .insert(row)
    .select(INCIDENTE_SELECT)
    .maybeSingle();
  if (error) {
    console.error("[Incidentes] insert:", error);
    return {
      data: null,
      error: "Não foi possível registrar o incidente. Se o problema persistir, entre em contato com o suporte.",
    };
  }
  return { data: data as EstudioIncidenteRow, error: null };
}

export async function uploadEstudioIncidenteAnexos(
  incidenteId: string,
  files: File[],
): Promise<{ ok: boolean; error: string | null }> {
  for (const file of files) {
    if (file.size > ESTUDIO_INCIDENTES_ANEXO_MAX_BYTES) {
      return {
        ok: false,
        error: "Um ou mais anexos excedem o tamanho máximo de 10 MB.",
      };
    }
    const safe = sanitizeStorageFileName(file.name);
    const path = `${incidenteId}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from(ESTUDIO_INCIDENTES_STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) {
      console.error("[Incidentes] upload:", upErr);
      return {
        ok: false,
        error: "Não foi possível enviar o anexo. Se o problema persistir, entre em contato com o suporte.",
      };
    }
    const { error: insErr } = await supabase.from("estudio_incidente_anexos").insert({
      incidente_id: incidenteId,
      storage_path: path,
      file_name: file.name,
      content_type: file.type || null,
      file_size: file.size,
    });
    if (insErr) {
      console.error("[Incidentes] anexo meta:", insErr);
      return {
        ok: false,
        error: "Não foi possível salvar o anexo. Se o problema persistir, entre em contato com o suporte.",
      };
    }
  }
  return { ok: true, error: null };
}

export async function urlAssinadaAnexoIncidente(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ESTUDIO_INCIDENTES_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error) {
    console.error("[Incidentes] signed url:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

type FuncionarioTimeRow = {
  id: string;
  nome: string;
  status: string;
  org_time_id: string | null;
  rh_org_times: { id: string; nome: string; status: string } | { id: string; nome: string; status: string }[] | null;
};

function unwrapTime(
  embed: FuncionarioTimeRow["rh_org_times"],
): { id: string; nome: string; status: string } | null {
  if (!embed) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

/** Prestadores ativos/indisponíveis de times GP e Shuffler (filtro da barra). */
export async function fetchStaffFiltroIncidentes(): Promise<IncidenteStaffOption[]> {
  const { data, error } = await supabase
    .from("rh_funcionarios")
    .select("id, nome, status, org_time_id, rh_org_times(id, nome, status)")
    .in("status", ["ativo", "indisponivel"])
    .not("org_time_id", "is", null)
    .order("nome");
  if (error) {
    console.error("[Incidentes] staff filtro:", error);
    return [];
  }
  const out: IncidenteStaffOption[] = [];
  for (const raw of (data ?? []) as FuncionarioTimeRow[]) {
    const t = unwrapTime(raw.rh_org_times);
    if (!t || t.status !== "ativo") continue;
    const key = orgTimeEhGpOuShuffler(t.nome);
    if (!key) continue;
    out.push({
      id: raw.id,
      nome: raw.nome,
      timeKey: key,
      papel: key === "gp" ? "Game Presenter" : "Shuffler",
      orgTimeNome: t.nome,
    });
  }
  return out;
}

/** Prestadores para o formulário (GP ou Shuffler + SM/SL/PC/Academy do mesmo eixo). */
export async function fetchStaffFormIncidente(
  timeAlvo: IncidenteTimeAlvo,
): Promise<IncidenteStaffOption[]> {
  const { data, error } = await supabase
    .from("rh_funcionarios")
    .select("id, nome, status, org_time_id, rh_org_times(id, nome, status)")
    .in("status", ["ativo", "indisponivel"])
    .not("org_time_id", "is", null)
    .order("nome");
  if (error) {
    console.error("[Incidentes] staff form:", error);
    return [];
  }
  const out: IncidenteStaffOption[] = [];
  for (const raw of (data ?? []) as FuncionarioTimeRow[]) {
    const t = unwrapTime(raw.rh_org_times);
    if (!t || t.status !== "ativo") continue;
    const elig = orgTimeElegivelFormIncidente(timeAlvo, t.nome);
    if (!elig.ok) continue;
    // SM/SL/PC/Academy: aceitar no form do time selecionado (mesmo pool)
    const key: IncidenteTimeAlvo =
      orgTimeEhGpOuShuffler(t.nome) ?? timeAlvo;
    out.push({
      id: raw.id,
      nome: raw.nome,
      timeKey: key,
      papel: elig.papel,
      orgTimeNome: t.nome,
    });
  }
  return out;
}
