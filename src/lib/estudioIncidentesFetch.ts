import { supabase } from "./supabase";
import { fetchAllPages, fetchInBatched } from "./supabasePaginate";
import type {
  EstudioIncidenteAnexoRow,
  EstudioIncidenteInsert,
  EstudioIncidenteRow,
  EstudioIncidenteUpdate,
  IncidenteStaffOption,
  IncidenteTimeAlvo,
} from "./estudioIncidentesTypes";
import { orgTimeEhGpOuShuffler } from "./estudioIncidentesHelpers";
import {
  ESTUDIO_INCIDENTES_ANEXO_MAX_BYTES,
  ESTUDIO_INCIDENTES_STORAGE_BUCKET,
} from "./estudioIncidentesTypes";
import { sanitizeStorageFileName } from "./rhVagaCandidaturaFiles";
import { fimDiaBrasilUtcIso, inicioDiaBrasilUtcIso } from "./dateBrasil";

const INCIDENTE_SELECT =
  "id, protocolo, ocorrido_em, time_alvo, prestador_id, prestador_nome, mesa_id, mesa_label, estudio_slug, jogo, incidente, tipo, id_rodada, data_rodada, hora_rodada, local_mesa, resolucao, payout_necessario, descricao, relator_user_id, relator_nome, created_by, created_at, updated_at";

/** Lista da página Incidentes — período pelo momento do registro (`created_at`), dias civis America/Sao_Paulo. */
export async function fetchEstudioIncidentesPeriodo(opts: {
  dataIni: string;
  dataFim: string;
}): Promise<EstudioIncidenteRow[]> {
  const ini = inicioDiaBrasilUtcIso(opts.dataIni);
  const fim = fimDiaBrasilUtcIso(opts.dataFim);
  return fetchAllPages<EstudioIncidenteRow>(async (from, to) =>
    supabase
      .from("estudio_incidentes")
      .select(INCIDENTE_SELECT)
      .gte("created_at", ini)
      .lte("created_at", fim)
      .order("created_at", { ascending: false })
      .range(from, to),
  );
}

/** Incidentes no período por `data_rodada` (sem filtro de prestador) — Overview Prestador OCR. */
export async function fetchEstudioIncidentesPorDataRodada(opts: {
  dataIni: string;
  dataFim: string;
}): Promise<EstudioIncidenteRow[]> {
  return fetchAllPages<EstudioIncidenteRow>(async (from, to) =>
    supabase
      .from("estudio_incidentes")
      .select(INCIDENTE_SELECT)
      .gte("data_rodada", opts.dataIni)
      .lte("data_rodada", opts.dataFim)
      .order("data_rodada", { ascending: false })
      .range(from, to),
  );
}

/** Incidentes de um prestador no período, filtrados por `data_rodada` (alinhado ao dia operacional). */
export async function fetchEstudioIncidentesPrestadorPeriodo(opts: {
  prestadorId: string;
  dataIni: string;
  dataFim: string;
}): Promise<EstudioIncidenteRow[]> {
  return fetchEstudioIncidentesPrestadoresPeriodo({
    prestadorIds: [opts.prestadorId],
    dataIni: opts.dataIni,
    dataFim: opts.dataFim,
  });
}

/** Tamanho seguro de lote para `.in("prestador_id", …)` em estudio_incidentes. */
const ESTUDIO_INCIDENTES_PRESTADOR_IN_CHUNK = 80;

