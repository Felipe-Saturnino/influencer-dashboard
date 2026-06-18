import type { CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";

const labelStyle: CSSProperties = {
  display: "block",
  fontFamily: FONT.body,
  fontSize: 11,
  fontWeight: 700,
  color: "inherit",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "1px",
};

export function TurnosDealersFields({
  turnoManha,
  turnoTarde,
  turnoNoite,
  onTurnoManha,
  onTurnoTarde,
  onTurnoNoite,
  obrigatorio = false,
  baseId,
}: {
  turnoManha: string;
  turnoTarde: string;
  turnoNoite: string;
  onTurnoManha: (v: string) => void;
  onTurnoTarde: (v: string) => void;
  onTurnoNoite: (v: string) => void;
  obrigatorio?: boolean;
  baseId: string;
}) {
  const { theme: t } = useApp();

  const inputStyle: CSSProperties = {
    width: "100%",
    background: t.inputBg ?? t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 10,
    padding: "10px 14px",
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  };

  const fieldStyle: CSSProperties = { marginBottom: 18 };

  return (
    <>
      <div style={{ ...labelStyle, marginBottom: 10, textTransform: "none", letterSpacing: "0.04em", fontSize: 12, color: t.text }}>
        Horário de turno dos dealers
      </div>
      <div className="app-grid-2-tight">
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor={`${baseId}-turno-manha`}>
            Turno da manhã — horário de início
            {obrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <input
            id={`${baseId}-turno-manha`}
            type="time"
            value={turnoManha}
            onChange={(e) => onTurnoManha(e.target.value)}
            style={inputStyle}
            aria-label="Horário de início do turno da manhã"
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor={`${baseId}-turno-tarde`}>
            Turno da tarde — horário de início
            {obrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <input
            id={`${baseId}-turno-tarde`}
            type="time"
            value={turnoTarde}
            onChange={(e) => onTurnoTarde(e.target.value)}
            style={inputStyle}
            aria-label="Horário de início do turno da tarde"
          />
        </div>
        <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          <label style={labelStyle} htmlFor={`${baseId}-turno-noite`}>
            Turno da noite — horário de início
            {obrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <input
            id={`${baseId}-turno-noite`}
            type="time"
            value={turnoNoite}
            onChange={(e) => onTurnoNoite(e.target.value)}
            style={inputStyle}
            aria-label="Horário de início do turno da noite"
          />
        </div>
      </div>
    </>
  );
}
