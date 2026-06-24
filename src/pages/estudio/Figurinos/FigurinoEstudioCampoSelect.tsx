import type { CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import {
  FIGURINO_ESTUDIO_CADASTRO_STAFF,
  FIGURINO_ESTUDIO_CADASTRO_STAFF_LABEL,
  FIGURINO_ESTUDIO_CADASTRO_TODOS,
  FIGURINO_ESTUDIO_CADASTRO_TODOS_LABEL,
  figurinoEstudioAtendeStaff,
  figurinoEstudioAtendeTodos,
} from "./figurinosConstants";

export function FigurinoEstudioCampoSelect({
  value,
  onChange,
  estudios,
  id = "figurino-estudio",
  disabled = false,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  estudios: readonly { slug: string; nome: string }[];
  id?: string;
  disabled?: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const todosAtivo = figurinoEstudioAtendeTodos(value);
  const staffAtivo = figurinoEstudioAtendeStaff(value);
  const especificos = value.filter(
    (s) => s !== FIGURINO_ESTUDIO_CADASTRO_TODOS && s !== FIGURINO_ESTUDIO_CADASTRO_STAFF,
  );
  const estVis = [...estudios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

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

  const toggleStaff = () => {
    if (disabled) return;
    if (todosAtivo) {
      onChange([FIGURINO_ESTUDIO_CADASTRO_STAFF]);
      return;
    }
    if (staffAtivo) {
      onChange(especificos);
      return;
    }
    onChange([FIGURINO_ESTUDIO_CADASTRO_STAFF, ...especificos]);
  };

  const toggleTodos = () => {
    if (disabled) return;
    onChange(todosAtivo ? [] : [FIGURINO_ESTUDIO_CADASTRO_TODOS]);
  };

  const toggleSlug = (slug: string) => {
    if (disabled) return;
    if (todosAtivo) {
      onChange([slug]);
      return;
    }
    if (especificos.includes(slug)) {
      const restantes = especificos.filter((s) => s !== slug);
      onChange(staffAtivo ? [FIGURINO_ESTUDIO_CADASTRO_STAFF, ...restantes] : restantes);
      return;
    }
    onChange(staffAtivo ? [FIGURINO_ESTUDIO_CADASTRO_STAFF, ...especificos, slug] : [...especificos, slug]);
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
          aria-checked={staffAtivo}
          aria-label={FIGURINO_ESTUDIO_CADASTRO_STAFF_LABEL}
          disabled={disabled}
          onClick={toggleStaff}
          style={chipStyle(staffAtivo)}
        >
          {FIGURINO_ESTUDIO_CADASTRO_STAFF_LABEL}
        </button>
        <button
          type="button"
          role="checkbox"
          aria-checked={todosAtivo}
          aria-label={FIGURINO_ESTUDIO_CADASTRO_TODOS_LABEL}
          disabled={disabled}
          onClick={toggleTodos}
          style={chipStyle(todosAtivo)}
        >
          {FIGURINO_ESTUDIO_CADASTRO_TODOS_LABEL}
        </button>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 200,
            overflowY: "auto",
            padding: "2px 0",
          }}
        >
          {estVis.map((e) => {
            const ativo = !todosAtivo && especificos.includes(e.slug);
            return (
              <button
                key={e.slug}
                type="button"
                role="checkbox"
                aria-checked={ativo}
                aria-label={`Estúdio ${e.nome}`}
                disabled={disabled}
                onClick={() => toggleSlug(e.slug)}
                style={chipStyle(ativo)}
              >
                {e.nome}
              </button>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
