/** Parser do POST Data Export `/v1/jogadores/spin` (Revenue Sentinel). Sem PII. */

export const RS_JOGADORES_SPIN_CHUNK = 500;
export const RS_OPERADORA_SLUG_CDA = "casa_apostas";

export type RsSpinDia = {
  ext_customer_id: string;
  data: string;
  player_id_bko: string | null;
  identity_key: string | null;
  rodadas_spin: number;
  apostas_spin: number;
  ggr_spin: number | null;
  turnover_spin: number | null;
  jogou_spin: boolean;
  rodadas_por_jogo: Record<string, number>;
  rodadas_por_mesa: Array<{ mesa?: string; jogo?: string; rodadas?: number; ggr?: number; turnover?: number }>;
};

export type RsJogadoresSpinParse = {
  dias: RsSpinDia[];
  missing: string[];
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function isoDate(v: unknown): string | null {
  const s = str(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return null;
}

/** TAP numérico a partir do OnAir `…CDA-2185779` ou do próprio ID Ext. */
export function tapIdFromRsExternal(raw: string): string {
  const s = str(raw);
  if (!s) return "";
  if (/^\d+$/.test(s)) return s;
  const cda = s.match(/CDA-(\d+)/i);
  if (cda?.[1]) return cda[1];
  const digits = s.match(/(\d{5,})\s*$/);
  return digits?.[1] ?? s;
}

export function jogoIdentidadeDeMesa(nome: string): string | null {
  const n = nome.toLowerCase();
  if (!n) return null;
  if (n.includes("blackjack") || n.includes("bj")) return "blackjack";
  if (n.includes("baccarat") || n.includes("bacará") || n.includes("bacara")) return "baccarat";
  if (n.includes("roleta") || n.includes("roulette")) return "roleta";
  if (n.includes("futebol") || n.includes("football")) return "futebol_brasileiro";
  return null;
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k];
  }
  return undefined;
}

function mergeJogo(into: Record<string, number>, jogo: string | null, n: number) {
  if (!jogo || n <= 0) return;
  into[jogo] = (into[jogo] ?? 0) + n;
}

function asList(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  const rec = asRecord(v);
  if (!rec) return [];
  const keys = Object.keys(rec);
  if (keys.length === 0) return [];
  const allDates = keys.every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
  const allIds = keys.every((k) => /^\d+$/.test(k) || /CDA-\d+/i.test(k) || k.includes("."));
  const allObjects = keys.every((k) => asRecord(rec[k]) != null || Array.isArray(rec[k]));
  if (!allDates && !allIds && !allObjects) return [];
  return keys.map((k) => {
    const inner = rec[k];
    const obj = asRecord(inner);
    if (allDates && obj) return { ...obj, snapshot_date: obj.snapshot_date || k, data: obj.data || k };
    if ((allIds || allObjects) && obj) {
      return {
        ...obj,
        ext_customer_id: obj.ext_customer_id || obj.crm_id || (/^\d+$/.test(k) ? k : obj.ext_customer_id),
      };
    }
    return inner;
  });
}

function flattenItems(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return asArray(payload);
  // `found` no contrato atual é contagem (number), não lista — não misturar com jogadores.
  const direct = [
    "jogadores",
    "items",
    "players",
    "rows",
    "results",
    "hits",
    "jogadores_spin",
  ].flatMap((k) => asList(root[k]));
  if (direct.length > 0) return direct;
  const foundList = asList(root.found);
  if (foundList.length > 0) return foundList;
  const dataList = asList(root.data);
  if (dataList.length > 0) return dataList;
  if (asArray(root.missing).length > 0 || asArray(root.missing_ids).length > 0) return [];
  return asList(payload);
}

