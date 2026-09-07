import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Edge Function: monitor-lobby-bateu
 * Lê a grade «Todos os jogos» da Bateu.bet, grava posição das mesas Spin
 * e concorrentes do mesmo tipo à frente.
 *
 * Fontes de ID (união, dedupe por mesa Spin):
 * 1. `mesas_spin_operadora_identificacao` onde operadora_slug = bateu_bet
 * 2. Legado: `mesas_spin_cadastro.operadora_slug = bateu_bet` + mesa_identificacao_operadora
 *
 * Match: `data[].id` de casino-games/list ↔ ID na Gestão de Estúdios.
 * Fonte produto: https://bateu.bet.br/games/category/todos-os-jogos
 *   GET /api/casino-games/list/?categories[]=todos-os-jogos&page=&per_page=24
 * Concorrentes: mesmo tipo de jogo cujo id NÃO está na lista Spin.
 *
 * Chamada: POST {} ou { dry_run?: boolean, bateu_lobby?: LobbyGame[] }
 * Segurança: MONITOR_LOBBY_BATEU_INGEST_SECRET (header x-monitor-lobby-bateu-secret)
 *   ou Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Deploy: supabase functions deploy monitor-lobby-bateu
 */

const OPERADORA_SLUG = "bateu_bet";
const INTEGRACAO_SLUG = "lobby_bateu";
const LIST_URL = "https://bateu.bet.br/api/casino-games/list/";
const CATEGORY = "todos-os-jogos";
const PER_PAGE = 24;
const MAX_PAGES = 200;
const PAGE_ORIGIN = "https://bateu.bet.br";
const PAGE_REFERER = `${PAGE_ORIGIN}/games/category/todos-os-jogos`;

function bateuFetchHeaders(): Record<string, string> {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: PAGE_REFERER,
    Origin: PAGE_ORIGIN,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
}

interface MonitorBody {
  dry_run?: boolean;
  /** Lobby já obtido fora da Edge (Telecom). */
  bateu_lobby?: LobbyGame[];
  bateu_paginas_lidas?: number;
}

type TipoLobby =
  | "roleta"
  | "baccarat"
  | "blackjack"
  | "blackjack_vip"
  | "futebol"
  | "other";

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

function mergeMesasMonitorBateu(
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

async function carregarMesasMonitorBateu(
  supabase: ReturnType<typeof createClient>,
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

  if (juncRes.error) return { mesas: [], erro: juncRes.error.message };
  if (legadoRes.error) return { mesas: [], erro: legadoRes.error.message };

  return {
    mesas: mergeMesasMonitorBateu(
      (juncRes.data ?? []) as JunctionEmbed[],
      (legadoRes.data ?? []) as MesaCadastroComId[],
    ),
    erro: null,
  };
}

interface LobbyGame {
  posicao: number;
  game_id: string;
  name: string;
  slug: string;
  provider_name: string;
  provider_slug: string;
}

interface ListRecord {
  id: string | number;
  name?: string;
  slug?: string;
  provider?: { id?: number; name?: string };
}

interface ListResponse {
  data?: ListRecord[];
  last_page?: number;
  total?: number;
  per_page?: number;
}

interface ConcorrenteJson {
  posicao: number;
  game_id: string;
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
      "authorization, x-client-info, apikey, content-type, x-monitor-lobby-bateu-secret",
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
  const secret = Deno.env.get("MONITOR_LOBBY_BATEU_INGEST_SECRET")?.trim();
  if (!secret) return true;
  const h =
    req.headers.get("x-monitor-lobby-bateu-secret") ??
    req.headers.get("X-Monitor-Lobby-Bateu-Secret");
  if (h === secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (sr && auth === `Bearer ${sr}`) return true;
  return false;
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
  if (
    t.includes("futebol") ||
    t.includes("card match") ||
    t.includes("cardmatch")
  ) {
    return "futebol";
  }
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
  if (/futebol|cardmatch|card-match|card match/.test(s)) return "futebol";
  return "other";
}

function idsSpinSet(mesas: MesaCadastro[]): Set<string> {
  return new Set(
    mesas.map((m) => m.mesa_identificacao_operadora!.trim()).filter(Boolean),
  );
}

function idSpinMatches(gameId: string, idsSpin: Set<string>): boolean {
  return idsSpin.has(String(gameId));
}

function providerSlugFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("good game")) return "goodgame";
  if (n.includes("evolution")) return "evolution";
  if (n.includes("pragmatic")) return "pragmaticplay";
  if (n.includes("playtech")) return "playtech";
  if (n.includes("pg soft") || n.includes("pgsoft")) return "pgsoft";
  return n.replace(/\s+/g, "") || "unknown";
}

