import { documentoAplicavelAoUsuario } from "./portalRhDocumentoNormativo";
import { flattenVinculosDeGrupos } from "./rhOrganogramaTree";
import { normRhOrgRotulo } from "./rhPrestadorNovoDefaults";
import type { RhOrgOrganogramaGrupoPrestador } from "../types/rhOrganograma";

/** Gerências cujos times entram no campo Aplicável a (mesma regra de Gestão de Staff). */
export function gerenciaIndicaTimesAcademyAplicavel(gerenciaNome: string): boolean {
  const g = normRhOrgRotulo(gerenciaNome);
  if (!g) return false;
  return (
    g.includes("game floor") ||
    (g.includes("operation") && g.includes("management"))
  );
}

function timeExcluidoAcademyAplicavel(timeNome: string): boolean {
  return normRhOrgRotulo(timeNome) === "contador de cartas";
}

/** Opções do multi-select Aplicável a — somente times ativos das gerências Game Floor e Operation Management. */
export function opcoesTimesAplicavelAcademyManuais(
  grupos: RhOrgOrganogramaGrupoPrestador[],
): { id: string; label: string }[] {
  const seen = new Set<string>();
  const out: { id: string; label: string }[] = [];
  for (const v of flattenVinculosDeGrupos(grupos)) {
    if (
      v.nivel !== "time" ||
      !gerenciaIndicaTimesAcademyAplicavel(v.gerenciaNome) ||
      timeExcluidoAcademyAplicavel(v.timeNome)
    ) {
      continue;
    }
    const id = (v.setorNome ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label: v.label });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function fmtAplicavelManualAcademy(aplicavel: string[] | null | undefined): string {
  if (!aplicavel?.length) return "—";
  return aplicavel.join(", ");
}

/** Manual atinge o organograma do usuário. Sem `aplicavel_a` (legado) = todos os leitores. */
export function manualAplicavelAoUsuario(
  aplicavel: string[] | null | undefined,
  setoresUsuario: readonly string[],
): boolean {
  if (!aplicavel?.length) return true;
  return documentoAplicavelAoUsuario(aplicavel, setoresUsuario);
}
