import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import { STAFF_ESTUDIO_CADASTRO_TODOS, staffEstudioAtendeTodos } from "./gestaoStaffEstudioHelpers";
import { SelectListaComBusca } from "../../../components/SelectListaComBusca";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";

const VALOR_VAZIO = "";

/**
 * Seleção exclusiva (um valor): vazio, **Todos Estúdios** ou **um** estúdio.
 * Persistido como array de 0–1 valor em `staff_estudio_slugs` — sem multi-seleção.
 */
export function StaffEstudioCampoSelect({
  value,
  onChange,
  estudioSlugs,
  estudiosNome,
  id = "staff-estudio",
  disabled = false,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  estudioSlugs: string[];
  estudiosNome: Record<string, string>;
  id?: string;
  disabled?: boolean;
}) {
  const todosAtivo = staffEstudioAtendeTodos(value);
  const slugAtivo = todosAtivo ? STAFF_ESTUDIO_CADASTRO_TODOS : (value[0] ?? VALOR_VAZIO);
  const selectValue = todosAtivo
    ? STAFF_ESTUDIO_CADASTRO_TODOS
    : slugAtivo && estudioSlugs.includes(slugAtivo)
      ? slugAtivo
      : VALOR_VAZIO;

  const selectStyle: CSSProperties = {
    width: "100%",
    fontFamily: FONT.body,
    fontSize: 13,
    boxSizing: "border-box",
    opacity: disabled ? 0.75 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };

  return (
    <SelectListaComBusca
      id={id}
      label="Estúdio do staff"
      searchPlaceholder={placeholderPesquisaFiltro("Estúdio")}
      variant="campo"
      disabled={disabled}
      value={selectValue}
      onChange={(v) => {
        if (v === VALOR_VAZIO) onChange([]);
        else if (v === STAFF_ESTUDIO_CADASTRO_TODOS) onChange([STAFF_ESTUDIO_CADASTRO_TODOS]);
        else onChange([v]);
      }}
      style={selectStyle}
      options={[
        { value: VALOR_VAZIO, label: "—" },
        { value: STAFF_ESTUDIO_CADASTRO_TODOS, label: "Todos Estúdios" },
        ...estudioSlugs.map((slug) => ({
          value: slug,
          label: estudiosNome[slug] ?? slug,
        })),
      ]}
    />
  );
}
