import type { Permissoes } from "../hooks/usePermission";
import type { User } from "../types";
import { normalizarTextoBusca } from "./searchText";
import type { OrdemSaidaRow } from "./techOpsOrdemSaida";

export interface OrdemSaidaPermissoesUi {
  podeNovaOs: boolean;
  podeVer: boolean;
  podeAtualizar: boolean;
  podeAprovar: boolean;
  ehPropria: boolean;
}

export function ordemSaidaEhPropria(row: OrdemSaidaRow, user: User | null): boolean {
  if (!user) return false;
  if (row.solicitante_user_id && row.solicitante_user_id === user.id) return true;

  const nome = normalizarTextoBusca(user.name);
  if (!nome) return false;
  return (
    normalizarTextoBusca(row.solicitante_nome) === nome ||
    normalizarTextoBusca(row.responsavel_nome) === nome
  );
}

/**
 * Matriz específica da Ordem de Saída:
 * - Criar (Sim/Próprios) ou Editar (Sim/Próprios) libera Nova OS.
 * - Criar Sim atualiza todas; Criar Próprios, apenas as próprias.
 * - Editar Sim/Próprios atualiza todas.
 * - Aprovar depende exclusivamente de Editar: Sim=todas, Próprios=próprias.
 */
export function getOrdemSaidaPermissoesUi(
  perm: Permissoes,
  user: User | null,
  row?: OrdemSaidaRow,
): OrdemSaidaPermissoesUi {
  const ehPropria = row ? ordemSaidaEhPropria(row, user) : false;
  const podeNovaOs =
    perm.canCriar === "sim" ||
    perm.canCriar === "proprios" ||
    perm.canEditar === "sim" ||
    perm.canEditar === "proprios";
  const podeAtualizar =
    Boolean(row) &&
    (perm.canEditar === "sim" ||
      perm.canEditar === "proprios" ||
      perm.canCriar === "sim" ||
      (perm.canCriar === "proprios" && ehPropria));
  const podeAprovar =
    Boolean(row) &&
    (perm.canEditar === "sim" || (perm.canEditar === "proprios" && ehPropria));

  return {
    podeNovaOs,
    podeVer: perm.canView === "sim" || perm.canView === "proprios",
    podeAtualizar,
    podeAprovar,
    ehPropria,
  };
}
