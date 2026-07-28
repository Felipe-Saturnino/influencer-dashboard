import type { CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { STAFF_ESTUDIO_CADASTRO_TODOS, staffEstudioAtendeTodos } from "./gestaoStaffEstudioHelpers";

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
  const { theme: t } = useApp();
  const todosAtivo = staffEstudioAtendeTodos(value);
  const slugAtivo = todosAtivo ? STAFF_ESTUDIO_CADASTRO_TODOS : (value[0] ?? VALOR_VAZIO);
  const selectValue = todosAtivo
    ? STAFF_ESTUDIO_CADASTRO_TODOS
    : slugAtivo && estudioSlugs.includes(slugAtivo)
      ? slugAtivo
      : VALOR_VAZIO;

  const selectStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
    boxSizing: "border-box",
    opacity: disabled ? 0.75 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };

  return (
    <select
      id={id}
      aria-label="Estúdio do staff"
      disabled={disabled}
      value={selectValue}
      onChange={(e) => {
        const v = e.target.value;
        if (v === VALOR_VAZIO) onChange([]);
        else if (v === STAFF_ESTUDIO_CADASTRO_TODOS) onChange([STAFF_ESTUDIO_CADASTRO_TODOS]);
        else onChange([v]);
      }}
      style={selectStyle}
    >
      <option value={VALOR_VAZIO}>—</option>
      <option value={STAFF_ESTUDIO_CADASTRO_TODOS}>Todos Estúdios</option>
      {estudioSlugs.map((slug) => (
        <option key={slug} value={slug}>
          {estudiosNome[slug] ?? slug}
        </option>
      ))}
    </select>
  );
}
