import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Edge Function: monitor-lobby-blaze
 * Lê o lobby público Cassino Ao Vivo da Blaze, grava posição das mesas Spin
 * (cadastro em mesas_spin_cadastro) e concorrentes do mesmo tipo à frente.
 *
 * Chamada: POST {} ou { dry_run?: boolean }
 * Segurança: MONITOR_LOBBY_BLAZE_INGEST_SECRET (header x-monitor-lobby-blaze-secret)
 *   ou Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Deploy: supabase functions deploy monitor-lobby-blaze
 */

const OPERADORA_SLUG = "blaze";
const LIMIT = 30;
const SEARCH_QUERY =
  "limit=30&search=&game_category_slugs=live-casino&xp_enabled=false&game_provider_slugs=&bonus_betting_enabled=false";
const BLAZE_SEARCH_URL = "https://blaze.bet.br/api/games/search";
const USER_AGENT = "SpinDataIntelligence-LobbyMonitor/1.0";

type TipoLobby = "roleta" | "baccarat" | "blackjack" | "blackjack_vip" | "other";

interface MesaCadastro {
  nome_mesa: string;
  tipo_jogo: string;
  mesa_identificacao: string;
  mesa_identificacao_operadora: string | null;
}

interface LobbyGame {
  posicao: number;
  game_id: number;
  name: string;
  slug: string;
  provider_name: string;
  provider_slug: string;
}

interface BlazeRecord {
  id: number;
  name: string;
  slug: string;
  provider?: {
    name?: string;
    slug?: string;
  };
}

