import { AtualizacaoCadastralStaffHome } from "./AtualizacaoCadastralStaffHome";
import { CelebracoesStaffHome } from "./CelebracoesStaffHome";

/** Blocos após boas-vindas nas Homes de Estúdio/Escritório. */
export function HomeStaffAposBoasVindas({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  return (
    <>
      <AtualizacaoCadastralStaffHome sectionIdPrefix={sectionIdPrefix} />
      <CelebracoesStaffHome sectionIdPrefix={sectionIdPrefix} />
    </>
  );
}
