/**
 * Edge Function: purge-academy-performance-hub-videos
 *
 * Retenção dos vídeos do Performance Hub. Duas varreduras por execução:
 *   1. Avaliações concluídas há mais de N dias (default 90) — apaga o arquivo do
 *      Storage, limpa video_url e marca video_removido_em. video_nome permanece.
 *   2. Órfãos — arquivos no bucket que nenhuma avaliação referencia (troca de vídeo,
 *      upload que não chegou a ser salvo). Só entram os criados há mais de 24 h,
 *      para não competir com um envio em andamento.
 *
 * Chamada pelo cron semanal (pg_cron) com a service role key. Aceita corpo opcional:
 *   { "dry_run": true, "dias": 90 }
 *
 * Ficheiro único no painel Supabase: `index.ts`.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "academy-performance-hub-videos";
const TABELA = "academy_performance_hub_avaliacao";
const TECH_LOG_TIPO = "academy_performance_hub_video_retencao";

const RETENCAO_DIAS_DEFAULT = 90;
/** Carência para não apagar arquivo de um envio ainda em curso. */
const ORFAO_IDADE_MINIMA_HORAS = 24;
const PAGINA_STORAGE = 1000;
const PAGINA_TABELA = 1000;
const LOTE_REMOCAO = 100;

type SupabaseAdmin = ReturnType<typeof createClient>;

type StorageEntry = {
  name: string;
  id: string | null;
  created_at: string | null;
};

type ArquivoStorage = {
  path: string;
  criadoEm: string | null;
};

type AvaliacaoParaPurgar = {
  id: string;
  video_url: string | null;
};

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: Record<string, unknown>, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

/** `video_url` guarda path do Storage; URL http(s) legada ou blob: não é apagável aqui. */
function isStoragePath(value: string | null | undefined): boolean {
  const v = value?.trim();
  if (!v) return false;
  return !v.startsWith("blob:") && !v.startsWith("http://") && !v.startsWith("https://");
}

async function listarArquivos(
  supabase: SupabaseAdmin,
  prefix: string,
  out: ArquivoStorage[],
): Promise<void> {
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: PAGINA_STORAGE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;

    const entries = (data ?? []) as StorageEntry[];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Pasta: o Storage devolve id nulo.
      if (entry.id === null) await listarArquivos(supabase, path, out);
      else out.push({ path, criadoEm: entry.created_at });
    }

    if (entries.length < PAGINA_STORAGE) break;
    offset += PAGINA_STORAGE;
  }
}

/** Todos os paths ainda referenciados por alguma avaliação. */
async function pathsReferenciados(supabase: SupabaseAdmin): Promise<Set<string>> {
  const referenciados = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(TABELA)
      .select("video_url")
      .not("video_url", "is", null)
      .range(from, from + PAGINA_TABELA - 1);
    if (error) throw error;

    const rows = (data ?? []) as { video_url: string | null }[];
    for (const row of rows) {
      const v = row.video_url?.trim();
      if (v && isStoragePath(v)) referenciados.add(v);
    }

    if (rows.length < PAGINA_TABELA) break;
    from += PAGINA_TABELA;
  }
  return referenciados;
}

async function apagarEmLotes(
  supabase: SupabaseAdmin,
  paths: string[],
): Promise<{ removidos: number; falhas: number }> {
  let removidos = 0;
  let falhas = 0;
  for (let i = 0; i < paths.length; i += LOTE_REMOCAO) {
    const lote = paths.slice(i, i + LOTE_REMOCAO);
    const { data, error } = await supabase.storage.from(BUCKET).remove(lote);
    if (error) {
      console.error("[purge-academy-performance-hub-videos] remove:", error);
      falhas += lote.length;
      continue;
    }
    removidos += (data ?? []).length;
  }
  return { removidos, falhas };
}

