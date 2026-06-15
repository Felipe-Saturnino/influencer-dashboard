import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Edge Function: sync-comercial-spa-lista
 * Importa CSV oficial SPA/MF → comercial_empresas + comercial_marcas.
 * Não altera status_pipeline, status_folha, comercial_user_id, status_dominio.
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: COMERCIAL_SPA_CSV_URL — URL direta do CSV (senão descobre na página gov.br)
 * Opcional: COMERCIAL_SPA_LISTA_PAGE_URL — página de listagem (default gov.br)
 *
 * POST JSON: { dry_run?: boolean, force?: boolean, csv_url?: string }
 *
 * Deploy no painel Supabase: um único ficheiro index.ts (sem imports locais).
 * Parser espelhado em src/lib/comercialSpaCsvParser.ts para testes locais.
 */

// --- Parser CSV SPA/MF (inline — não extrair para outro ficheiro no deploy) ---

interface ParsedMarca {
  nome: string;
  dominio: string | null;
}

interface ParsedEmpresaBloco {
  cnpj: string;
  razao_social: string;
  portaria: string | null;
  portaria_retificacoes: string[];
  requerimento_numero: string | null;
  requerimento_ano: string | null;
  marcas: ParsedMarca[];
}

function parseCsvSemicolon(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ";") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
      continue;
    }
    field += c;
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }

  return rows;
}

