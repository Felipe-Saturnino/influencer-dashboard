import type { CSSProperties } from "react";
import type { RhOrgOrganogramaGrupoPrestador, RhOrgTimeOpcao } from "../../types/rhOrganograma";

/**
 * Select com optgroup por Diretoria › Gerência; ramos sem time mostram opção desabilitada.
 */
export function SelectOrganogramaTimes({
  id,
  "aria-label": ariaLabel,
  value,
  disabled,
  grupos,
  onPick,
  style,
}: {
  id: string;
  "aria-label"?: string;
  value: string;
  disabled?: boolean;
  grupos: RhOrgOrganogramaGrupoPrestador[];
  onPick: (timeId: string | null, opcao: RhOrgTimeOpcao | null) => void;
  style: CSSProperties;
}) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onChange={(e) => {
        const idSel = e.target.value;
        if (!idSel) {
          onPick(null, null);
          return;
        }
        for (const gr of grupos) {
          const op = gr.times.find((t) => t.timeId === idSel);
          if (op) {
            onPick(idSel, op);
            return;
          }
        }
        onPick(null, null);
      }}
      style={style}
    >
      <option value="">— Selecione —</option>
      {grupos.map((gr) => (
        <optgroup key={gr.key} label={gr.label}>
          {gr.times.length > 0 ? (
            gr.times.map((o) => (
              <option key={o.timeId} value={o.timeId}>
                {o.timeNome}
              </option>
            ))
          ) : (
            <option value="" disabled>
              {gr.emptyLabel}
            </option>
          )}
        </optgroup>
      ))}
    </select>
  );
}
