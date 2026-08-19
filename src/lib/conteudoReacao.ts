import { supabase } from "./supabase";
import { fetchAllPages, fetchInBatched } from "./supabasePaginate";

/** Reações de layout em postagens — não é ciência nem «Li e Ocultar». */

export const CONTEUDO_REACAO_ORIGENS = [
  "informativo",
  "rh_comunicado",
  "academy_comunicado",
  "academy_dica",
] as const;

export type ConteudoReacaoOrigem = (typeof CONTEUDO_REACAO_ORIGENS)[number];

export const CONTEUDO_REACAO_EMOJIS = [
  { id: "up", glyph: "👍", label: "Gostei" },
  { id: "heart", glyph: "❤️", label: "Amei" },
  { id: "clap", glyph: "👏", label: "Parabéns" },
  { id: "party", glyph: "🎉", label: "Animado" },
  { id: "wow", glyph: "😮", label: "Surpreso" },
] as const;

export type ConteudoReacaoEmojiId = (typeof CONTEUDO_REACAO_EMOJIS)[number]["id"];

export type ConteudoReacaoChave = {
  origem: ConteudoReacaoOrigem;
  contentId: string;
};

export type ConteudoReacaoLinha = {
  origem: string;
  content_id: string;
  user_id: string;
  emoji: string;
};

export type ConteudoReacaoResumo = {
  counts: Record<ConteudoReacaoEmojiId, number>;
  minha: ConteudoReacaoEmojiId | null;
};

export const PREFIXO_HOME_RH_COMUNICADO = "portal-rh-com-";
export const PREFIXO_HOME_ACADEMY_COMUNICADO = "academy-com-";
export const PREFIXO_HOME_ACADEMY_DICA = "academy-dica-";

const EMOJI_IDS = new Set<string>(CONTEUDO_REACAO_EMOJIS.map((e) => e.id));

export function chaveReacaoConteudo(origem: ConteudoReacaoOrigem, contentId: string): string {
  return `${origem}:${contentId}`;
}

export function uuidAposPrefixoHome(id: string, prefixo: string): string | null {
  if (!id.startsWith(prefixo)) return null;
  const rest = id.slice(prefixo.length).trim();
  return rest || null;
}

export function isConteudoReacaoEmojiId(value: string): value is ConteudoReacaoEmojiId {
  return EMOJI_IDS.has(value);
}

export function countsReacaoVazios(): Record<ConteudoReacaoEmojiId, number> {
  return { up: 0, heart: 0, clap: 0, party: 0, wow: 0 };
}

export function resumoReacaoVazio(): ConteudoReacaoResumo {
  return { counts: countsReacaoVazios(), minha: null };
}

/** Agrega linhas da tabela pelo post e destaca a reação da identidade visível. */
export function agregarReacoesConteudo(
  rows: ConteudoReacaoLinha[],
  userIdEfetivo: string | null,
): Map<string, ConteudoReacaoResumo> {
  const out = new Map<string, ConteudoReacaoResumo>();
  const uid = (userIdEfetivo ?? "").trim();
  for (const row of rows) {
    if (!CONTEUDO_REACAO_ORIGENS.includes(row.origem as ConteudoReacaoOrigem)) continue;
    if (!isConteudoReacaoEmojiId(row.emoji)) continue;
    const contentId = (row.content_id ?? "").trim();
    if (!contentId) continue;
    const key = chaveReacaoConteudo(row.origem as ConteudoReacaoOrigem, contentId);
    let resumo = out.get(key);
    if (!resumo) {
      resumo = resumoReacaoVazio();
      out.set(key, resumo);
    }
    resumo.counts[row.emoji] += 1;
    if (uid && row.user_id === uid) resumo.minha = row.emoji;
  }
  return out;
}

/** Um emoji por pessoa: repetir tira; outro substitui. */
export function aplicarToggleReacao(
  atual: ConteudoReacaoResumo,
  emoji: ConteudoReacaoEmojiId,
): ConteudoReacaoResumo {
  const counts = { ...atual.counts };
  const minha = atual.minha;
  if (minha === emoji) {
    counts[emoji] = Math.max(0, counts[emoji] - 1);
    return { counts, minha: null };
  }
  if (minha) counts[minha] = Math.max(0, counts[minha] - 1);
  counts[emoji] += 1;
  return { counts, minha: emoji };
}

const IN_CHUNK = 100;

export async function carregarReacoesConteudo(
  chaves: ConteudoReacaoChave[],
): Promise<ConteudoReacaoLinha[]> {
  if (!chaves.length) return [];
  const porOrigem = new Map<ConteudoReacaoOrigem, string[]>();
  for (const c of chaves) {
    const id = c.contentId.trim();
    if (!id) continue;
    const list = porOrigem.get(c.origem) ?? [];
    list.push(id);
    porOrigem.set(c.origem, list);
  }
  const partes = await Promise.all(
    [...porOrigem.entries()].map(([origem, ids]) =>
      fetchInBatched([...new Set(ids)], IN_CHUNK, async (slice) => {
        try {
          return await fetchAllPages<ConteudoReacaoLinha>(async (from, to) =>
            supabase
              .from("conteudo_reacao")
              .select("origem, content_id, user_id, emoji")
              .eq("origem", origem)
              .in("content_id", slice)
              .range(from, to),
          );
        } catch (e) {
          console.error("[carregarReacoesConteudo]", e);
          return [];
        }
      }),
    ),
  );
  return partes.flat();
}

export async function persistirToggleReacao(input: {
  origem: ConteudoReacaoOrigem;
  contentId: string;
  userId: string;
  emoji: ConteudoReacaoEmojiId;
  remover: boolean;
}): Promise<boolean> {
  if (input.remover) {
    const { error } = await supabase
      .from("conteudo_reacao")
      .delete()
      .eq("origem", input.origem)
      .eq("content_id", input.contentId)
      .eq("user_id", input.userId);
    if (error) {
      console.error("[persistirToggleReacao] delete", error);
      return false;
    }
    return true;
  }
  const { error } = await supabase.from("conteudo_reacao").upsert(
    {
      origem: input.origem,
      content_id: input.contentId,
      user_id: input.userId,
      emoji: input.emoji,
    },
    { onConflict: "origem,content_id,user_id" },
  );
  if (error) {
    console.error("[persistirToggleReacao] upsert", error);
    return false;
  }
  return true;
}
