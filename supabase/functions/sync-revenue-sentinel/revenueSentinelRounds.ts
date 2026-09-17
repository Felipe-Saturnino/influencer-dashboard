import {
  jogoIdentidadeDeMesa,
  tapIdFromRsExternal,
  type RsSpinDia,
} from "./revenueSentinelJogadores.ts";

export const RS_ROUNDS_DATASET = "operator-player-rounds";
export const RS_ROUNDS_PAGE_SIZE = 10_000;

export type RsMesaCatalogo = {
  id: string;
  nome_mesa: string;
  tipo_jogo: string;
  mesa_identificacao: string;
  mesa_identificacao_operadora: string | null;
  operadora_slug: string;
  estudio_slug: string | null;
  estudio_tipo: "dedicado" | "network" | null;
  identificacao_cda: string | null;
};

type RsRoundRow = {
  id?: unknown;
  external_id?: unknown;
  game_id?: unknown;
  table_name?: unknown;
  game_table_id?: unknown;
  game_type?: unknown;
  round_date?: unknown;
  turnover?: unknown;
  ggr?: unknown;
  bet_count?: unknown;
};

export type RsRoundsResumo = {
  dias: RsSpinDia[];
  linhasLidas: number;
  linhasDosIds: number;
  duplicadas: number;
  mesasSemCadastro: string[];
};

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
}

function texto(v: unknown): string {
  return typeof v === "string" || typeof v === "number" ? String(v).trim() : "";
}

