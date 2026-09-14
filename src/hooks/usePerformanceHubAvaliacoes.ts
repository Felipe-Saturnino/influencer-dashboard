import { useCallback, useEffect, useRef, useState } from "react";
import type { PerformanceHubAvaliacao } from "../lib/academyPerformanceHubTypes";
import {
  fetchPerformanceHubAvaliacoes,
  upsertPerformanceHubAvaliacao,
} from "../lib/academyPerformanceHubAvaliacoesFetch";

/** Substitui o id cliente (`novo-*`) ou o UUID já gravado, sem duplicar linhas na lista. */
export function mesclarAvaliacaoNaLista(
  prev: PerformanceHubAvaliacao[],
  rowCliente: PerformanceHubAvaliacao,
  salvo: PerformanceHubAvaliacao,
): PerformanceHubAvaliacao[] {
  let replaced = false;
  const next: PerformanceHubAvaliacao[] = [];
  for (const item of prev) {
    if (item.id === rowCliente.id || item.id === salvo.id) {
      if (!replaced) {
        next.push(salvo);
        replaced = true;
      }
      continue;
    }
    next.push(item);
  }
  if (!replaced) next.unshift(salvo);
  return next;
}

export function usePerformanceHubAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState<PerformanceHubAvaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  /** `novo-*` → UUID após o primeiro INSERT bem-sucedido (evita segundo INSERT no Concluir). */
  const idClienteParaServidor = useRef(new Map<string, string>());
  /** Promises de create em voo por id `novo-*`. */
  const createsPendentes = useRef(new Map<string, Promise<PerformanceHubAvaliacao | null>>());
  /** Serializa persistências que ainda usam o mesmo id de cliente. */
  const filasPorIdCliente = useRef(new Map<string, Promise<PerformanceHubAvaliacao | null>>());

  const recarregar = useCallback(async () => {
    setLoading(true);
    const rows = await fetchPerformanceHubAvaliacoes();
    setAvaliacoes(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const persistirAvaliacao = useCallback(
    async (row: PerformanceHubAvaliacao): Promise<PerformanceHubAvaliacao | null> => {
      const chaveCliente = row.id;
      const anterior = filasPorIdCliente.current.get(chaveCliente) ?? Promise.resolve(null);

      const execucao = anterior.then(async () => {
        let alvo = row;
        if (row.id.startsWith("novo-")) {
          const jaMapeado = idClienteParaServidor.current.get(row.id);
          if (jaMapeado) {
            alvo = { ...row, id: jaMapeado };
          } else {
            const emVoo = createsPendentes.current.get(row.id);
            if (emVoo) {
              const criado = await emVoo;
              if (!criado) return null;
              idClienteParaServidor.current.set(row.id, criado.id);
              alvo = { ...row, id: criado.id };
            }
          }
        }

        const isCreate = alvo.id.startsWith("novo-");
        const pedido = upsertPerformanceHubAvaliacao(alvo);
        if (isCreate) {
          createsPendentes.current.set(row.id, pedido);
        }

        try {
          const salvo = await pedido;
          if (!salvo) return null;
          if (row.id.startsWith("novo-")) {
            idClienteParaServidor.current.set(row.id, salvo.id);
          }
          setAvaliacoes((prev) => mesclarAvaliacaoNaLista(prev, row, salvo));
          return salvo;
        } finally {
          if (isCreate) {
            createsPendentes.current.delete(row.id);
          }
        }
      });

      filasPorIdCliente.current.set(chaveCliente, execucao);
      try {
        return await execucao;
      } finally {
        if (filasPorIdCliente.current.get(chaveCliente) === execucao) {
          filasPorIdCliente.current.delete(chaveCliente);
        }
      }
    },
    [],
  );

  return {
    avaliacoes,
    setAvaliacoes,
    loading,
    recarregar,
    persistirAvaliacao,
  };
}
