import type { PageKey } from "../types";
import type { RhFuncionario, RhFuncionarioStatus } from "../types/rhFuncionario";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "./rhFuncionarioLoginMatch";

export const MESES_CICLO_REVISAO_CADASTRO = 6;

/** Páginas acessíveis enquanto a revisão cadastral periódica estiver pendente. */
export const PAGES_ISENTAS_GATE_REVISAO_CADASTRO: readonly PageKey[] = [
  "rh_dados_cadastro",
  "configuracoes",
  "ajuda",
  "rh_central_denuncias",
];

export type RhCadastroRevisaoTipo = "alteracao" | "sem_alteracao";

export function prestadorExigeRevisaoCadastral(status: RhFuncionarioStatus): boolean {
  return status === "ativo" || status === "indisponivel";
}

/**
 * Data-base do ciclo de 6 meses — somente após a primeira revisão concluída pelo prestador em Dados de Cadastro.
 * O cadastro em Gestão de Prestadores (`created_at`) não substitui a primeira revisão.
 */
export function dataReferenciaRevisaoCadastral(revisadoEm: string | null | undefined): string | null {
  const rev = revisadoEm?.trim();
  return rev || null;
}

export function cadastroRevisaoJaRegistradaPeloPrestador(revisadoEm: string | null | undefined): boolean {
  return Boolean(revisadoEm?.trim());
}

/**
 * `true` quando a revisão está pendente: sem revisão prévia (primeiro acesso) ou ciclo de 6 meses vencido.
 */
export function precisaRevisaoCadastral(
  revisadoEm: string | null | undefined,
  refDate = new Date(),
): boolean {
  const rev = revisadoEm?.trim();
  if (!rev) return true;
  const base = new Date(rev);
  if (Number.isNaN(base.getTime())) return true;
  const limite = new Date(base);
  limite.setMonth(limite.getMonth() + MESES_CICLO_REVISAO_CADASTRO);
  return refDate.getTime() >= limite.getTime();
}

export function proximaRevisaoCadastralEm(revisadoEm: string | null | undefined): Date | null {
  const baseStr = dataReferenciaRevisaoCadastral(revisadoEm);
  if (!baseStr) return null;
  const base = new Date(baseStr);
  if (Number.isNaN(base.getTime())) return null;
  const limite = new Date(base);
  limite.setMonth(limite.getMonth() + MESES_CICLO_REVISAO_CADASTRO);
  return limite;
}

export function revisaoCadastralPendenteParaFuncionario(f: RhFuncionario | null | undefined): boolean {
  if (!f || !prestadorExigeRevisaoCadastral(f.status)) return false;
  return precisaRevisaoCadastral(f.cadastro_revisado_em, new Date());
}

export function payloadMarcarRevisaoCadastral(tipo: RhCadastroRevisaoTipo): {
  cadastro_revisado_em: string;
  cadastro_revisao_tipo: RhCadastroRevisaoTipo;
} {
  return {
    cadastro_revisado_em: new Date().toISOString(),
    cadastro_revisao_tipo: tipo,
  };
}

export function notificarRevisaoCadastralAtualizada(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rh-cadastro-revisao-atualizada"));
  }
}

export async function buscarFuncionarioRevisaoCadastralPorEmail(
  email: string | null | undefined,
): Promise<RhFuncionario | null> {
  const em = email?.trim();
  if (!em) return null;
  return buscarRhFuncionarioAtivoPorEmailLogin(em);
}

export function usuarioSujeitoGateRevisaoCadastral(
  role: string | undefined,
  permDadosCadastroEdit: string | null | undefined,
): boolean {
  if (role === "prestador") return true;
  return permDadosCadastroEdit === "proprios";
}
