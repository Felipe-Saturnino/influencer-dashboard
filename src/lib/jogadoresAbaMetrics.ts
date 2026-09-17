import { GAME_IDENTITY_HEX, GAME_IDENTITY_LABEL, gameIdentityFromTexto, type GameIdentityKey } from "./gameIdentityColors";

/** Limiar visual do Comparativo de Taxas (mockup: amarelo/roxo abaixo de 50%). */
export const JOGADORES_TAXA_BAIXA_PCT = 50;

export type JogadorAbaDailyFact = {
  operadora_slug: string;
  ext_customer_id: string;
  influencer_id: string | null;
  registration_count: number;
  deposit_count: number;
  rodadas_spin: number;
  ggr_spin: number | null;
  turnover_spin: number | null;
  jogou_spin: boolean | null;
  jogou_outros: boolean | null;
  rodadas_por_jogo: Record<string, number> | null;
  rodadas_por_mesa: unknown;
};

/** KPIs da aba a partir dos fatos TAP + rodadas detalhadas do Revenue Sentinel. */
export type JogadorAbaKpis = {
  registros: number;
  jogaramSpin: number;
  jogaramOutros: number;
  naoJogaram: number;
  jogaram: number;
  taxaAtivacao: number | null;
  rodadas: number;
  mediaRodadas: number | null;
  ggrSpin: number;
  turnoverSpin: number;
};

export type JogadorAbaInfluencerRow = {
  influencer_id: string;
  nome: string;
  registros: number;
  jogaram: number;
  jogaramSpin: number;
  jogaramOutros: number;
  naoJogaram: number;
  pctRegJog: number | null;
  pctJogSpin: number | null;
  pctRegSpin: number | null;
  rodadas: number;
  ggrSpin: number;
  turnoverSpin: number;
};

export type JogadorAbaMesaBar = {
  key: string;
  estudio: string;
  mesa: string;
  rodadas: number;
  jogo: GameIdentityKey | null;
  cor: string;
};

type PlayerFold = {
  influencer_id: string | null;
  registrou: boolean;
  spin: boolean;
  depositou: boolean;
  rodadas: number;
  ggr: number;
  turnover: number;
};

function n(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function playerKey(operadoraSlug: string, extCustomerId: string): string {
  return `${operadoraSlug}\0${extCustomerId}`;
}

function asMesaItens(raw: unknown): Array<{ estudio?: string; mesa?: string; jogo?: string; rodadas?: number }> {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: Array<{ estudio?: string; mesa?: string; jogo?: string; rodadas?: number }> = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    out.push({
      estudio: typeof rec.estudio === "string" ? rec.estudio : undefined,
      mesa: typeof rec.mesa === "string" ? rec.mesa : typeof rec.table_name === "string" ? rec.table_name : undefined,
      jogo: typeof rec.jogo === "string" ? rec.jogo : typeof rec.game_name === "string" ? rec.game_name : undefined,
      rodadas: typeof rec.rodadas === "number" ? rec.rodadas : undefined,
    });
  }
  return out;
}

function foldPlayers(rows: JogadorAbaDailyFact[]): Map<string, PlayerFold> {
  const map = new Map<string, PlayerFold>();
  for (const r of rows) {
    const ext = (r.ext_customer_id ?? "").trim();
    if (!ext) continue;
    const k = playerKey(r.operadora_slug, ext);
    let p = map.get(k);
    if (!p) {
      p = {
        influencer_id: r.influencer_id,
        registrou: false,
        spin: false,
        depositou: false,
        rodadas: 0,
        ggr: 0,
        turnover: 0,
      };
      map.set(k, p);
    }
    if (!p.influencer_id && r.influencer_id) p.influencer_id = r.influencer_id;
    if (n(r.registration_count) > 0) p.registrou = true;
    if (n(r.deposit_count) > 0) p.depositou = true;
    const rodadas = n(r.rodadas_spin);
    p.rodadas += rodadas;
    p.ggr += n(r.ggr_spin);
    p.turnover += n(r.turnover_spin);
    if (rodadas > 0) p.spin = true;
  }
  return map;
}

/**
 * Recorte pós-fetch: KPIs, ranking e mesas usam o mesmo universo dos filtros.
 * `influencerIds`/`operadoraSlugs` `null` = sem filtro nessa dimensão.
 * `incluirSemInfluencer` só na visão global (admin/gestor/operador) — `proprios` não conta ID Ext sem `influencer_id`.
 */