/** Varredura 1 — avaliações concluídas fora do prazo de retenção. */
async function purgarPorRetencao(
  supabase: SupabaseAdmin,
  dias: number,
  dryRun: boolean,
): Promise<{ avaliacoes: number; arquivosRemovidos: number; falhas: number }> {
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from(TABELA)
    .select("id, video_url")
    .eq("status", "aprovado")
    .not("video_url", "is", null)
    .is("video_removido_em", null)
    .lt("concluida_em", corte)
    .order("concluida_em", { ascending: true })
    .limit(PAGINA_TABELA);
  if (error) throw error;

  const rows = (data ?? []) as AvaliacaoParaPurgar[];
  if (rows.length === 0) return { avaliacoes: 0, arquivosRemovidos: 0, falhas: 0 };

  const paths = rows.map((r) => r.video_url?.trim() ?? "").filter((p) => isStoragePath(p));

  if (dryRun) {
    return { avaliacoes: rows.length, arquivosRemovidos: paths.length, falhas: 0 };
  }

  const { removidos, falhas } = paths.length
    ? await apagarEmLotes(supabase, paths)
    : { removidos: 0, falhas: 0 };

  // A referência sai da avaliação mesmo quando o arquivo já não existe no Storage:
  // manter video_url apontando para algo inexistente só geraria erro ao assistir.
  const ids = rows.map((r) => r.id);
  const { error: updateError } = await supabase
    .from(TABELA)
    .update({ video_url: null, video_removido_em: new Date().toISOString() })
    .in("id", ids);
  if (updateError) throw updateError;

  return { avaliacoes: ids.length, arquivosRemovidos: removidos, falhas };
}

/** Varredura 2 — arquivos sem avaliação que os referencie. */
async function purgarOrfaos(
  supabase: SupabaseAdmin,
  dryRun: boolean,
): Promise<{ encontrados: number; removidos: number; falhas: number }> {
  const arquivos: ArquivoStorage[] = [];
  await listarArquivos(supabase, "", arquivos);
  if (arquivos.length === 0) return { encontrados: 0, removidos: 0, falhas: 0 };

  const referenciados = await pathsReferenciados(supabase);
  const limiteIdade = Date.now() - ORFAO_IDADE_MINIMA_HORAS * 60 * 60 * 1000;

  const orfaos = arquivos
    .filter((a) => !referenciados.has(a.path))
    .filter((a) => {
      if (!a.criadoEm) return true;
      const criado = new Date(a.criadoEm).getTime();
      return Number.isNaN(criado) ? true : criado < limiteIdade;
    })
    .map((a) => a.path);

  if (orfaos.length === 0) return { encontrados: 0, removidos: 0, falhas: 0 };
  if (dryRun) return { encontrados: orfaos.length, removidos: 0, falhas: 0 };

  const { removidos, falhas } = await apagarEmLotes(supabase, orfaos);
  return { encontrados: orfaos.length, removidos, falhas };
}

async function registrarTechLog(supabase: SupabaseAdmin, descricao: string): Promise<void> {
  try {
    await supabase.from("tech_logs").insert({
      integracao_slug: null,
      tipo: TECH_LOG_TIPO,
      descricao: descricao.slice(0, 2000),
    });
  } catch (e) {
    console.warn("[purge-academy-performance-hub-videos] Falha ao gravar tech_log:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, req, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!serviceRoleKey || !supabaseUrl) {
    console.error("[purge-academy-performance-hub-videos] Secrets ausentes.");
    return json({ error: "Configuração indisponível." }, req, 500);
  }

  // Execução restrita ao cron / operação com service role.
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (bearer !== serviceRoleKey) {
    return json({ error: "Não autorizado." }, req, 401);
  }

  let dryRun = false;
  let dias = RETENCAO_DIAS_DEFAULT;
  try {
    const body = (await req.json()) as { dry_run?: boolean; dias?: number } | null;
    dryRun = body?.dry_run === true;
    if (typeof body?.dias === "number" && body.dias >= 1) dias = Math.floor(body.dias);
  } catch {
    // Corpo vazio é o caso normal do cron.
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const retencao = await purgarPorRetencao(supabase, dias, dryRun);
    const orfaos = await purgarOrfaos(supabase, dryRun);

    const resumo =
      `retenção ${dias}d${dryRun ? " (simulação)" : ""}: ` +
      `${retencao.avaliacoes} avaliação(ões), ${retencao.arquivosRemovidos} arquivo(s); ` +
      `órfãos: ${orfaos.encontrados} encontrado(s), ${orfaos.removidos} removido(s)`;

    const houveTrabalho = retencao.avaliacoes > 0 || orfaos.encontrados > 0;
    const houveFalha = retencao.falhas > 0 || orfaos.falhas > 0;
    if (houveTrabalho || houveFalha) {
      await registrarTechLog(
        supabase,
        houveFalha ? `[falhas] ${resumo}` : resumo,
      );
    }

    return json({ ok: true, dry_run: dryRun, dias, retencao, orfaos }, req);
  } catch (e) {
    console.error("[purge-academy-performance-hub-videos] Erro:", e);
    await registrarTechLog(supabase, `[exceção] ${String(e)}`);
    return json({ ok: false, error: String(e) }, req, 500);
  }
});