/** Incidentes de vários prestadores no período (`data_rodada`). */
export async function fetchEstudioIncidentesPrestadoresPeriodo(opts: {
  prestadorIds: string[];
  dataIni: string;
  dataFim: string;
}): Promise<EstudioIncidenteRow[]> {
  const ids = [...new Set(opts.prestadorIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  return fetchInBatched(ids, ESTUDIO_INCIDENTES_PRESTADOR_IN_CHUNK, async (slice) =>
    fetchAllPages<EstudioIncidenteRow>(async (from, to) =>
      supabase
        .from("estudio_incidentes")
        .select(INCIDENTE_SELECT)
        .in("prestador_id", slice)
        .gte("data_rodada", opts.dataIni)
        .lte("data_rodada", opts.dataFim)
        .order("data_rodada", { ascending: false })
        .range(from, to),
    ),
    2,
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

export async function updateEstudioIncidente(
  id: string,
  patch: EstudioIncidenteUpdate,
): Promise<{ data: EstudioIncidenteRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("estudio_incidentes")
    .update(patch)
    .eq("id", id)
    .select(INCIDENTE_SELECT)
    .maybeSingle();
  if (error) {
    console.error("[Incidentes] update:", error);
    return {
      data: null,
      error: "Não foi possível salvar o incidente. Se o problema persistir, entre em contato com o suporte.",
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
        error: "Um ou mais anexos excedem o tamanho máximo de 50 MB.",
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

type OrgTimeAtivo = { id: string; nome: string };

/**
 * Times ativos GP/Shuffler do organograma — mesma fonte conceitual da Gestão de Staff
 * (`org_time_id` em `rh_funcionarios`), sem depender de embed PostgREST.
 */
async function fetchOrgTimesGpShuffler(): Promise<OrgTimeAtivo[]> {
  const { data, error } = await supabase
    .from("rh_org_times")
    .select("id, nome, status")
    .eq("status", "ativo")
    .order("nome");
  if (error) {
    console.error("[Incidentes] org times:", error);
    return [];
  }
  const out: OrgTimeAtivo[] = [];
  for (const raw of data ?? []) {
    const row = raw as { id: string; nome: string; status: string };
    if (!orgTimeEhGpOuShuffler(row.nome)) continue;
    out.push({ id: row.id, nome: row.nome });
  }
  return out;
}

async function fetchFuncionariosPorOrgTimes(
  times: OrgTimeAtivo[],
  timeAlvo?: IncidenteTimeAlvo,
): Promise<IncidenteStaffOption[]> {
  const filtrados = timeAlvo
    ? times.filter((t) => orgTimeEhGpOuShuffler(t.nome) === timeAlvo)
    : times;
  if (filtrados.length === 0) return [];

  const byId = new Map(filtrados.map((t) => [t.id, t]));
  const timeIds = filtrados.map((t) => t.id);

  const { data, error } = await supabase
    .from("rh_funcionarios")
    .select("id, nome, staff_nickname, status, org_time_id")
    .in("org_time_id", timeIds)
    .in("status", ["ativo", "indisponivel"])
    .order("nome");
  if (error) {
    console.error("[Incidentes] staff por time:", error);
    return [];
  }

  const out: IncidenteStaffOption[] = [];
  for (const raw of data ?? []) {
    const row = raw as {
      id: string;
      nome: string;
      staff_nickname: string | null;
      org_time_id: string | null;
    };
    if (!row.org_time_id) continue;
    const t = byId.get(row.org_time_id);
    if (!t) continue;
    const key = orgTimeEhGpOuShuffler(t.nome);
    if (!key) continue;
    if (timeAlvo && key !== timeAlvo) continue;
    out.push({
      id: row.id,
      nome: row.nome,
      nickname: (row.staff_nickname ?? "").trim() || null,
      timeKey: key,
      papel: key === "gp" ? "Game Presenter" : "Shuffler",
      orgTimeNome: t.nome,
    });
  }
  return out;
}

/** Prestadores ativos/indisponíveis de times GP e Shuffler (filtro da barra). */
export async function fetchStaffFiltroIncidentes(): Promise<IncidenteStaffOption[]> {
  const times = await fetchOrgTimesGpShuffler();
  return fetchFuncionariosPorOrgTimes(times);
}

/**
 * Prestadores do formulário Novo Incidente — mesmo universo da Gestão de Staff
 * para o time selecionado (Game Presenter ou Shuffler).
 */
export async function fetchStaffFormIncidente(
  timeAlvo: IncidenteTimeAlvo,
): Promise<IncidenteStaffOption[]> {
  const times = await fetchOrgTimesGpShuffler();
  return fetchFuncionariosPorOrgTimes(times, timeAlvo);
}

/**
 * Nickname de Gestão de Staff (`staff_nickname`) por `profiles.id` do relator.
 * Resolve via e-mail de login (e-mail / e-mail Spin) → `rh_funcionarios`.
 */
export async function fetchNicknameStaffPorProfileIds(
  profileIds: string[],
): Promise<Record<string, string>> {
  const ids = [...new Set(profileIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return {};

  const { data: profs, error: errProfs } = await supabase.from("profiles").select("id, email").in("id", ids);
  if (errProfs) {
    console.error("[Incidentes] profiles relator:", errProfs);
    return {};
  }

  type ProfRow = { id: string; email: string | null };
  const emailLcToProfileIds = new Map<string, string[]>();
  const emailsOriginais: string[] = [];
  for (const raw of (profs ?? []) as ProfRow[]) {
    const em = (raw.email ?? "").trim();
    if (!em) continue;
    const lc = em.toLowerCase();
    const list = emailLcToProfileIds.get(lc) ?? [];
    list.push(raw.id);
    emailLcToProfileIds.set(lc, list);
    emailsOriginais.push(em);
  }
  const emailsUnicos = [...new Set(emailsOriginais)];
  if (emailsUnicos.length === 0) return {};

  type FuncNickRow = { email: string | null; email_spin: string | null; staff_nickname: string | null };
  const nickByEmailLc = new Map<string, string>();

  await fetchInBatched(emailsUnicos, 80, async (slice) => {
    const [byEmail, bySpin] = await Promise.all([
      supabase
        .from("rh_funcionarios")
        .select("email, email_spin, staff_nickname")
        .in("status", ["ativo", "indisponivel"])
        .in("email", slice),
      supabase
        .from("rh_funcionarios")
        .select("email, email_spin, staff_nickname")
        .in("status", ["ativo", "indisponivel"])
        .in("email_spin", slice),
    ]);
    if (byEmail.error) console.error("[Incidentes] nickname por email:", byEmail.error);
    if (bySpin.error) console.error("[Incidentes] nickname por email_spin:", bySpin.error);
    for (const raw of [...(byEmail.data ?? []), ...(bySpin.data ?? [])] as FuncNickRow[]) {
      const nick = (raw.staff_nickname ?? "").trim();
      if (!nick) continue;
      const e1 = (raw.email ?? "").trim().toLowerCase();
      const e2 = (raw.email_spin ?? "").trim().toLowerCase();
      if (e1) nickByEmailLc.set(e1, nick);
      if (e2) nickByEmailLc.set(e2, nick);
    }
    return [];
  });

  const out: Record<string, string> = {};
  for (const [emailLc, profileIdsForEmail] of emailLcToProfileIds) {
    const nick = nickByEmailLc.get(emailLc);
    if (!nick) continue;
    for (const pid of profileIdsForEmail) out[pid] = nick;
  }
  return out;
}

/** Nickname de Gestão de Staff do login atual (para gravar em `relator_nome`). */
export async function fetchNicknameStaffDoLogin(
  emailRaw: string | null | undefined,
): Promise<string | null> {
  const email = emailRaw?.trim();
  if (!email) return null;
  const emailLc = email.toLowerCase();
  const [byEmail, bySpin] = await Promise.all([
    supabase
      .from("rh_funcionarios")
      .select("email, email_spin, staff_nickname")
      .ilike("email", email)
      .in("status", ["ativo", "indisponivel"]),
    supabase
      .from("rh_funcionarios")
      .select("email, email_spin, staff_nickname")
      .not("email_spin", "is", null)
      .ilike("email_spin", email)
      .in("status", ["ativo", "indisponivel"]),
  ]);
  if (byEmail.error || bySpin.error) return null;
  type Row = { email: string | null; email_spin: string | null; staff_nickname: string | null };
  const rows = [...(byEmail.data ?? []), ...(bySpin.data ?? [])] as Row[];
  for (const r of rows) {
    const em = (r.email ?? "").trim().toLowerCase();
    const sp = (r.email_spin ?? "").trim().toLowerCase();
    if (em !== emailLc && sp !== emailLc) continue;
    const nick = (r.staff_nickname ?? "").trim();
    if (nick) return nick;
  }
  return null;
}
