import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";

type Theme = { text: string; textMuted: string };

export function SimNaoField({
  name,
  label,
  value,
  onChange,
  t,
}: {
  name: string;
  label: string;
  value: boolean;
  onChange: (sim: boolean) => void;
  t: Theme;
}) {
  const row: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    fontSize: 14,
    color: t.text,
    fontFamily: FONT.body,
  };

  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
      <legend style={{ fontSize: 12, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body, padding: 0 }}>{label}</legend>
      <div role="radiogroup" aria-label={label} style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <label style={row}>
          <input type="radio" name={name} checked={!value} onChange={() => onChange(false)} />
          Não
        </label>
        <label style={row}>
          <input type="radio" name={name} checked={value} onChange={() => onChange(true)} />
          Sim
        </label>
      </div>
    </fieldset>
  );
}
