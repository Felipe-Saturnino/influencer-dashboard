import type { RhOrgPrestadorVinculoOpcao } from "../types/rhOrganograma";

/** Vínculo de organograma em `rh_vagas` (um nível por vez). */
export type RhVagaOrgVinculo = {
  org_time_id: string | null;
  org_gerencia_id: string | null;
  org_diretoria_id: string | null;
};

export function orgVinculoVazio(): RhVagaOrgVinculo {
  return { org_time_id: null, org_gerencia_id: null, org_diretoria_id: null };
}

export function orgVinculoDeRow(row: {
  org_time_id?: string | null;
  org_gerencia_id?: string | null;
  org_diretoria_id?: string | null;
}): RhVagaOrgVinculo {
  return {
    org_time_id: row.org_time_id ?? null,
    org_gerencia_id: row.org_gerencia_id ?? null,
    org_diretoria_id: row.org_diretoria_id ?? null,
  };
}

export function orgVinculoSelectValue(v: RhVagaOrgVinculo): string {
  return v.org_time_id ?? v.org_gerencia_id ?? v.org_diretoria_id ?? "";
}

export function orgVinculoTemSelecao(v: RhVagaOrgVinculo): boolean {
  return Boolean(v.org_time_id || v.org_gerencia_id || v.org_diretoria_id);
}

export function orgVinculoDeOpcao(op: RhOrgPrestadorVinculoOpcao | null): RhVagaOrgVinculo {
  if (!op) return orgVinculoVazio();
  if (op.nivel === "time") {
    return { org_time_id: op.timeId, org_gerencia_id: null, org_diretoria_id: null };
  }
  if (op.nivel === "gerencia") {
    return { org_time_id: null, org_gerencia_id: op.gerenciaId, org_diretoria_id: null };
  }
  return { org_time_id: null, org_gerencia_id: null, org_diretoria_id: op.diretoriaId };
}
