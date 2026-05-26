import type { Role } from "../../types";
import { FONT } from "../../constants/theme";
import {
  FILTROS_PERFIL_LINHAS,
  roleBadgeColor,
  roleLabel,
} from "../../pages/plataforma/GestaoUsuarios/constants";

type ThemePick = {
  cardBorder: string;
  inputBg?: string;
  textMuted: string;
};

export function InformativoPerfilMultiSelect({
  selected,
  onChange,
  t,
  hasError,
}: {
  selected: Role[];
  onChange: (perfis: Role[]) => void;
  t: ThemePick;
  hasError?: boolean;
}) {
  function toggle(role: Role) {
    onChange(selected.includes(role) ? selected.filter((r) => r !== role) : [...selected, role]);
  }

  return (
    <div
      role="group"
      aria-label="Perfis que verão o informativo na Home"
      aria-invalid={hasError || undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: hasError ? "10px 12px" : undefined,
        borderRadius: hasError ? 10 : undefined,
        border: hasError ? "1px solid #e84025" : undefined,
      }}
    >
      {FILTROS_PERFIL_LINHAS.map(({ titulo, roles }) => (
        <div key={titulo} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: t.textMuted,
              fontFamily: FONT.body,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginRight: 4,
              flexShrink: 0,
            }}
          >
            {titulo}
          </span>
          {roles.map((roleVal) => {
            const label = roleLabel(roleVal);
            const cor = roleBadgeColor(roleVal);
            const checked = selected.includes(roleVal);
            return (
              <button
                key={roleVal}
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={label}
                onClick={() => toggle(roleVal)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: `1px solid ${checked ? cor : t.cardBorder}`,
                  background: checked ? `${cor}22` : t.inputBg ?? "transparent",
                  color: checked ? cor : t.textMuted,
                  fontSize: 12,
                  fontWeight: checked ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  transition: "all 0.18s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