function normalizeCnpj(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function csvCol(row: string[], idx: number): string {
  return (row[idx] ?? "").trim();
}

function normalizeNomeMarca(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function normalizeDominio(raw: string): string | null {
  const v = raw.replace(/\s+/g, " ").trim().toLowerCase();
  if (!v || v === "a definir" || v === "a definir." || v === "-") return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return null;
}

function splitRequerimento(raw: string): { numero: string | null; ano: string | null } {
  const v = raw.trim();
  if (!v) return { numero: null, ano: null };
  const parts = v.split("/").map((p) => p.trim());
  if (parts.length >= 2) {
    return { numero: parts[0] || null, ano: parts[1] || null };
  }
  return { numero: v, ano: null };
}

function isPortariaPrincipal(col1: string): boolean {
  return /^SPA\/MF/i.test(col1.trim());
}

function isLinhaRetificacao(col1: string): boolean {
  const t = col1.trim();
  if (!t) return false;
  if (isPortariaPrincipal(t)) return false;
  return (
    /^\(/.test(t) ||
    /retificad/i.test(t) ||
    /alterad/i.test(t) ||
    /portaria spa/i.test(t)
  );
}

function extractMarca(row: string[]): ParsedMarca | null {
  const nomeRaw = csvCol(row, 4);
  const dominioRaw = csvCol(row, 5);
  const nome = normalizeNomeMarca(nomeRaw);
  const dominio = normalizeDominio(dominioRaw);
  if (!nome && !dominio) return null;
  if (!nome) return null;
  return { nome, dominio };
}

function findHeaderIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const joined = rows[i].join(";").toUpperCase();
    if (joined.includes("CNPJ") && joined.includes("MARCAS")) return i;
  }
  return 1;
}

function parseSpaAutorizacoesCsv(text: string): ParsedEmpresaBloco[] {
  const rows = parseCsvSemicolon(text.replace(/^\uFEFF/, ""));
  const headerIdx = findHeaderIndex(rows);
  const dataRows = rows.slice(headerIdx + 1);

  const blocos: ParsedEmpresaBloco[] = [];
  let current: ParsedEmpresaBloco | null = null;

  for (const row of dataRows) {
    const cnpjRaw = csvCol(row, 3);
    const cnpj = cnpjRaw ? normalizeCnpj(cnpjRaw) : null;

    if (cnpj) {
      if (current) blocos.push(current);
      const req = splitRequerimento(csvCol(row, 6));
      const portariaCol = csvCol(row, 1);
      current = {
        cnpj,
        razao_social: csvCol(row, 2),
        portaria: portariaCol || null,
        portaria_retificacoes: [],
        requerimento_numero: req.numero,
        requerimento_ano: req.ano,
        marcas: [],
      };
      const marca = extractMarca(row);
      if (marca) current.marcas.push(marca);
      continue;
    }

    if (!current) continue;

    const col1 = csvCol(row, 1);
    if (isLinhaRetificacao(col1)) {
      current.portaria_retificacoes.push(col1);
    }

    const marca = extractMarca(row);
    if (marca) current.marcas.push(marca);
  }

  if (current) blocos.push(current);

  return blocos.filter((b) => b.cnpj && b.razao_social);
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractAutorizacoesCsvUrl(html: string): string | null {
  const re =
    /href="(https:\/\/www\.gov\.br\/fazenda\/[^"]*planilha-de-autorizacoes-[^"]+\.csv)"/gi;
  let match = re.exec(html);
  if (match?.[1]) return match[1];
  match = re.exec(html);
  return match?.[1] ?? null;
}

// --- Sync ---

const DEFAULT_LISTA_PAGE =
  "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas";

const FETCH_TIMEOUT_MS = 45_000;
const INTEGRACAO_SLUG = "comercial_spa_lista";

interface SyncBody {
  dry_run?: boolean;
  force?: boolean;
  csv_url?: string;
}

interface MarcaExistente {
  id: string;
  nome: string;
  dominio: string | null;
  status_dominio: string;
  status_pipeline: string;
  status_folha: string;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

function normalizeNomeKey(nome: string): string {
  return nome.replace(/\s+/g, " ").trim().toLowerCase();
}

async function fetchText(url: string): Promise<{ ok: true; text: string } | { ok: false; erro: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,text/csv,*/*",
        "User-Agent": "SpinGaming-DataIntelligence/1.0 (sync-comercial-spa-lista)",
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, erro: `HTTP ${res.status} ao buscar ${url}` };
    }
    const text = await res.text();
    if (!text.trim()) return { ok: false, erro: "Resposta vazia" };
    return { ok: true, text };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, erro: msg };
  }
}

async function resolveCsvUrl(bodyUrl?: string): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  const envUrl = Deno.env.get("COMERCIAL_SPA_CSV_URL")?.trim();
  const direct = bodyUrl?.trim() || envUrl;
  if (direct) return { ok: true, url: direct };

  const pageUrl = Deno.env.get("COMERCIAL_SPA_LISTA_PAGE_URL")?.trim() || DEFAULT_LISTA_PAGE;
  const page = await fetchText(pageUrl);
  if (!page.ok) return { ok: false, erro: `Não foi possível abrir a página oficial: ${page.erro}` };

  const csvUrl = extractAutorizacoesCsvUrl(page.text);
  if (!csvUrl) {
    return {
      ok: false,
      erro: "CSV de autorizações não encontrado na página. Defina COMERCIAL_SPA_CSV_URL nos Secrets.",
    };
  }
  return { ok: true, url: csvUrl };
}

type SupabaseAdmin = ReturnType<typeof createClient>;

async function gravarSyncLog(
  supabase: SupabaseAdmin,
  opts: {
    status: "ok" | "falha";
    registros_inseridos: number;
    registros_atualizados: number;
    erros_count: number;
    mensagem_erro: string | null;
    duracao_ms: number;
  },
): Promise<void> {
  try {
    const hoje = new Date().toISOString().split("T")[0];
    await supabase.from("sync_logs").insert({
      integracao_slug: INTEGRACAO_SLUG,
      status: opts.status,
      registros_inseridos: opts.registros_inseridos,
      registros_atualizados: opts.registros_atualizados,
      erros_count: opts.erros_count,
      mensagem_erro: opts.mensagem_erro,
      duracao_ms: opts.duracao_ms,
      periodo_inicio: hoje,
      periodo_fim: hoje,
    });
  } catch (e) {
    console.error("[sync-comercial-spa-lista] Falha ao gravar sync_logs:", e);
  }
}

async function gravarTechLog(supabase: SupabaseAdmin, descricao: string): Promise<void> {
  try {
    await supabase.from("tech_logs").insert({
      integracao_slug: INTEGRACAO_SLUG,
      tipo: "comercial_spa_lista",
      descricao: descricao.slice(0, 2000),
    });
  } catch (e) {
    console.error("[sync-comercial-spa-lista] Falha ao gravar tech_logs:", e);
  }
}

async function getUltimoHash(supabase: SupabaseAdmin): Promise<string | null> {
  const { data } = await supabase
    .from("comercial_spa_sync_meta")
    .select("content_hash")
    .eq("id", 1)
    .maybeSingle();
  return data?.content_hash ?? null;
}

async function salvarMeta(
  supabase: SupabaseAdmin,
  meta: { content_hash: string; csv_url: string; lista_atualizada_em: string | null; blocos: number; marcas: number },
): Promise<void> {
  await supabase.from("comercial_spa_sync_meta").upsert({
    id: 1,
    content_hash: meta.content_hash,
    csv_url: meta.csv_url,
    lista_atualizada_em: meta.lista_atualizada_em,
    blocos_parseados: meta.blocos,
    marcas_parseadas: meta.marcas,
    synced_at: new Date().toISOString(),
  });
}

function retificacoesIguais(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

async function insertHistoricoSync(
  supabase: SupabaseAdmin,
  marcaId: string,
  campo: string,
  valorAnterior: string | null,
  valorNovo: string | null,
): Promise<void> {
  if (valorAnterior === valorNovo) return;
  await supabase.from("comercial_marca_historico").insert({
    marca_id: marcaId,
    usuario_id: null,
    campo,
    valor_anterior: valorAnterior,
    valor_novo: valorNovo,
  });
}

async function upsertBlocos(
  supabase: SupabaseAdmin,
  blocos: ParsedEmpresaBloco[],
): Promise<{ empresas_inseridas: number; empresas_atualizadas: number; marcas_inseridas: number; marcas_atualizadas: number; erros: string[] }> {
  let empresas_inseridas = 0;
  let empresas_atualizadas = 0;
  let marcas_inseridas = 0;
  let marcas_atualizadas = 0;
  const erros: string[] = [];

  for (const bloco of blocos) {
    const { data: existente, error: selErr } = await supabase
      .from("comercial_empresas")
      .select("id, razao_social, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano")
      .eq("cnpj", bloco.cnpj)
      .maybeSingle();

    if (selErr) {
      erros.push(`CNPJ ${bloco.cnpj}: ${selErr.message}`);
      continue;
    }

    const retificacoesJson = bloco.portaria_retificacoes;
    let empresaId: string;

    if (!existente) {
      const { data: inserted, error: insErr } = await supabase
        .from("comercial_empresas")
        .insert({
          razao_social: bloco.razao_social,
          cnpj: bloco.cnpj,
          portaria: bloco.portaria,
          portaria_retificacoes: retificacoesJson,
          requerimento_numero: bloco.requerimento_numero,
          requerimento_ano: bloco.requerimento_ano,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        erros.push(`Insert empresa ${bloco.cnpj}: ${insErr?.message ?? "sem id"}`);
        continue;
      }
      empresaId = inserted.id;
      empresas_inseridas++;
    } else {
      empresaId = existente.id;
      const patch: Record<string, unknown> = {};
      if (existente.razao_social !== bloco.razao_social) patch.razao_social = bloco.razao_social;
      if ((existente.portaria ?? null) !== (bloco.portaria ?? null)) patch.portaria = bloco.portaria;
      const prevRet = (existente.portaria_retificacoes ?? []) as string[];
      if (!retificacoesIguais(prevRet, retificacoesJson)) {
        patch.portaria_retificacoes = retificacoesJson;
      }
      if ((existente.requerimento_numero ?? null) !== (bloco.requerimento_numero ?? null)) {
        patch.requerimento_numero = bloco.requerimento_numero;
      }
      if ((existente.requerimento_ano ?? null) !== (bloco.requerimento_ano ?? null)) {
        patch.requerimento_ano = bloco.requerimento_ano;
      }
      if (Object.keys(patch).length > 0) {
        const { error: updErr } = await supabase.from("comercial_empresas").update(patch).eq("id", empresaId);
        if (updErr) {
          erros.push(`Update empresa ${bloco.cnpj}: ${updErr.message}`);
        } else {
          empresas_atualizadas++;
        }
      }
    }

    const { data: marcasDb, error: marErr } = await supabase
      .from("comercial_marcas")
      .select("id, nome, dominio, status_dominio, status_pipeline, status_folha")
      .eq("empresa_id", empresaId);

    if (marErr) {
      erros.push(`Marcas ${bloco.cnpj}: ${marErr.message}`);
      continue;
    }

    const byNome = new Map<string, MarcaExistente>();
    for (const m of (marcasDb ?? []) as MarcaExistente[]) {
      byNome.set(normalizeNomeKey(m.nome), m);
    }

    for (const marca of bloco.marcas) {
      const key = normalizeNomeKey(marca.nome);
      const prev = byNome.get(key);
      if (!prev) {
        const { error: insMarcaErr } = await supabase.from("comercial_marcas").insert({
          empresa_id: empresaId,
          nome: marca.nome,
          dominio: marca.dominio,
          status_dominio: "inativo",
          status_pipeline: "disponiveis",
          status_folha: "sem_contato",
        });
        if (insMarcaErr) {
          erros.push(`Insert marca ${marca.nome} (${bloco.cnpj}): ${insMarcaErr.message}`);
        } else {
          marcas_inseridas++;
        }
        continue;
      }

      const patchMarca: Record<string, unknown> = {};
      if (prev.nome !== marca.nome) patchMarca.nome = marca.nome;
      if ((prev.dominio ?? null) !== (marca.dominio ?? null)) {
        patchMarca.dominio = marca.dominio;
        patchMarca.status_dominio = "inativo";
      }

      if (Object.keys(patchMarca).length === 0) continue;

      const { error: updMarcaErr } = await supabase
        .from("comercial_marcas")
        .update(patchMarca)
        .eq("id", prev.id);

      if (updMarcaErr) {
        erros.push(`Update marca ${marca.nome}: ${updMarcaErr.message}`);
        continue;
      }

      marcas_atualizadas++;
      if (patchMarca.dominio !== undefined) {
        await insertHistoricoSync(
          supabase,
          prev.id,
          "dominio",
          prev.dominio,
          marca.dominio,
        );
        if (patchMarca.status_dominio === "inativo" && prev.status_dominio !== "inativo") {
          await insertHistoricoSync(
            supabase,
            prev.id,
            "status_dominio",
            prev.status_dominio === "ok" ? "Ativo" : "Inativo",
            "Inativo",
          );
        }
      }
      if (patchMarca.nome !== undefined) {
        await insertHistoricoSync(supabase, prev.id, "nome", prev.nome, marca.nome);
      }
    }
  }

  return { empresas_inseridas, empresas_atualizadas, marcas_inseridas, marcas_atualizadas, erros };
}

function extractListaAtualizadaEm(htmlOrCsvHint: string): string | null {
  const m = htmlOrCsvHint.match(/Atualizada em (\d{2}\/\d{2}\/\d{4})/i);
  return m?.[1] ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json({ ok: false, erro: "Use POST" }, req, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, erro: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em falta." }, req, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: SyncBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as SyncBody;
  } catch {
    body = {};
  }

  const dry_run = body.dry_run === true;
  const force = body.force === true;
  const inicioMs = Date.now();

  const resolved = await resolveCsvUrl(body.csv_url);
  if (!resolved.ok) {
    if (!dry_run) {
      await gravarSyncLog(supabase, {
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: resolved.erro,
        duracao_ms: Date.now() - inicioMs,
      });
      await gravarTechLog(supabase, resolved.erro);
    }
    return json({ ok: false, erro: resolved.erro }, req, 200);
  }

  const csvFetch = await fetchText(resolved.url);
  if (!csvFetch.ok) {
    const msg = `Não foi possível baixar o CSV oficial: ${csvFetch.erro}`;
    if (!dry_run) {
      await gravarSyncLog(supabase, {
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: msg,
        duracao_ms: Date.now() - inicioMs,
      });
      await gravarTechLog(supabase, msg);
    }
    return json({ ok: false, erro: msg, csv_url: resolved.url }, req, 200);
  }

  const contentHash = await sha256Hex(csvFetch.text);
  const ultimoHash = dry_run ? null : await getUltimoHash(supabase);

  if (!force && !dry_run && ultimoHash && ultimoHash === contentHash) {
    await gravarSyncLog(supabase, {
      status: "ok",
      registros_inseridos: 0,
      registros_atualizados: 0,
      erros_count: 0,
      mensagem_erro: null,
      duracao_ms: Date.now() - inicioMs,
    });
    return json({
      ok: true,
      skipped: true,
      motivo: "CSV sem alteração (hash igual ao último sync).",
      content_hash: contentHash,
      csv_url: resolved.url,
    }, req);
  }

  let blocos: ParsedEmpresaBloco[];
  try {
    blocos = parseSpaAutorizacoesCsv(csvFetch.text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!dry_run) {
      await gravarSyncLog(supabase, {
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: `Erro ao interpretar CSV: ${msg}`,
        duracao_ms: Date.now() - inicioMs,
      });
    }
    return json({ ok: false, erro: `Erro ao interpretar CSV: ${msg}` }, req, 200);
  }

  const totalMarcas = blocos.reduce((s, b) => s + b.marcas.length, 0);
  const listaAtualizada = extractListaAtualizadaEm(csvFetch.text.slice(0, 500));

  if (dry_run) {
    return json({
      ok: true,
      dry_run: true,
      csv_url: resolved.url,
      content_hash: contentHash,
      blocos: blocos.length,
      marcas: totalMarcas,
      lista_atualizada_em: listaAtualizada,
      amostra: blocos.slice(0, 3).map((b) => ({
        cnpj: b.cnpj,
        razao_social: b.razao_social,
        portaria: b.portaria,
        retificacoes: b.portaria_retificacoes.length,
        marcas: b.marcas.length,
      })),
    }, req);
  }

  const result = await upsertBlocos(supabase, blocos);
  const duracao_ms = Date.now() - inicioMs;
  const inseridos = result.empresas_inseridas + result.marcas_inseridas;
  const atualizados = result.empresas_atualizadas + result.marcas_atualizadas;
  const erros_count = result.erros.length;
  const ok = erros_count === 0 || inseridos + atualizados > 0;

  await salvarMeta(supabase, {
    content_hash: contentHash,
    csv_url: resolved.url,
    lista_atualizada_em: listaAtualizada,
    blocos: blocos.length,
    marcas: totalMarcas,
  });

  await gravarSyncLog(supabase, {
    status: ok ? "ok" : "falha",
    registros_inseridos: inseridos,
    registros_atualizados: atualizados,
    erros_count,
    mensagem_erro: erros_count > 0 ? result.erros.slice(0, 5).join(" | ") : null,
    duracao_ms,
  });

  if (erros_count > 0) {
    await gravarTechLog(supabase, result.erros.slice(0, 10).join("\n"));
  }

  return json({
    ok,
    csv_url: resolved.url,
    content_hash: contentHash,
    lista_atualizada_em: listaAtualizada,
    blocos: blocos.length,
    marcas_parseadas: totalMarcas,
    empresas_inseridas: result.empresas_inseridas,
    empresas_atualizadas: result.empresas_atualizadas,
    marcas_inseridas: result.marcas_inseridas,
    marcas_atualizadas: result.marcas_atualizadas,
    erros: result.erros.slice(0, 20),
    duracao_ms,
  }, req);
});
