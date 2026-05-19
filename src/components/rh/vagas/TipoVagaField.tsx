import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import type { RhVagaTipoSelecionavel } from "../../../lib/rhVagasFormat";
import { CampoObrigatorioMark } from "../../CampoObrigatorioMark";

type Theme = { text: string; textMuted: string };

export function TipoVagaField({
  name,
  value,
  onChange,
  t,
  erro,
}: {
  name: string;
  value: RhVagaTipoSelecionavel;
  onChange: (v: RhVagaTipoSelecionavel) => void;
  t: Theme;
  erro?: string;
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
    <fieldset style={{ border: "none", margin: "0 0 14px", padding: 0 }}>
      <legend style={{ fontSize: 12, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body, padding: 0 }}>
        Tipo de vaga
        <CampoObrigatorioMark />
      </legend>
      <div role="radiogroup" aria-label="Tipo de vaga" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={row}>
          <input
            type="radio"
            name={name}
            checked={value === "interna"}
            onChange={() => onChange("interna")}
          />
          Interna
        </label>
        <label style={row}>
          <input
            type="radio"
            name={name}
            checked={value === "externa"}
            onChange={() => onChange("externa")}
          />
          Externa
        </label>
      </div>
      {erro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 6, fontFamily: FONT.body }}>{erro}</div> : null}
    </fieldset>
  );
}
