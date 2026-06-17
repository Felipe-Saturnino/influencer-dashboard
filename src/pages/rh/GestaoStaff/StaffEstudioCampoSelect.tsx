import type { CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { STAFF_ESTUDIO_CADASTRO_TODOS, staffEstudioAtendeTodos } from "./gestaoStaffEstudioHelpers";

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
  const brand = useDashboardBrand();
  const todosAtivo = staffEstudioAtendeTodos(value);
  const especificos = value.filter((s) => s !== STAFF_ESTUDIO_CADASTRO_TODOS);

  const chipBase: CSSProperties = {
    textAlign: "left",
    padding: "8px 12px",
    borderRadius: 10,
    fontFamily: FONT.body,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  const chipStyle = (ativo: boolean): CSSProperties => ({
    ...chipBase,
    border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
    background: ativo
      ? brand.useBrand
        ? "color-mix(in srgb, var(--brand-accent) 12%, transparent)"
        : "rgba(124,58,237,0.12)"
      : (t.inputBg ?? t.cardBg),
    color: ativo ? brand.accent : t.text,
    fontWeight: ativo ? 700 : 500,
  });

  const toggleTodos = () => {
    if (disabled) return;
    onChange(todosAtivo ? [] : [STAFF_ESTUDIO_CADASTRO_TODOS]);
  };

  const toggleSlug = (slug: string) => {
    if (disabled) return;
    if (todosAtivo) {
      onChange([slug]);
      return;
    }
    if (especificos.includes(slug)) {
      onChange(especificos.filter((s) => s !== slug));
      return;
    }
    onChange([...especificos, slug]);
  };

  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }} aria-labelledby={`${id}-legend`}>
      <legend id={`${id}-legend`} style={{ display: "none" }}>
        Estúdios
      </legend>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          id={id}
          role="checkbox"
          aria-checked={todosAtivo}
          aria-label="Todos Estúdios"
          disabled={disabled}
          onClick={toggleTodos}
          style={chipStyle(todosAtivo)}
        >
          Todos Estúdios
        </button>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 220,
            overflowY: "auto",
            padding: "2px 0",
          }}
        >
          {estudioSlugs.map((slug) => {
            const ativo = !todosAtivo && especificos.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                role="checkbox"
                aria-checked={ativo}
                aria-label={`Estúdio ${estudiosNome[slug] ?? slug}`}
                disabled={disabled}
                onClick={() => toggleSlug(slug)}
                style={chipStyle(ativo)}
              >
                {estudiosNome[slug] ?? slug}
              </button>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
