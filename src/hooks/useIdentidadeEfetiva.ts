import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { resolverIdentidadeEfetiva } from "../lib/identidadeEfetiva";
import type { Role, User } from "../types";

/** Identidade da sessão visível — conta simulada quando o Simulador de Login está ativo. */
export function useIdentidadeEfetiva() {
  const { user, effectiveRole, dadosUsuarioEfetivo, simulacaoLogin, simulacaoSomenteLeitura } = useApp();

  return useMemo(() => {
    const resolved = resolverIdentidadeEfetiva({
      user,
      dadosUsuarioEfetivo,
      effectiveRole,
    });
    return {
      ...resolved,
      role: (resolved.role ?? null) as Role | null,
      isSimulacao: Boolean(simulacaoLogin),
      somenteLeitura: simulacaoSomenteLeitura,
      viewer: user as User | null,
    };
  }, [user, effectiveRole, dadosUsuarioEfetivo, simulacaoLogin, simulacaoSomenteLeitura]);
}
