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

function flattenItems(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return asArray(payload);
  const direct = [
    ...asArray(root.items),
    ...asArray(root.jogadores),
    ...asArray(root.players),
    ...asArray(root.data),
    ...asArray(root.rows),
  ];
  if (direct.length > 0) return direct;
  return [];
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
  const data = isoDate(pick(row, ["snapshot_date", "round_date", "data", "dia", "date", "day"]));
  if (!tap || !data) return null;
  const nestedMesas = [
    ...asArray(row.rounds),
    ...asArray(row.mesas),
    ...asArray(row.por_mesa),
    ...asArray(row.tables),
  ];
  const porMesa = nestedMesas.map((m) => {
    const r = asRecord(m);
    return r ? mesaFromRow(r) : { mesa: "", jogo: null, rodadas: 0, ggr: null, turnover: null };
  }).filter((m) => m.mesa || (m.rodadas > 0));
  const apostas = num(pick(row, ["bet_count", "apostas", "apostas_spin", "bets"])) ?? porMesa.reduce((s, m) => s + m.rodadas, 0);
  const rodadas = num(pick(row, ["rodadas_spin", "rodadas", "rounds", "round_count"])) ?? apostas;
  const ggr = num(pick(row, ["ggr", "ggr_spin"]));
  const turnover = num(pick(row, ["turnover", "turnover_spin"]));
  const porJogo: Record<string, number> = {};
  if (porMesa.length > 0) {
    for (const m of porMesa) mergeJogo(porJogo, m.jogo, m.rodadas);
  } else {
    mergeJogo(porJogo, jogoIdentidadeDeMesa(str(pick(row, ["game_name", "jogo", "table_name", "mesa"]))), rodadas);
  }
  const jogou = rodadas > 0 || apostas > 0 || (ggr != null && ggr !== 0) || (turnover != null && turnover !== 0);
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

/** Normaliza o JSON do POST (formato ainda evolui no RS). */
export function parseJogadoresSpinResponse(payload: unknown): RsJogadoresSpinParse {
  const missing = collectMissing(payload);
  const dias: RsSpinDia[] = [];
  const seen = new Set<string>();

  const push = (d: RsSpinDia | null) => {
    if (!d) return;
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
    const nestedDias = [
      ...asArray(row.dias),
      ...asArray(row.days),
      ...asArray(row.snapshots),
      ...asArray(row.daily),
    ];
    const fallbackExt = str(pick(row, ["ext_customer_id", "external_id", "crm_id"]));
    if (nestedDias.length > 0) {
      for (const d of nestedDias) {
        const inner = asRecord(d);
        if (inner) push(diaFromFlat({ ...row, ...inner }, fallbackExt));
      }
      continue;
    }
    const nestedRounds = asArray(row.rounds);
    if (nestedRounds.length > 0 && !isoDate(pick(row, ["snapshot_date", "data", "date"]))) {
      for (const r of nestedRounds) {
        const inner = asRecord(r);
        if (inner) push(diaFromFlat({ ...row, ...inner }, fallbackExt));
      }
      continue;
    }
    push(diaFromFlat(row, fallbackExt));
  }

  return { dias, missing };
}

export function chunkIds(ids: string[], size = RS_JOGADORES_SPIN_CHUNK): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
