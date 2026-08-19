import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIdentidadeEfetiva } from "./useIdentidadeEfetiva";
import {
  agregarReacoesConteudo,
  aplicarToggleReacao,
  carregarReacoesConteudo,
  chaveReacaoConteudo,
  persistirToggleReacao,
  resumoReacaoVazio,
  type ConteudoReacaoChave,
  type ConteudoReacaoEmojiId,
  type ConteudoReacaoResumo,
} from "../lib/conteudoReacao";

export function useConteudoReacoes(chaves: ConteudoReacaoChave[]) {
  const { userId, somenteLeitura, viewer } = useIdentidadeEfetiva();
  const [porChave, setPorChave] = useState<Map<string, ConteudoReacaoResumo>>(new Map());
  const porChaveRef = useRef(porChave);
  porChaveRef.current = porChave;
  const sig = chaves
    .map((c) => chaveReacaoConteudo(c.origem, c.contentId))
    .sort()
    .join("|");

  useEffect(() => {
    let cancelled = false;
    const lista = sig
      ? sig.split("|").map((s) => {
          const i = s.indexOf(":");
          return {
            origem: s.slice(0, i) as ConteudoReacaoChave["origem"],
            contentId: s.slice(i + 1),
          };
        })
      : [];
    if (!lista.length) {
      setPorChave(new Map());
      return;
    }
    void carregarReacoesConteudo(lista).then((rows) => {
      if (cancelled) return;
      setPorChave(agregarReacoesConteudo(rows, userId));
    });
    return () => {
      cancelled = true;
    };
  }, [sig, userId]);

  const resumoDe = useCallback(
    (chave: ConteudoReacaoChave): ConteudoReacaoResumo =>
      porChave.get(chaveReacaoConteudo(chave.origem, chave.contentId)) ?? resumoReacaoVazio(),
    [porChave],
  );

  const reagir = useCallback(
    async (chave: ConteudoReacaoChave, emoji: ConteudoReacaoEmojiId) => {
      const writerId = viewer?.id?.trim();
      if (somenteLeitura || !writerId) return;
      const key = chaveReacaoConteudo(chave.origem, chave.contentId);
      const anterior = porChaveRef.current.get(key) ?? resumoReacaoVazio();
      const proximo = aplicarToggleReacao(anterior, emoji);
      setPorChave((prev) => {
        const next = new Map(prev);
        next.set(key, proximo);
        return next;
      });
      const ok = await persistirToggleReacao({
        origem: chave.origem,
        contentId: chave.contentId,
        userId: writerId,
        emoji,
        remover: proximo.minha == null,
      });
      if (!ok) {
        setPorChave((prev) => {
          const next = new Map(prev);
          next.set(key, anterior);
          return next;
        });
      }
    },
    [somenteLeitura, viewer?.id],
  );

  return useMemo(
    () => ({
      resumoDe,
      reagir,
      somenteLeitura,
    }),
    [resumoDe, reagir, somenteLeitura],
  );
}