function isConcorrente(
  jogo: LobbyGame,
  tipoAlvo: TipoLobby,
  idsSpin: Set<string>,
): boolean {
  if (idSpinMatches(String(jogo.game_id), idsSpin)) return false;
  return tipoLobbyFromJogo(jogo.name, jogo.slug) === tipoAlvo;
}

function toConcorrenteJson(g: LobbyGame): ConcorrenteJson {
  return {
    posicao: g.posicao,
    game_id: g.game_id,
    name: g.name,
    slug: g.slug,
    provider_name: g.provider_name,
    provider_slug: g.provider_slug,
  };
}

function concorrentesAFrente(
  lobby: LobbyGame[],
  posicao: number,
  tipoAlvo: TipoLobby,
  idsSpin: Set<string>,
): ConcorrenteJson[] {
  return lobby
    .filter((g) => g.posicao < posicao && isConcorrente(g, tipoAlvo, idsSpin))
    .map((g) => toConcorrenteJson(g));
}

function jogosAFrentePiorMesaSpin(
  lobby: LobbyGame[],
  posicaoPiorMesa: number,
  idsSpin: Set<string>,
): ConcorrenteJson[] {
  return lobby
    .filter(
      (g) =>
        g.posicao < posicaoPiorMesa && !idSpinMatches(String(g.game_id), idsSpin),
    )
    .sort((a, b) => a.posicao - b.posicao)
    .map((g) => toConcorrenteJson(g));
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

async function fetchPagina(page: number): Promise<ListResponse> {
  const params = new URLSearchParams();
  params.append("categories[]", CATEGORY);
  params.set("page", String(page));
  params.set("per_page", String(PER_PAGE));
  const url = `${LIST_URL}?${params.toString()}`;
  const res = await fetch(url, { headers: bateuFetchHeaders() });
  if (!res.ok) {
    throw new Error(
      `Bateu casino-games/list HTTP ${res.status} (page=${page}). Se bloquear datacenter, use o script Telecom com bateu_lobby.`,
    );
  }
  return (await res.json()) as ListResponse;
}

function posicoesFromLobby(
  mesasEsperadas: MesaCadastro[],
  lobby: LobbyGame[],
): Map<string, number> {
  const idsEsperados = idsSpinSet(mesasEsperadas);
  const posicoes = new Map<string, number>();
  for (const g of lobby) {
    const idStr = String(g.game_id);
    if (idsEsperados.has(idStr) && !posicoes.has(idStr)) {
      posicoes.set(idStr, g.posicao);
    }
  }
  return posicoes;
}

async function escanearLobby(
  mesasEsperadas: MesaCadastro[],
): Promise<{
  lobby: LobbyGame[];
  posicoes: Map<string, number>;
  paginasLidas: number;
}> {
  const idsEsperados = idsSpinSet(mesasEsperadas);
  const lobby: LobbyGame[] = [];
  const posicoes = new Map<string, number>();
  let page = 1;
  let paginasLidas = 0;
  let lastPage = MAX_PAGES;

  while (page <= lastPage && page <= MAX_PAGES) {
    const data = await fetchPagina(page);
    const records = data.data ?? [];
    if (page === 1) {
      lastPage = Math.max(1, Number(data.last_page) || MAX_PAGES);
    }
    if (records.length === 0) break;
    paginasLidas = page;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const providerName = r.provider?.name ?? "";
      const item: LobbyGame = {
        posicao: (page - 1) * PER_PAGE + i + 1,
        game_id: String(r.id),
        name: r.name ?? "",
        slug: r.slug ?? "",
        provider_name: providerName,
        provider_slug: providerSlugFromName(providerName),
      };
      lobby.push(item);
      if (idsEsperados.has(item.game_id)) {
        posicoes.set(item.game_id, item.posicao);
      }
    }

    if (posicoes.size >= idsEsperados.size) break;
    page++;
  }

  return {
    lobby,
    posicoes,
    paginasLidas: paginasLidas || Math.max(0, page - 1),
  };
}