/** Chaves do JSON RS — sem valores, para dry_run / log. */
export function summarizeRsPayload(payload: unknown): {
  kind: string;
  keys: string[];
  item_keys: string[];
  n_items: number;
  spin_kind?: string;
  spin_keys?: string[];
  bko_kind?: string;
  bko_keys?: string[];
  n_spin_days?: number;
  spin_day_keys?: string[];
} {
  if (payload == null) return { kind: "null", keys: [], item_keys: [], n_items: 0 };
  if (Array.isArray(payload)) {
    const first = asRecord(payload[0]);
    return {
      kind: "array",
      keys: [],
      item_keys: first ? Object.keys(first).slice(0, 24) : [],
      n_items: payload.length,
    };
  }
  const root = asRecord(payload);
  if (!root) return { kind: typeof payload, keys: [], item_keys: [], n_items: 0 };
  const items = flattenItems(payload);
  const first = asRecord(items[0]);
  const spinNode = first?.spin;
  const bkoNode = first?.bko;
  const spinRec = asRecord(spinNode);
  const bkoRec = asRecord(bkoNode);
  const harvested: RsSpinDia[] = [];
  const ext = first ? str(first.ext_customer_id) : "";
  if (bkoNode != null && first) harvestDatedMetrics(bkoNode, ext, harvested, 0);
  if (harvested.length === 0 && spinNode != null && first) harvestDatedMetrics(spinNode, ext, harvested, 0);
  const firstDay = harvested[0];
  return {
    kind: "object",
    keys: Object.keys(root).slice(0, 24),
    item_keys: first ? Object.keys(first).slice(0, 24) : [],
    n_items: items.length,
    spin_kind: Array.isArray(spinNode) ? "array" : spinNode == null ? "null" : typeof spinNode,
    spin_keys: spinRec ? Object.keys(spinRec).slice(0, 24) : Array.isArray(spinNode) ? ["(array)"] : [],
    bko_kind: Array.isArray(bkoNode) ? "array" : bkoNode == null ? "null" : typeof bkoNode,
    bko_keys: bkoRec ? Object.keys(bkoRec).slice(0, 24) : Array.isArray(bkoNode) ? ["(array)"] : [],
    n_spin_days: harvested.length,
    spin_day_keys: firstDay ? ["data", "ggr_spin", "turnover_spin", "rodadas_spin"] : [],
  };
}

function collectMissing(payload: unknown): string[] {
  const root = asRecord(payload);
  if (!root) return [];
  const raw = root.missing ?? root.missing_ids ?? root.not_found ?? root.ids_missing;
  return asArray(raw).map((x) => tapIdFromRsExternal(str(x))).filter(Boolean);
}

function mesaFromRow(row: Record<string, unknown>): { mesa: string; jogo: string | null; rodadas: number; ggr: number | null; turnover: number | null } {
  const mesa = str(pick(row, ["table_name", "mesa", "table", "game_table"]));
  const jogoNome = str(pick(row, ["game_name", "jogo", "game"]));
  const jogo = jogoIdentidadeDeMesa(jogoNome || mesa);
  const rodadas = num(pick(row, ["bet_count", "rodadas", "rounds", "round_count"])) ?? 0;
  return {
    mesa: mesa || jogoNome,
    jogo,
    rodadas,
    ggr: num(pick(row, ["ggr", "ggr_spin"])),
    turnover: num(pick(row, ["turnover", "turnover_spin"])),
  };
}

function diaFromFlat(row: Record<string, unknown>, fallbackExt: string): RsSpinDia | null {
  const external = str(pick(row, ["external_id", "player_id_bko", "player_external_id", "onair_id"]));
  const tap = tapIdFromRsExternal(
    str(pick(row, ["ext_customer_id", "crm_id", "tap_id", "customer_id"])) || external || fallbackExt,
  );
  const data = isoDate(pick(row, [
    "snapshot_date",
    "snapshotDate",
    "round_date",
    "round_day",
    "game_date",
    "bet_date",
    "played_at",
    "created_at",
    "data",
    "dia",
    "date",
    "day",
    "day_date",
    "dt",
  ]));
  if (!tap || !data) return null;
  const nestedMesas = [
    ...asArray(row.rounds),
    ...asArray(row.mesas),
    ...asArray(row.por_mesa),
    ...asArray(row.tables),
    ...asArray(row.hands),
  ];
  const porMesa = nestedMesas.map((m) => {
    const r = asRecord(m);
    return r ? mesaFromRow(r) : { mesa: "", jogo: null, rodadas: 0, ggr: null, turnover: null };
  }).filter((m) => m.mesa || (m.rodadas > 0));
  const apostas = num(pick(row, ["bet_count", "apostas", "apostas_spin", "bets", "hand_count", "n_hands"])) ?? porMesa.reduce((s, m) => s + m.rodadas, 0);
  const roundsAsNum = Array.isArray(row.rounds) ? null : num(row.rounds);
  const rodadasRaw = num(pick(row, ["round_count", "rodadas_spin", "rodadas", "n_rounds", "hands_count"])) ?? roundsAsNum;
  const rodadas = rodadasRaw ?? apostas;
  const ggr = num(pick(row, ["ggr", "ggr_spin", "spin_ggr"]));
  const turnover = num(pick(row, ["turnover", "turnover_spin", "spin_turnover"]));
  const porJogo: Record<string, number> = {};
  if (porMesa.length > 0) {
    for (const m of porMesa) mergeJogo(porJogo, m.jogo, m.rodadas);
  } else {
    mergeJogo(porJogo, jogoIdentidadeDeMesa(str(pick(row, ["game_name", "jogo", "table_name", "mesa"]))), rodadas);
  }
  const jogou = rodadas > 0 || apostas > 0;
  if (!jogou) return null;
  return {
    ext_customer_id: tap,
    data,
    player_id_bko: external || null,
    identity_key: str(pick(row, ["identity_key", "unified_player_key"])) || null,
    rodadas_spin: rodadas,
    apostas_spin: apostas,
    ggr_spin: ggr,
    turnover_spin: turnover,
    jogou_spin: jogou,
    rodadas_por_jogo: porJogo,
    rodadas_por_mesa: porMesa.map((m) => ({
      mesa: m.mesa || undefined,
      jogo: m.jogo || undefined,
      rodadas: m.rodadas,
      ggr: m.ggr ?? undefined,
      turnover: m.turnover ?? undefined,
    })),
  };
}

