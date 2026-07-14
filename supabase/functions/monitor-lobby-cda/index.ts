import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Edge Function: monitor-lobby-cda
 * Lê categorias do cassino CDA (competitions por categoria), grava posição das mesas Spin
 * dentro da categoria do tipo (Roleta, Baccarat, BlackJack & Poker, Futebol Brasileiro, …).
 *
 * POST { dry_run?: boolean, cda_categories?: CdaCategory[] }
 * Opcional: fetch via secret CDA_LOBBY_CATEGORIES_URL (URL copiada do DevTools).
 *
 * Na CDA as mesas Spin aparecem como provider "GamesGlobal" — usar mesa_identificacao_operadora
 * = competition.id (ex.: 3304) ou externalIdentifier.identifier (ex.: 62082).
 *
 * Fontes de ID (união, dedupe por mesa Spin):
 * 1. `mesas_spin_operadora_identificacao` onde operadora_slug = casa_apostas (Gestão de Estúdios — ID CDA)
 * 2. Legado: `mesas_spin_cadastro.operadora_slug = casa_apostas` + coluna mesa_identificacao_operadora
 */

const OPERADORA_SLUG = "casa_apostas";
const INTEGRACAO_SLUG = "lobby_cda";
const CDA_CATEGORIES_URL_DEFAULT =
  "https://casadeapostas.bet.br/api/content/casino-categories?languageId=21";
const CDA_CASINO_REFERER = "https://www.casadeapostas.bet.br/br/casino";
/** Provider no JSON da CDA para mesas Spin (não confundir com slots "Spin" no nome). */
const PROVIDER_SLUG_SPIN = "gamesglobal";

type TipoLobby =
  | "roleta"
  | "baccarat"
  | "blackjack"
  | "blackjack_vip"
  | "futebol_brasileiro"
  | "other";

interface MonitorBody {
  dry_run?: boolean;
  cda_categories?: CdaCategory[];
}

interface MesaCadastro {
  nome_mesa: string;
  tipo_jogo: string;
  mesa_identificacao: string;
  mesa_identificacao_operadora: string | null;
}

interface MesaCadastroComId extends MesaCadastro {
  id?: string;
}

type JunctionEmbed = {
  mesa_id: string;
  mesa_identificacao_operadora: string | null;
  mesas_spin_cadastro:
    | {
        nome_mesa: string;
        tipo_jogo: string;
        mesa_identificacao: string;
      }
    | {
        nome_mesa: string;
        tipo_jogo: string;
        mesa_identificacao: string;
      }[]
    | null;
};

function unwrapCadastroEmbed(
  emb: JunctionEmbed["mesas_spin_cadastro"],
): { nome_mesa: string; tipo_jogo: string; mesa_identificacao: string } | null {
  if (!emb) return null;
  const row = Array.isArray(emb) ? emb[0] : emb;
  if (!row?.mesa_identificacao?.trim()) return null;
  return row;
}

/**
 * Une IDs CDA da Gestão de Estúdios (junction N:N) com o cadastro legado por operadora_slug.
 * Preferência: ID na junction; se a mesma mesa Spin já estiver no mapa, não duplica.
 */
function mergeMesasMonitorCda(
  junctionRows: JunctionEmbed[],
  legadoRows: MesaCadastroComId[],
): MesaCadastro[] {
  const bySpinId = new Map<string, MesaCadastro>();

  for (const j of junctionRows) {
    const idOp = j.mesa_identificacao_operadora?.trim();
    if (!idOp) continue;
    const cad = unwrapCadastroEmbed(j.mesas_spin_cadastro);
    if (!cad) continue;
    const spinId = cad.mesa_identificacao.trim();
    if (!spinId) continue;
    bySpinId.set(spinId, {
      nome_mesa: cad.nome_mesa,
      tipo_jogo: cad.tipo_jogo,
      mesa_identificacao: spinId,
      mesa_identificacao_operadora: idOp,
    });
  }

  for (const m of legadoRows) {
    const spinId = m.mesa_identificacao?.trim();
    if (!spinId) continue;
    if (bySpinId.has(spinId)) continue;
    const idOp = m.mesa_identificacao_operadora?.trim();
    if (!idOp) continue;
    bySpinId.set(spinId, {
      nome_mesa: m.nome_mesa,
      tipo_jogo: m.tipo_jogo,
      mesa_identificacao: spinId,
      mesa_identificacao_operadora: idOp,
    });
  }

  return [...bySpinId.values()].sort((a, b) =>
    a.nome_mesa.localeCompare(b.nome_mesa, "pt-BR")
  );
}