export function recortarJogadoresAbaDaily(
  rows: JogadorAbaDailyFact[],
  recorte: {
    influencerIds: string[] | null;
    operadoraSlugs: string[] | null;
    incluirSemInfluencer: boolean;
  },
): JogadorAbaDailyFact[] {
  if (recorte.operadoraSlugs && recorte.operadoraSlugs.length === 0) return [];
  if (recorte.influencerIds && recorte.influencerIds.length === 0) return [];
  const inf = recorte.influencerIds ? new Set(recorte.influencerIds) : null;
  const ops = recorte.operadoraSlugs ? new Set(recorte.operadoraSlugs) : null;
  return rows.filter((r) => {
    if (ops && !ops.has(r.operadora_slug)) return false;
    if (inf) return Boolean(r.influencer_id && inf.has(r.influencer_id));
    if (!recorte.incluirSemInfluencer && !r.influencer_id) return false;
    return true;
  });
}

export function kpisJogadoresAba(rows: JogadorAbaDailyFact[]): JogadorAbaKpis {
  const players = foldPlayers(rows);
  let registros = 0;
  let jogaramSpin = 0;
  let jogaramOutros = 0;
  let naoJogaram = 0;
  let rodadas = 0;
  let ggrSpin = 0;
  let turnoverSpin = 0;
  for (const p of players.values()) {
    if (!p.registrou) continue;
    registros += 1;
    if (p.spin) {
      jogaramSpin += 1;
      // Volume só de quem entra no card Jogaram Spin — mantém Média = Rodadas ÷ Jogaram Spin.
      rodadas += p.rodadas;
      ggrSpin += p.ggr;
      turnoverSpin += p.turnover;
    } else if (p.depositou) jogaramOutros += 1;
    else naoJogaram += 1;
  }
  return {
    registros,
    jogaramSpin,
    jogaramOutros,
    naoJogaram,
    jogaram: jogaramSpin + jogaramOutros,
    taxaAtivacao: registros === 0 ? null : (jogaramSpin / registros) * 100,
    rodadas,
    mediaRodadas: jogaramSpin === 0 ? null : rodadas / jogaramSpin,
    ggrSpin,
    turnoverSpin,
  };
}

export function pctJogadores(num: number, den: number): number | null {
  return den === 0 ? null : (num / den) * 100;
}