type SupabaseAdmin = ReturnType<typeof createClient>;

async function gravarSyncLogLobby(
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
    console.error("[monitor-lobby-bateu] Falha ao gravar sync_logs:", e);
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

  const { mesas: mesasList, erro: mesasLoadErr } =
    await carregarMesasMonitorBateu(supabase);
  if (mesasLoadErr) {
    return json({ ok: false, erro: mesasLoadErr }, req, 500);
  }

  if (mesasList.length === 0) {
    return json({
      ok: false,
      status: "erro_config",
      erro:
        `Nenhuma mesa Bateu com ID: preencha ID Bateu Bet em Gestão de Estúdios (operadora_slug=${OPERADORA_SLUG})`,
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

  const idsSpin = idsSpinSet(mesasList);
  let lobby: LobbyGame[] = [];
  let posicoes = new Map<string, number>();
  let paginasLidas = 0;
  let apiErro: string | null = null;

  if (Array.isArray(body.bateu_lobby) && body.bateu_lobby.length > 0) {
    lobby = body.bateu_lobby.map((g, i) => ({
      ...g,
      game_id: String(g.game_id),
      posicao: typeof g.posicao === "number" ? g.posicao : i + 1,
    }));
    paginasLidas = body.bateu_paginas_lidas ?? 1;
    posicoes = posicoesFromLobby(mesasList, lobby);
  } else {
    try {
      const scan = await escanearLobby(mesasList);
      lobby = scan.lobby;
      posicoes = scan.posicoes;
      paginasLidas = scan.paginasLidas;
    } catch (e) {
      apiErro = e instanceof Error ? e.message : String(e);
    }
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
    const tipo = tipoLobbyFromCadastro(m.tipo_jogo, m.nome_mesa);
    const concorrentes = pos != null
      ? concorrentesAFrente(lobby, pos, tipo, idsSpin)
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

  const piorMesaDry = piorMesaSpinLinhas(linhasPosicao);
  const jogosVitrineDry =
    piorMesaDry != null
      ? jogosAFrentePiorMesaSpin(lobby, piorMesaDry.posicao, idsSpin)
      : [];

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
      pior_mesa: piorMesaDry,
      jogos_a_frente_pior_mesa: jogosVitrineDry,
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

    await gravarSyncLogLobby(supabase, {
      status: "falha",
      registros_inseridos: mesasEncontradas,
      erros_count: Math.max(0, mesasList.length - mesasEncontradas),
      mensagem_erro: apiErro.slice(0, 2000),
      duracao_ms: duracaoMs,
    });

    return json({
      ok: false,
      status: "erro_api",
      execucao_id: execErr?.id ?? null,
      erro: apiErro,
    }, req, 200);
  }

  const piorMesa = piorMesaDry;
  const jogosVitrine = jogosVitrineDry;
  const mensagemErroParcial =
    status === "parcial"
      ? `Mesas não encontradas no lobby: ${
        mesasList
          .filter((m) => !posicoes.has(m.mesa_identificacao_operadora!.trim()))
          .map((m) => m.nome_mesa)
          .join(", ")
      }`.slice(0, 2000)
      : null;

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

  const rows = linhasPosicao.map((l) => ({
    ...l,
    execucao_id: exec.id,
  }));

  const { error: posErr } = await supabase.from("lobby_monitor_posicao").insert(rows);
  if (posErr) {
    await gravarSyncLogLobby(supabase, {
      status: "falha",
      registros_inseridos: 0,
      erros_count: mesasList.length,
      mensagem_erro: posErr.message.slice(0, 2000),
      duracao_ms: duracaoMs,
    });
    return json({
      ok: false,
      execucao_id: exec.id,
      erro: posErr.message,
    }, req, 500);
  }

  const errosParcial = Math.max(0, mesasList.length - mesasEncontradas);
  await gravarSyncLogLobby(supabase, {
    status: "ok",
    registros_inseridos: mesasEncontradas,
    erros_count: errosParcial,
    mensagem_erro: mensagemErroParcial,
    duracao_ms: duracaoMs,
  });

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