function numero(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function dataIso(v: unknown): string {
  const s = texto(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
}

function chave(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Remove somente a marca de lobby; não transforma operadora em estúdio. */
export function nomeMesaRsCda(tableName: string): string {
  return tableName
    .trim()
    .replace(/^casa\s+de\s+apostas\s*[-–—:]?\s*/i, "")
    .trim() || tableName.trim() || "Mesa não informada";
}

function linhasEnvelope(payload: unknown): unknown[] {
  const root = rec(payload);
  if (!root) return Array.isArray(payload) ? payload : [];
  for (const key of ["items", "rows", "data", "results", "records"]) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }
  return [];
}

export function totalRsRoundsPayload(payload: unknown): number | null {
  const root = rec(payload);
  const n = numero(root?.total ?? root?.count ?? root?.row_count);
  return n > 0 ? n : null;
}

type MesaResolvida = {
  estudio: "Dedicada" | "Network";
  mesa: string;
  jogo: string | null;
  cadastrada: boolean;
};

function resolverMesa(
  row: RsRoundRow,
  catalogo: RsMesaCatalogo[],
): MesaResolvida {
  const tableId = chave(texto(row.game_table_id));
  const tableName = texto(row.table_name);
  const nomeLimpo = nomeMesaRsCda(tableName);
  const nomeKey = chave(nomeLimpo);
  const match = catalogo.find((m) => {
    const ids = [
      m.mesa_identificacao,
      m.mesa_identificacao_operadora ?? "",
      m.identificacao_cda ?? "",
    ].map(chave).filter(Boolean);
    return (tableId && ids.includes(tableId)) || (nomeKey && chave(m.nome_mesa) === nomeKey);
  });

  const tipo = match?.estudio_tipo ??
    (/\bsports?\s+club\b|\bnetwork\b/i.test(tableName) ? "network" : "dedicado");
  const mesa = match?.nome_mesa.trim() || nomeLimpo;
  const jogoRaw = match?.tipo_jogo.trim() || texto(row.game_type) || mesa;
  return {
    estudio: tipo === "network" ? "Network" : "Dedicada",
    mesa,
    jogo: jogoIdentidadeDeMesa(jogoRaw),
    cadastrada: Boolean(match),
  };
}

/**
 * Agrega o dataset de rodadas em fatos diários por TAP ID.
 * Uma linha/game_id representa uma rodada; `bet_count` continua sendo apostas.
 */
export function agruparOperatorPlayerRounds(
  payloads: unknown[],
  idsPermitidos: ReadonlySet<string>,
  catalogo: RsMesaCatalogo[],
): RsRoundsResumo {
  type MesaAcc = {
    estudio: "Dedicada" | "Network";
    mesa: string;
    jogo: string | null;
    rodadas: number;
    ggr: number;
    turnover: number;
  };
  type DiaAcc = {
    ext: string;
    data: string;
    rodadas: number;
    apostas: number;
    ggr: number;
    turnover: number;
    jogos: Record<string, number>;
    mesas: Map<string, MesaAcc>;
  };

  const dias = new Map<string, DiaAcc>();
  const vistos = new Set<string>();
  const semCadastro = new Set<string>();
  let linhasLidas = 0;
  let linhasDosIds = 0;
  let duplicadas = 0;

  for (const payload of payloads) {
    for (const raw of linhasEnvelope(payload)) {
      linhasLidas += 1;
      const row = rec(raw) as RsRoundRow | null;
      if (!row) continue;
      const extRaw = texto(row.external_id);
      const ext = tapIdFromRsExternal(extRaw);
      if (!ext || !idsPermitidos.has(ext)) continue;
      const data = dataIso(row.round_date);
      if (!data) continue;
      linhasDosIds += 1;

      const gameId = texto(row.game_id);
      const rowId = texto(row.id);
      const dedupe = `${ext}\0${gameId || rowId || `${data}\0${texto(row.game_table_id)}\0${linhasLidas}`}`;
      if (vistos.has(dedupe)) {
        duplicadas += 1;
        continue;
      }
      vistos.add(dedupe);

      const key = `${ext}\0${data}`;
      let dia = dias.get(key);
      if (!dia) {
        dia = {
          ext,
          data,
          rodadas: 0,
          apostas: 0,
          ggr: 0,
          turnover: 0,
          jogos: {},
          mesas: new Map(),
        };
        dias.set(key, dia);
      }

      const mesa = resolverMesa(row, catalogo);
      if (!mesa.cadastrada) semCadastro.add(texto(row.table_name) || texto(row.game_table_id) || "—");
      dia.rodadas += 1;
      dia.apostas += Math.max(0, numero(row.bet_count));
      dia.ggr += numero(row.ggr);
      dia.turnover += numero(row.turnover);
      if (mesa.jogo) dia.jogos[mesa.jogo] = (dia.jogos[mesa.jogo] ?? 0) + 1;

      const mesaKey = `${mesa.estudio}\0${mesa.mesa}`;
      const mesaAcc = dia.mesas.get(mesaKey) ?? {
        estudio: mesa.estudio,
        mesa: mesa.mesa,
        jogo: mesa.jogo,
        rodadas: 0,
        ggr: 0,
        turnover: 0,
      };
      mesaAcc.rodadas += 1;
      mesaAcc.ggr += numero(row.ggr);
      mesaAcc.turnover += numero(row.turnover);
      dia.mesas.set(mesaKey, mesaAcc);
    }
  }

  return {
    dias: [...dias.values()]
      .map((d): RsSpinDia => ({
        ext_customer_id: d.ext,
        data: d.data,
        player_id_bko: null,
        identity_key: null,
        rodadas_spin: d.rodadas,
        apostas_spin: d.apostas,
        ggr_spin: d.ggr,
        turnover_spin: d.turnover,
        jogou_spin: d.rodadas > 0,
        rodadas_por_jogo: d.jogos,
        rodadas_por_mesa: [...d.mesas.values()].map((m) => ({
          ...m,
          jogo: m.jogo ?? undefined,
        })),
      }))
      .sort((a, b) => a.data.localeCompare(b.data) || a.ext_customer_id.localeCompare(b.ext_customer_id)),
    linhasLidas,
    linhasDosIds,
    duplicadas,
    mesasSemCadastro: [...semCadastro].sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}