function lifetimeDateFromSpin(spin: Record<string, unknown>): string | null {
  return isoDate(pick(spin, [
    "ultima",
    "ultima_data",
    "last_date",
    "last_day",
    "last_snapshot",
    "max_date",
    "snapshot_date",
    "data",
  ]));
}

function windowTotalsFromBlock(rec: Record<string, unknown> | null): {
  rodadas: number;
  apostas: number;
  ggr: number | null;
  turnover: number | null;
} | null {
  if (!rec) return null;
  const apostas = num(pick(rec, ["bet_count", "apostas", "apostas_spin", "bets", "hand_count"])) ?? 0;
  const roundsAsNum = Array.isArray(rec.rounds) ? null : num(rec.rounds);
  const rodadas = num(pick(rec, ["round_count", "rodadas_spin", "rodadas", "n_rounds"])) ?? roundsAsNum ?? 0;
  const ggr = num(pick(rec, ["ggr", "ggr_spin", "spin_ggr"]));
  const turnover = num(pick(rec, ["turnover", "turnover_spin"]));
  if (rodadas <= 0 && apostas <= 0) return null;
  return {
    rodadas: rodadas > 0 ? rodadas : apostas,
    apostas: apostas > 0 ? apostas : rodadas,
    ggr,
    turnover,
  };
}

/**
 * Percorre fatos datados em `spin` e, se não houver rodada, em `bko`.
 * Só persiste dia com round_count / bet_count > 0.
 */
function harvestDatedMetrics(node: unknown, fallbackExt: string, acc: RsSpinDia[], depth: number): void {
  if (depth > 8 || node == null) return;
  if (Array.isArray(node)) {
    for (const x of node) harvestDatedMetrics(x, fallbackExt, acc, depth + 1);
    return;
  }
  const rec = asRecord(node);
  if (!rec) return;
  const d = diaFromFlat(rec, fallbackExt);
  if (d) {
    acc.push(d);
    return;
  }
  for (const [k, v] of Object.entries(rec)) {
    const inner = asRecord(v);
    if (inner && isoDate(k)) {
      harvestDatedMetrics(
        { ...inner, snapshot_date: inner.snapshot_date || k, data: inner.data || k },
        fallbackExt,
        acc,
        depth + 1,
      );
      continue;
    }
    harvestDatedMetrics(v, fallbackExt, acc, depth + 1);
  }
}

function soComRodadaSpin(dias: RsSpinDia[]): RsSpinDia[] {
  return dias
    .filter((d) => d.rodadas_spin > 0 || d.apostas_spin > 0)
    .map((d) => ({ ...d, jogou_spin: true }));
}

function diaTotaisJanela(
  ext: string,
  data: string,
  totals: { rodadas: number; apostas: number; ggr: number | null; turnover: number | null },
  playerIdBko: string | null,
): RsSpinDia | null {
  if (totals.rodadas <= 0 && totals.apostas <= 0) return null;
  return diaFromFlat({
    ext_customer_id: ext,
    data,
    snapshot_date: data,
    external_id: playerIdBko ?? "",
    round_count: totals.rodadas,
    bet_count: totals.apostas,
    ggr: totals.ggr,
    turnover: totals.turnover,
  }, ext);
}

