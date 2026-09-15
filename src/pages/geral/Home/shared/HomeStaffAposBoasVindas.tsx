import { useApp } from "../../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import type { Role } from "../../../../types";
import { AtualizacaoCadastralStaffHome } from "./AtualizacaoCadastralStaffHome";
import { CelebracoesStaffHome } from "./CelebracoesStaffHome";
import { PresencaAcoesNecessariasStaffHome } from "./PresencaAcoesNecessariasStaffHome";

/** Perfis Estúdio com alertas de presença na Home (mockups aprovados). */
const ROLES_HOME_PRESENCA_ACOES: readonly Role[] = [
  "game_presenter",
  "shuffler",
  "shift_leader",
  "service_manager",
  "performance_coach",
  "customer_service",
];

/** Blocos após boas-vindas nas Homes de Estúdio/Escritório. */
export function HomeStaffAposBoasVindas({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const { user } = useApp();
  const { role: roleEfetivo } = useIdentidadeEfetiva();
  const role = (roleEfetivo ?? user?.role) as Role | undefined;
  const mostrarPresenca = !!role && ROLES_HOME_PRESENCA_ACOES.includes(role);

  return (
    <>
      <AtualizacaoCadastralStaffHome sectionIdPrefix={sectionIdPrefix} />
      {mostrarPresenca ? <PresencaAcoesNecessariasStaffHome sectionIdPrefix={sectionIdPrefix} /> : null}
      <CelebracoesStaffHome sectionIdPrefix={sectionIdPrefix} />
    </>
  );
}
