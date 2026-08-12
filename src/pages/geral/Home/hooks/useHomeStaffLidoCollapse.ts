import { useCallback, useEffect, useState } from "react";
import {
  listarHomeStaffLidos,
  marcarHomeStaffLido,
  type HomeStaffLidoBucket,
} from "../../../../lib/homeStaffLido";

/**
 * Lidos persistidos + expansão temporária na sessão atual.
 * Card lido inicia recolhido; expandir só vale até sair da Home / recarregar.
 */
export function useHomeStaffLidoCollapse(userId: string | undefined, bucket: HomeStaffLidoBucket) {
  const [lidos, setLidos] = useState<Set<string>>(() => new Set());
  const [expandidosSessao, setExpandidosSessao] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!userId) {
      setLidos(new Set());
      return;
    }
    setLidos(listarHomeStaffLidos(userId, bucket));
    setExpandidosSessao(new Set());
  }, [userId, bucket]);

  const isRecolhido = useCallback(
    (itemId: string) => lidos.has(itemId) && !expandidosSessao.has(itemId),
    [lidos, expandidosSessao],
  );

  const isLido = useCallback((itemId: string) => lidos.has(itemId), [lidos]);

  const marcarLido = useCallback(
    (itemId: string) => {
      if (!userId) return;
      marcarHomeStaffLido(userId, bucket, itemId);
      setLidos((prev) => new Set(prev).add(itemId));
      setExpandidosSessao((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
    [userId, bucket],
  );

  const expandir = useCallback((itemId: string) => {
    setExpandidosSessao((prev) => new Set(prev).add(itemId));
  }, []);

  return { isRecolhido, isLido, marcarLido, expandir };
}