function diasDoJogadorRs(row: Record<string, unknown>, fallbackAte: string | null): RsSpinDia[] {
  const fallbackExt = str(pick(row, ["ext_customer_id", "external_id", "crm_id"]));
  const acc: RsSpinDia[] = [];
  // Rodadas Spin vêm do bloco `spin` (round_count). `bko` só entra se tiver rodada > 0.
  if (row.spin != null) harvestDatedMetrics(row.spin, fallbackExt, acc, 0);
  if (soComRodadaSpin(acc).length === 0 && row.bko != null) {
    acc.length = 0;
    harvestDatedMetrics(row.bko, fallbackExt, acc, 0);
  }
  const comRodada = soComRodadaSpin(acc);
  if (comRodada.length > 0) return comRodada;

  const nestedDias = [
    ...asList(row.dias),
    ...asList(row.days),
    ...asList(row.snapshots),
    ...asList(row.daily),
    ...asList(row.by_day),
    ...asList(row.por_dia),
  ];
  if (nestedDias.length > 0) {
    for (const d of nestedDias) {
      const inner = asRecord(d);
      if (!inner) continue;
      const parsed = diaFromFlat({ ...row, ...inner }, fallbackExt);
      if (parsed) acc.push(parsed);
    }
    const nested = soComRodadaSpin(acc);
    if (nested.length > 0) return nested;
  }

  const nestedRounds = asArray(row.rounds);
  if (nestedRounds.length > 0 && !isoDate(pick(row, ["snapshot_date", "data", "date"]))) {
    for (const r of nestedRounds) {
      const inner = asRecord(r);
      if (!inner) continue;
      const parsed = diaFromFlat({ ...row, ...inner }, fallbackExt);
      if (parsed) acc.push(parsed);
    }
    const fromRounds = soComRodadaSpin(acc);
    if (fromRounds.length > 0) return fromRounds;
  }

  const flat = diaFromFlat(row, fallbackExt);
  if (flat && (flat.rodadas_spin > 0 || flat.apostas_spin > 0)) {
    return soComRodadaSpin([flat]);
  }

  // Totais da janela de/ate — só se round_count / bet_count > 0. Presença no RS não conta.
  const spinRec = asRecord(row.spin);
  const bkoRec = asRecord(row.bko);
  const data =
    lifetimeDateFromSpin(spinRec ?? {}) ||
    lifetimeDateFromSpin(bkoRec ?? {}) ||
    fallbackAte;
  if (!fallbackExt || !data) return [];
  const totals = windowTotalsFromBlock(spinRec) || windowTotalsFromBlock(bkoRec);
  if (!totals) return [];
  const one = diaTotaisJanela(
    fallbackExt,
    data,
    totals,
    str(pick(row, ["external_id", "player_id_bko"])) || null,
  );
  return one ? soComRodadaSpin([one]) : [];
}

/** Normaliza o JSON do POST (formato ainda evolui no RS). */
export function parseJogadoresSpinResponse(payload: unknown): RsJogadoresSpinParse {
  const missing = collectMissing(payload);
  const dias: RsSpinDia[] = [];
  const seen = new Set<string>();
  const root = asRecord(payload);
  const ateJanela = root ? isoDate(root.ate) : null;

  const push = (d: RsSpinDia | null) => {
    if (!d) return;
    if (d.rodadas_spin <= 0 && d.apostas_spin <= 0) return;
    d.jogou_spin = true;
    const k = `${d.ext_customer_id}|${d.data}`;
    const prev = dias.find((x) => `${x.ext_customer_id}|${x.data}` === k);
    if (!prev) {
      seen.add(k);
      dias.push(d);
      return;
    }
    prev.rodadas_spin += d.rodadas_spin;
    prev.apostas_spin += d.apostas_spin;
    prev.ggr_spin = (prev.ggr_spin ?? 0) + (d.ggr_spin ?? 0);
    prev.turnover_spin = (prev.turnover_spin ?? 0) + (d.turnover_spin ?? 0);
    prev.jogou_spin = prev.jogou_spin || d.jogou_spin;
    prev.player_id_bko = prev.player_id_bko || d.player_id_bko;
    prev.identity_key = prev.identity_key || d.identity_key;
    for (const [jogo, n] of Object.entries(d.rodadas_por_jogo)) {
      prev.rodadas_por_jogo[jogo] = (prev.rodadas_por_jogo[jogo] ?? 0) + n;
    }
    prev.rodadas_por_mesa.push(...d.rodadas_por_mesa);
  };

  for (const item of flattenItems(payload)) {
    const row = asRecord(item);
    if (!row) continue;
    for (const d of diasDoJogadorRs(row, ateJanela)) push(d);
  }

  return { dias, missing };
}

export function chunkIds(ids: string[], size = RS_JOGADORES_SPIN_CHUNK): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