interface BlazeSearchResponse {
  records?: BlazeRecord[];
  meta?: { total_pages?: number; total_records?: number };
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
      "authorization, x-client-info, apikey, content-type, x-monitor-lobby-blaze-secret",
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
  const secret = Deno.env.get("MONITOR_LOBBY_BLAZE_INGEST_SECRET")?.trim();
  if (!secret) return true;
  const h =
    req.headers.get("x-monitor-lobby-blaze-secret") ??
    req.headers.get("X-Monitor-Lobby-Blaze-Secret");
  if (h === secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (sr && auth === `Bearer ${sr}`) return true;
  return false;
}

function tipoLobbyFromCadastro(tipoJogo: string): TipoLobby {
  const t = tipoJogo.toLowerCase();
  if (t.includes("vip") && (t.includes("black") || t.includes("bj"))) {
    return "blackjack_vip";
  }
  if (t.includes("black") || t.includes("bj")) return "blackjack";
  if (t.includes("baccarat") || t.includes("bacará") || t.includes("bacara")) {
    return "baccarat";
  }
  if (t.includes("roleta") || t.includes("roulette")) return "roleta";
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
  return "other";
}

function isConcorrente(
  jogo: LobbyGame,
  tipoAlvo: TipoLobby,
): boolean {
  if (jogo.provider_slug === "spin") return false;
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

async function fetchPagina(page: number): Promise<BlazeSearchResponse> {
  const url = `${BLAZE_SEARCH_URL}?page=${page}&${SEARCH_QUERY}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`Blaze search HTTP ${res.status} (page=${page})`);
  }
  return (await res.json()) as BlazeSearchResponse;
}

async function escanearLobby(
  mesasEsperadas: MesaCadastro[],
): Promise<{
  lobby: LobbyGame[];
  posicoes: Map<string, number>;
  paginasLidas: number;
}> {
  const idsEsperados = new Set(
    mesasEsperadas.map((m) => m.mesa_identificacao_operadora!.trim()),
  );
  const lobby: LobbyGame[] = [];
  const posicoes = new Map<string, number>();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await fetchPagina(page);
    if (page === 1) {
      totalPages = Math.max(1, data.meta?.total_pages ?? 1);
    }
    const records = data.records ?? [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const posicao = (page - 1) * LIMIT + i + 1;
      const item: LobbyGame = {
        posicao,
        game_id: r.id,
        name: r.name,
        slug: r.slug,
        provider_name: r.provider?.name ?? "",
        provider_slug: r.provider?.slug ?? "",
      };
      lobby.push(item);
      const idStr = String(r.id);
      if (idsEsperados.has(idStr)) {
        posicoes.set(idStr, posicao);
      }
    }
    if (posicoes.size >= idsEsperados.size) break;
    page++;
  }

  return { lobby, posicoes, paginasLidas: page };
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
  try {
    const body = await req.json().catch(() => ({}));
    dryRun = Boolean((body as { dry_run?: boolean })?.dry_run);
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

  const { data: mesas, error: mesasErr } = await supabase
    .from("mesas_spin_cadastro")
    .select("nome_mesa, tipo_jogo, mesa_identificacao, mesa_identificacao_operadora")
    .eq("operadora_slug", OPERADORA_SLUG)
    .order("nome_mesa");

  if (mesasErr) {
    return json({ ok: false, erro: mesasErr.message }, req, 500);
  }

  const mesasList = (mesas ?? []) as MesaCadastro[];
  if (mesasList.length === 0) {
    return json({
      ok: false,
      status: "erro_config",
      erro: `Nenhuma mesa em mesas_spin_cadastro para operadora ${OPERADORA_SLUG}`,
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
        `Mesas sem ID na operadora (mesa_identificacao_operadora): ${
          semIdOperadora.map((m) => m.nome_mesa).join(", ")
        }`,
    }, req, 200);
  }

  let lobby: LobbyGame[] = [];
  let posicoes = new Map<string, number>();
  let paginasLidas = 0;
  let apiErro: string | null = null;

  try {
    const scan = await escanearLobby(mesasList);
    lobby = scan.lobby;
    posicoes = scan.posicoes;
    paginasLidas = scan.paginasLidas;
  } catch (e) {
    apiErro = e instanceof Error ? e.message : String(e);
  }

  const duracaoMs = Date.now() - inicioMs;
  const mesasEncontradas = posicoes.size;
  const status = apiErro
    ? "erro_api"
    : mesasEncontradas >= mesasList.length
    ? "ok"
    : "parcial";

  const linhasPosicao = mesasList.map((m) => {
    const idOperadora = m.mesa_identificacao_operadora!.trim();
    const pos = posicoes.get(idOperadora) ?? null;
    const tipo = tipoLobbyFromCadastro(m.tipo_jogo);
    const concorrentes = pos != null
      ? concorrentesAFrente(lobby, pos, tipo)
      : [];
    return {
      operadora_slug: OPERADORA_SLUG,
      mesa_identificacao: m.mesa_identificacao.trim(),
      mesa_identificacao_operadora: idOperadora,
      nome_mesa: m.nome_mesa,
      tipo_jogo: m.tipo_jogo,
      posicao: pos,
      qtd_concorrentes_a_frente: concorrentes.length,
      concorrentes_a_frente: concorrentes,
    };
  });

  if (dryRun) {
    return json({
      ok: !apiErro,
      dry_run: true,
      status,
      operadora_slug: OPERADORA_SLUG,
      paginas_lidas: paginasLidas,
      jogos_escaneados: lobby.length,
      mesas_esperadas: mesasList.length,
      mesas_encontradas: mesasEncontradas,
      duracao_ms: duracaoMs,
      erro: apiErro,
      posicoes: linhasPosicao,
    }, req);
  }

  if (apiErro) {
    const { data: execErr } = await supabase
      .from("lobby_monitor_execucao")
      .insert({
        operadora_slug: OPERADORA_SLUG,
        status: "erro_api",
        paginas_lidas: paginasLidas,
        jogos_escaneados: lobby.length,
        mesas_esperadas: mesasList.length,
        mesas_encontradas: mesasEncontradas,
        duracao_ms: duracaoMs,
        erro: apiErro,
      })
      .select("id")
      .single();

    return json({
      ok: false,
      status: "erro_api",
      execucao_id: execErr?.id ?? null,
      erro: apiErro,
    }, req, 200);
  }

  const { data: exec, error: execInsertErr } = await supabase
    .from("lobby_monitor_execucao")
    .insert({
      operadora_slug: OPERADORA_SLUG,
      status,
      paginas_lidas: paginasLidas,
      jogos_escaneados: lobby.length,
      mesas_esperadas: mesasList.length,
      mesas_encontradas: mesasEncontradas,
      duracao_ms: duracaoMs,
      erro: status === "parcial"
        ? `Mesas não encontradas no lobby: ${
          mesasList
            .filter((m) =>
              !posicoes.has(m.mesa_identificacao_operadora!.trim())
            )
            .map((m) => m.nome_mesa)
            .join(", ")
        }`.slice(0, 2000)
        : null,
    })
    .select("id")
    .single();

  if (execInsertErr || !exec?.id) {
    return json({
      ok: false,
      erro: execInsertErr?.message ?? "Falha ao gravar execução",
    }, req, 500);
  }

  const rows = linhasPosicao.map((l) => ({
    ...l,
    execucao_id: exec.id,
  }));

  const { error: posErr } = await supabase.from("lobby_monitor_posicao").insert(rows);
  if (posErr) {
    return json({
      ok: false,
      execucao_id: exec.id,
      erro: posErr.message,
    }, req, 500);
  }

  return json({
    ok: status === "ok",
    status,
    execucao_id: exec.id,
    operadora_slug: OPERADORA_SLUG,
    paginas_lidas: paginasLidas,
    jogos_escaneados: lobby.length,
    mesas_esperadas: mesasList.length,
    mesas_encontradas: mesasEncontradas,
    duracao_ms: duracaoMs,
    posicoes: linhasPosicao,
  }, req);
});
