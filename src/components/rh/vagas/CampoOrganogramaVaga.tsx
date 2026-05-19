import type { CSSProperties } from "react";
import type { RhVagaOrgVinculo } from "../../../lib/rhVagaOrganograma";
import { orgVinculoDeOpcao, orgVinculoSelectValue } from "../../../lib/rhVagaOrganograma";
import type { RhOrgOrganogramaGrupoPrestador } from "../../../types/rhOrganograma";
import { CampoObrigatorioMark } from "../../CampoObrigatorioMark";
import { SelectOrganogramaTimes } from "../SelectOrganogramaTimes";
import { FONT } from "../../../constants/theme";

type Theme = { textMuted: string };

export function CampoOrganogramaVaga({
  id,
  label = "Organograma",
  value,
  onChange,
  grupos,
  disabled,
  style,
  t,
  erro,
}: {
  id: string;
  label?: string;
  value: RhVagaOrgVinculo;
  onChange: (v: RhVagaOrgVinculo) => void;
  grupos: RhOrgOrganogramaGrupoPrestador[];
  disabled?: boolean;
  style: CSSProperties;
  t: Theme;
  erro?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
        {label}
        <CampoObrigatorioMark />
      </label>
      <SelectOrganogramaTimes
        id={id}
        aria-label="Organograma"
        value={orgVinculoSelectValue(value)}
        disabled={disabled}
        grupos={grupos}
        onPick={(_id, op) => onChange(orgVinculoDeOpcao(op))}
        style={style}
      />
      {erro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4, fontFamily: FONT.body }}>{erro}</div> : null}
    </div>
  );
}