async function carregarMesasMonitorCda(
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<{ mesas: MesaCadastro[]; erro: string | null }> {
  const [juncRes, legadoRes] = await Promise.all([
    supabase
      .from("mesas_spin_operadora_identificacao")
      .select(
        "mesa_id, mesa_identificacao_operadora, mesas_spin_cadastro(nome_mesa, tipo_jogo, mesa_identificacao)",
      )
      .eq("operadora_slug", OPERADORA_SLUG),
    supabase
      .from("mesas_spin_cadastro")
      .select("id, nome_mesa, tipo_jogo, mesa_identificacao, mesa_identificacao_operadora")
      .eq("operadora_slug", OPERADORA_SLUG)
      .order("nome_mesa"),
  ]);

  if (juncRes.error) {
    return { mesas: [], erro: juncRes.error.message };
  }
  if (legadoRes.error) {
    return { mesas: [], erro: legadoRes.error.message };
  }

  const mesas = mergeMesasMonitorCda(
    (juncRes.data ?? []) as JunctionEmbed[],
    (legadoRes.data ?? []) as MesaCadastroComId[],
  );
  return { mesas, erro: null };
}

interface CdaExternalId {
  id?: number;
  identifier?: string;
  additionalIdentifier?: string;
}

interface CdaCompetition {
  id: number;
  identifier?: string;
  name: string;
  providerName?: string;
  externalIdentifier?: CdaExternalId;
}

interface CdaCategory {
  id?: number;
  name: string;
  competitions?: CdaCompetition[];
}

interface LobbyGame {
  posicao: number;
  game_id: number;
  name: string;
  slug: string;
  provider_name: string;
  provider_slug: string;
}

interface ConcorrenteJson {
  posicao: number;
  game_id: number;
  name: string;
  slug: string;
  provider_name: string;
  provider_slug: string;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-monitor-lobby-cda-secret",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

function autorizado(req: Request): boolean {
  const secret = Deno.env.get("MONITOR_LOBBY_CDA_INGEST_SECRET")?.trim();
  if (!secret) return true;
  const h =
    req.headers.get("x-monitor-lobby-cda-secret") ??
    req.headers.get("X-Monitor-Lobby-Cda-Secret");
  if (h === secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (sr && auth === `Bearer ${sr}`) return true;
  return false;
}

function slugifyProvider(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isFutebolBrasileiroTexto(t: string): boolean {
  return (
    t.includes("futebol brasileiro") ||
    t.includes("futebol studio") ||
    t.includes("football studio") ||
    t.includes("futebol_studio") ||
    (t.includes("futebol") && !t.includes("roleta"))
  );
}

function tipoLobbyFromCadastro(tipoJogo: string, nomeMesa?: string): TipoLobby {
  const t = `${tipoJogo} ${nomeMesa ?? ""}`.toLowerCase();
  if (t.includes("vip") && (t.includes("black") || t.includes("bj"))) {
    return "blackjack_vip";
  }
  if (t.includes("black") || t.includes("bj")) return "blackjack";
  if (t.includes("baccarat") || t.includes("bacará") || t.includes("bacara")) {
    return "baccarat";
  }
  if (t.includes("roleta") || t.includes("roulette")) return "roleta";
  if (isFutebolBrasileiroTexto(t)) return "futebol_brasileiro";
  return "other";
}

function tipoLobbyFromJogo(name: string, slug: string): TipoLobby {
  const s = `${name} ${slug}`.toLowerCase();
  if (/vip/.test(s) && /blackjack|black-jack|black jack/.test(s)) {
    return "blackjack_vip";
  }
  if (/blackjack|black-jack|black jack/.test(s)) return "blackjack";
  if (/baccarat|bacará|bacara|bac-bo|bac bo/.test(s)) return "baccarat";
  if (/roleta|roulette/.test(s)) return "roleta";
  if (/futebol brasileiro|futebol studio|football studio|futebol_studio/.test(s)) {
    return "futebol_brasileiro";
  }
  return "other";
}

function categoriaNomeFromMesa(tipoJogo: string, nomeMesa?: string): string {
  const tipo = tipoLobbyFromCadastro(tipoJogo, nomeMesa);
  if (tipo === "roleta") return "Roleta";
  if (tipo === "baccarat") return "Baccarat & Sic Bo";
  if (tipo === "blackjack" || tipo === "blackjack_vip") return "BlackJack & Poker";
  if (tipo === "futebol_brasileiro") return "Futebol Studio";
  return "Roleta";
}

function matchCompetition(comp: CdaCompetition, idOperadora: string): boolean {
  const id = idOperadora.trim();
  if (String(comp.id) === id) return true;
  const ext = comp.externalIdentifier;
  if (ext?.identifier != null && String(ext.identifier) === id) return true;
  if (ext?.id != null && String(ext.id) === id) return true;
  return false;
}

function lobbyFromCategory(cat: CdaCategory): LobbyGame[] {
  const comps = cat.competitions ?? [];
  return comps.map((c, i) => ({
    posicao: i + 1,
    game_id: c.id,
    name: c.name,
    slug: c.identifier ?? String(c.id),
    provider_name: c.providerName ?? "",
    provider_slug: slugifyProvider(c.providerName ?? ""),
  }));
}

function isConcorrente(jogo: LobbyGame, tipoAlvo: TipoLobby): boolean {
  if (jogo.provider_slug === PROVIDER_SLUG_SPIN) return false;
  return tipoLobbyFromJogo(jogo.name, jogo.slug) === tipoAlvo;
}

function concorrentesAFrente(
  lobby: LobbyGame[],
  posicao: number,
  tipoAlvo: TipoLobby,
): ConcorrenteJson[] {
  return lobby
    .filter((g) => g.posicao < posicao && isConcorrente(g, tipoAlvo))
    .map((g) => ({
      posicao: g.posicao,
      game_id: g.game_id,
      name: g.name,
      slug: g.slug,
      provider_name: g.provider_name,
      provider_slug: g.provider_slug,
    }));
}

function jogosAFrentePiorMesaSpin(
  lobby: LobbyGame[],
  posicaoPiorMesa: number,
): ConcorrenteJson[] {
  return lobby
    .filter((g) => g.posicao < posicaoPiorMesa && g.provider_slug !== PROVIDER_SLUG_SPIN)
    .sort((a, b) => a.posicao - b.posicao)
    .map((g) => ({
      posicao: g.posicao,
      game_id: g.game_id,
      name: g.name,
      slug: g.slug,
      provider_name: g.provider_name,
      provider_slug: g.provider_slug,
    }));
}

function piorMesaSpinLinhas(
  linhas: {
    mesa_identificacao: string;
    nome_mesa: string;
    posicao: number | null;
  }[],
): { mesa_identificacao: string; nome_mesa: string; posicao: number } | null {
  let worst: { mesa_identificacao: string; nome_mesa: string; posicao: number } | null =
    null;
  for (const l of linhas) {
    if (l.posicao == null) continue;
    if (!worst || l.posicao > worst.posicao) {
      worst = {
        mesa_identificacao: l.mesa_identificacao,
        nome_mesa: l.nome_mesa,
        posicao: l.posicao,
      };
    }
  }
  return worst;
}

function findCategory(
  categories: CdaCategory[],
  nomeCategoria: string,
): CdaCategory | undefined {
  const alvo = nomeCategoria.trim().toLowerCase();
  return categories.find((c) => c.name.trim().toLowerCase() === alvo);
}

/** Busca categoria por nome exato ou substring (ex.: Futebol Studio na CDA). */
function findCategoryByNameHints(
  categories: CdaCategory[],
  hints: string[],
): CdaCategory | undefined {
  for (const hint of hints) {
    const exact = findCategory(categories, hint);
    if (exact) return exact;
  }
  const norm = (s: string) => s.trim().toLowerCase();
  for (const hint of hints) {
    const h = norm(hint);
    const found = categories.find((c) => {
      const n = norm(c.name);
      return n.includes(h) || h.includes(n);
    });
    if (found) return found;
  }
  return undefined;
}

function resolvePosicaoMesaCda(
  categories: CdaCategory[],
  idOperadora: string,
  nomeCatPreferida: string,
  tipo: TipoLobby,
): { cat: CdaCategory | undefined; pos: number | null; categoriaLobby: string } {
  let cat = findCategory(categories, nomeCatPreferida);
  if (!cat && tipo === "futebol_brasileiro") {
    cat = findCategoryByNameHints(categories, [
      "Futebol Studio",
      "Futebol Brasileiro",
      "Game Shows",
      "Programas de Jogo",
    ]);
  }
  if (cat) {
    const pos = posicaoMesaNaCategoria(cat, idOperadora);
    if (pos != null) {
      return { cat, pos, categoriaLobby: cat.name };
    }
  }
  for (const c of categories) {
    const pos = posicaoMesaNaCategoria(c, idOperadora);
    if (pos != null) {
      return { cat: c, pos, categoriaLobby: c.name };
    }
  }
  return { cat, pos: null, categoriaLobby: cat?.name ?? nomeCatPreferida };
}

function posicaoMesaNaCategoria(
  cat: CdaCategory,
  idOperadora: string,
): number | null {
  const comps = cat.competitions ?? [];
  const idx = comps.findIndex((c) => matchCompetition(c, idOperadora));
  return idx >= 0 ? idx + 1 : null;
}

async function fetchCdaCategories(): Promise<CdaCategory[]> {
  const url =
    Deno.env.get("CDA_LOBBY_CATEGORIES_URL")?.trim() || CDA_CATEGORIES_URL_DEFAULT;
  const cookie = Deno.env.get("CDA_LOBBY_COOKIE")?.trim();
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Referer: CDA_CASINO_REFERER,
    Origin: "https://www.casadeapostas.bet.br",
  };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const hint = res.status === 401
      ? " HTTP 401 — configure CDA_LOBBY_COOKIE (header Cookie do DevTools, logado) ou use monitor-lobby-cda-run.mjs com cda_categories no body."
      : "";
    throw new Error(`CDA categories HTTP ${res.status}.${hint}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data as CdaCategory[];
  if (Array.isArray((data as { categories?: CdaCategory[] }).categories)) {
    return (data as { categories: CdaCategory[] }).categories;
  }
  throw new Error("Resposta CDA não é array de categorias");
}

type SupabaseAdmin = ReturnType<typeof createClient>;

async function gravarSyncLog(
  supabase: SupabaseAdmin,
  opts: {
    status: "ok" | "falha";
    registros_inseridos: number;
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
      registros_atualizados: 0,
      erros_count: opts.erros_count,
      mensagem_erro: opts.mensagem_erro,
      duracao_ms: opts.duracao_ms,
      periodo_inicio: hoje,
      periodo_fim: hoje,
    });
  } catch (e) {
    console.error("[monitor-lobby-cda] Falha ao gravar sync_logs:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json({ ok: false, erro: "Use POST" }, req, 405);
  }
  if (!autorizado(req)) {
    return json({ ok: false, erro: "Não autorizado" }, req, 401);
  }

  let dryRun = false;
  let body: MonitorBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as MonitorBody;
    dryRun = Boolean(body.dry_run);
  } catch {
    /* body vazio */
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, erro: "SUPABASE_URL / SERVICE_ROLE_KEY ausentes" }, req, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const inicioMs = Date.now();

  const { mesas: mesasList, erro: mesasLoadErr } = await carregarMesasMonitorCda(supabase);
  if (mesasLoadErr) {
    return json({ ok: false, erro: mesasLoadErr }, req, 500);
  }

  if (mesasList.length === 0) {
    return json({
      ok: false,
      status: "erro_config",
      erro:
        `Nenhuma mesa CDA com ID: preencha ID CDA em Gestão de Estúdios (mesas_spin_operadora_identificacao) ou legado mesas_spin_cadastro.operadora_slug=${OPERADORA_SLUG}`,
    }, req, 200);
  }

  const semIdOperadora = mesasList.filter(
    (m) => !m.mesa_identificacao_operadora?.trim(),
  );
  if (semIdOperadora.length > 0) {
    return json({
      ok: false,
      status: "erro_config",
      erro:
        `Mesas sem ID na operadora: ${
          semIdOperadora.map((m) => m.nome_mesa).join(", ")
        }`,
    }, req, 200);
  }

  let categories: CdaCategory[] = [];
  let apiErro: string | null = null;
  let fonte = "body";

  if (Array.isArray(body.cda_categories) && body.cda_categories.length > 0) {
    categories = body.cda_categories;
  } else {
    fonte = "fetch";
    try {
      categories = await fetchCdaCategories();
    } catch (e) {
      apiErro = e instanceof Error ? e.message : String(e);
    }
  }

  const totalJogos = categories.reduce(
    (s, c) => s + (c.competitions?.length ?? 0),
    0,
  );

  const linhasPosicao = mesasList.map((m) => {
    const idOperadora = m.mesa_identificacao_operadora!.trim();
    const nomeCat = categoriaNomeFromMesa(m.tipo_jogo, m.nome_mesa);
    const tipo = tipoLobbyFromCadastro(m.tipo_jogo, m.nome_mesa);
    const resolved = resolvePosicaoMesaCda(categories, idOperadora, nomeCat, tipo);
    const cat = resolved.cat;
    const pos = resolved.pos;
    const lobbyCat = cat ? lobbyFromCategory(cat) : [];
    const concorrentes = pos != null ? concorrentesAFrente(lobbyCat, pos, tipo) : [];
    return {
      operadora_slug: OPERADORA_SLUG,
      mesa_identificacao: m.mesa_identificacao.trim(),
      mesa_identificacao_operadora: idOperadora,
      nome_mesa: m.nome_mesa,
      tipo_jogo: m.tipo_jogo,
      categoria_lobby: resolved.categoriaLobby,
      posicao: pos,
      qtd_concorrentes_a_frente: concorrentes.length,
      concorrentes_a_frente: concorrentes,
    };
  });

  const mesasEncontradas = linhasPosicao.filter((l) => l.posicao != null).length;
  const duracaoMs = Date.now() - inicioMs;
  const status = apiErro
    ? "erro_api"
    : mesasEncontradas >= mesasList.length
    ? "ok"
    : "parcial";

  const piorMesaDry = piorMesaSpinLinhas(linhasPosicao);
  let jogosVitrineDry: ConcorrenteJson[] = [];
  if (piorMesaDry) {
    const linhaWorst = linhasPosicao.find(
      (l) => l.mesa_identificacao === piorMesaDry.mesa_identificacao,
    );
    if (linhaWorst?.categoria_lobby) {
      const catWorst =
        findCategory(categories, linhaWorst.categoria_lobby) ??
        findCategoryByNameHints(categories, [linhaWorst.categoria_lobby]);
      if (catWorst) {
        jogosVitrineDry = jogosAFrentePiorMesaSpin(
          lobbyFromCategory(catWorst),
          piorMesaDry.posicao,
        );
      }
    }
  }

  if (dryRun) {
    return json({
      ok: !apiErro && mesasEncontradas > 0,
      dry_run: true,
      status,
      operadora_slug: OPERADORA_SLUG,
      fonte,
      categorias_lidas: categories.length,
      jogos_escaneados: totalJogos,
      mesas_esperadas: mesasList.length,
      mesas_encontradas: mesasEncontradas,
      duracao_ms: duracaoMs,
      erro: apiErro,
      pior_mesa: piorMesaDry,
      jogos_a_frente_pior_mesa: jogosVitrineDry,
      posicoes: linhasPosicao,
    }, req);
  }

  if (apiErro) {
    await gravarSyncLog(supabase, {
      status: "falha",
      registros_inseridos: mesasEncontradas,
      erros_count: Math.max(0, mesasList.length - mesasEncontradas),
      mensagem_erro: apiErro.slice(0, 2000),
      duracao_ms: duracaoMs,
    });
    return json({ ok: false, status: "erro_api", erro: apiErro }, req, 200);
  }

  const piorMesa = piorMesaDry;
  const jogosVitrine = jogosVitrineDry;
  const mensagemErroParcial = status === "parcial"
    ? `Mesas não encontradas: ${
      linhasPosicao.filter((l) => l.posicao == null).map((l) => l.nome_mesa).join(", ")
    }`.slice(0, 2000)
    : null;

  const { data: exec, error: execInsertErr } = await supabase
    .from("lobby_monitor_execucao")
    .insert({
      operadora_slug: OPERADORA_SLUG,
      status,
      paginas_lidas: categories.length,
      jogos_escaneados: totalJogos,
      mesas_esperadas: mesasList.length,
      mesas_encontradas: mesasEncontradas,
      duracao_ms: duracaoMs,
      pior_mesa_nome: piorMesa?.nome_mesa ?? null,
      pior_mesa_identificacao: piorMesa?.mesa_identificacao ?? null,
      pior_mesa_posicao: piorMesa?.posicao ?? null,
      jogos_a_frente_pior_mesa: jogosVitrine,
      erro: mensagemErroParcial,
    })
    .select("id")
    .single();

  if (execInsertErr || !exec?.id) {
    return json({
      ok: false,
      erro: execInsertErr?.message ?? "Falha ao gravar execução",
    }, req, 500);
  }

  const rows = linhasPosicao.map((l) => {
    const { categoria_lobby: _c, ...rest } = l;
    return { ...rest, execucao_id: exec.id };
  });

  const { error: posErr } = await supabase.from("lobby_monitor_posicao").insert(rows);
  if (posErr) {
    await gravarSyncLog(supabase, {
      status: "falha",
      registros_inseridos: 0,
      erros_count: mesasList.length,
      mensagem_erro: posErr.message.slice(0, 2000),
      duracao_ms: duracaoMs,
    });
    return json({ ok: false, execucao_id: exec.id, erro: posErr.message }, req, 500);
  }

  await gravarSyncLog(supabase, {
    status: "ok",
    registros_inseridos: mesasEncontradas,
    erros_count: Math.max(0, mesasList.length - mesasEncontradas),
    mensagem_erro: mensagemErroParcial,
    duracao_ms: duracaoMs,
  });

  return json({
    ok: status === "ok",
    status,
    execucao_id: exec.id,
    operadora_slug: OPERADORA_SLUG,
    categorias_lidas: categories.length,
    jogos_escaneados: totalJogos,
    mesas_esperadas: mesasList.length,
    mesas_encontradas: mesasEncontradas,
    duracao_ms: duracaoMs,
    posicoes: linhasPosicao,
  }, req);
});