export function fmtPctJogadores(v: number | null): string {
  if (v == null) return "—";
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function rankingJogadoresAba(
  rows: JogadorAbaDailyFact[],
  nomes: Map<string, string>,
): JogadorAbaInfluencerRow[] {
  const players = foldPlayers(rows);
  const byInf = new Map<
    string,
    {
      registros: Set<string>;
      outros: Set<string>;
      spin: Set<string>;
      rodadas: number;
      ggr: number;
      turnover: number;
    }
  >();

  for (const [key, p] of players) {
    const inf = p.influencer_id;
    if (!inf || !nomes.has(inf)) continue;
    if (!p.registrou) continue;
    let g = byInf.get(inf);
    if (!g) {
      g = { registros: new Set(), outros: new Set(), spin: new Set(), rodadas: 0, ggr: 0, turnover: 0 };
      byInf.set(inf, g);
    }
    g.registros.add(key);
    if (p.spin) {
      g.spin.add(key);
      g.rodadas += p.rodadas;
      g.ggr += p.ggr;
      g.turnover += p.turnover;
    } else if (p.depositou) g.outros.add(key);
  }

  const out: JogadorAbaInfluencerRow[] = [];
  for (const [influencer_id, g] of byInf) {
    const registros = g.registros.size;
    const jogaramSpin = g.spin.size;
    const jogaramOutros = g.outros.size;
    const naoJogaram = Math.max(0, registros - jogaramSpin - jogaramOutros);
    out.push({
      influencer_id,
      nome: nomes.get(influencer_id) ?? "—",
      registros,
      jogaram: jogaramSpin + jogaramOutros,
      jogaramSpin,
      jogaramOutros,
      naoJogaram,
      pctRegJog: pctJogadores(jogaramSpin + jogaramOutros, registros),
      pctJogSpin: pctJogadores(jogaramSpin, jogaramSpin + jogaramOutros),
      pctRegSpin: pctJogadores(jogaramSpin, registros),
      rodadas: g.rodadas,
      ggrSpin: g.ggr,
      turnoverSpin: g.turnover,
    });
  }
  return out.sort((a, b) => b.rodadas - a.rodadas || a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Linhas dos jogadores contados em **Jogaram Spin** (registro e rodada no período).
 * Mesas e ranking leem daqui para fechar com o card de Rodadas.
 */
export function filtrarRowsJogaramSpin(rows: JogadorAbaDailyFact[]): JogadorAbaDailyFact[] {
  const players = foldPlayers(rows);
  const elegiveis = new Set<string>();
  for (const [key, p] of players) {
    if (p.registrou && p.spin) elegiveis.add(key);
  }
  if (elegiveis.size === 0) return [];
  return rows.filter((r) => {
    const ext = (r.ext_customer_id ?? "").trim();
    return ext ? elegiveis.has(playerKey(r.operadora_slug, ext)) : false;
  });
}

export function mesasJogadoresAba(rows: JogadorAbaDailyFact[]): JogadorAbaMesaBar[] {
  const acc = new Map<string, { estudio: string; mesa: string; rodadas: number; jogo: GameIdentityKey | null }>();
  for (const r of rows) {
    const itens = asMesaItens(r.rodadas_por_mesa);
    let detalhadas = 0;
    if (itens.length) {
      for (const m of itens) {
        const rodadas = n(m.rodadas);
        if (rodadas <= 0) continue;
        detalhadas += rodadas;
        const mesa = (m.mesa ?? "").trim() || "Mesa";
        const estudio = (m.estudio ?? "").trim() || "—";
        const jogo = gameIdentityFromTexto(m.jogo ?? "") ?? gameIdentityFromTexto(mesa);
        const key = `${estudio}\0${mesa}`;
        const prev = acc.get(key);
        if (prev) prev.rodadas += rodadas;
        else acc.set(key, { estudio, mesa, rodadas, jogo });
      }
    }
    const jogos = r.rodadas_por_jogo;
    if (itens.length === 0 && jogos && typeof jogos === "object") {
      for (const [jogoRaw, qtd] of Object.entries(jogos)) {
        const rodadas = n(qtd);
        if (rodadas <= 0) continue;
        detalhadas += rodadas;
        const jogo = gameIdentityFromTexto(jogoRaw);
        const mesa = jogo ? GAME_IDENTITY_LABEL[jogo] : jogoRaw;
        const key = `—\0${mesa}`;
        const prev = acc.get(key);
        if (prev) prev.rodadas += rodadas;
        else acc.set(key, { estudio: "—", mesa, rodadas, jogo });
      }
    }
    const semDetalhe = Math.max(0, n(r.rodadas_spin) - detalhadas);
    if (semDetalhe > 0) {
      const key = `—\0Mesa não informada`;
      const prev = acc.get(key);
      if (prev) prev.rodadas += semDetalhe;
      else acc.set(key, { estudio: "—", mesa: "Mesa não informada", rodadas: semDetalhe, jogo: null });
    }
  }
  return [...acc.entries()]
    .map(([key, v]) => ({
      key,
      estudio: v.estudio,
      mesa: v.mesa,
      rodadas: v.rodadas,
      jogo: v.jogo,
      cor: v.jogo ? GAME_IDENTITY_HEX[v.jogo] : "#6b7280",
    }))
    .sort((a, b) => b.rodadas - a.rodadas);
}

export type JogadoresRegistrosUnicos = {
  total: number;
  porInfluencer: Map<string, number>;
};

export function registrosUnicosVazios(): JogadoresRegistrosUnicos {
  return { total: 0, porInfluencer: new Map() };
}

/**
 * IDs Ext únicos com cadastro TAP no período (first-touch no influencer).
 * Mesmo recorte da aba Jogadores: só quem tem `influencer_id`.
 */
export function contarRegistrosUnicosJogadores(
  rows: Array<Pick<JogadorAbaDailyFact, "operadora_slug" | "ext_customer_id" | "influencer_id" | "registration_count">>,
): JogadoresRegistrosUnicos {
  const seen = new Map<string, string>();
  for (const r of rows) {
    if (!r.influencer_id) continue;
    if (n(r.registration_count) <= 0) continue;
    const ext = (r.ext_customer_id ?? "").trim();
    if (!ext) continue;
    const k = playerKey(r.operadora_slug, ext);
    if (!seen.has(k)) seen.set(k, r.influencer_id);
  }
  const porInfluencer = new Map<string, number>();
  for (const inf of seen.values()) {
    porInfluencer.set(inf, (porInfluencer.get(inf) ?? 0) + 1);
  }
  return { total: seen.size, porInfluencer };
}

export function aplicarRegistrosUnicosPorInfluencer<T extends { influencer_id: string; registros: number }>(
  rows: T[],
  porInfluencer: Map<string, number>,
): T[] {
  return rows.map((r) => ({ ...r, registros: porInfluencer.get(r.influencer_id) ?? 0 }));
}

export function kpisVaziosJogadoresAba(): JogadorAbaKpis {
  return {
    registros: 0,
    jogaramSpin: 0,
    jogaramOutros: 0,
    naoJogaram: 0,
    jogaram: 0,
    taxaAtivacao: null,
    rodadas: 0,
    mediaRodadas: null,
    ggrSpin: 0,
    turnoverSpin: 0,
  };
}
