import type { CSSProperties } from "react";
import type {
  RhOrgOrganogramaGrupoPrestador,
  RhOrgPrestadorVinculoNivel,
  RhOrgPrestadorVinculoOpcao,
} from "../../types/rhOrganograma";
import { encontrarVinculoPorSelectValue, vinculoParaSelectValue } from "../../lib/rhOrganogramaTree";

const DEFAULT_LEVELS: RhOrgPrestadorVinculoNivel[] = ["diretoria", "gerencia", "time"];

/**
 * Select com optgroup por Diretoria ou Diretoria › Gerência.
 * Por padrão aceita vínculo na diretoria, na gerência ou no time; use `acceptLevels` para restringir (ex.: só time em vagas).
 */
export function SelectOrganogramaTimes({
  id,
  "aria-label": ariaLabel,
  value,
  disabled,
  grupos,
  onPick,
  acceptLevels = DEFAULT_LEVELS,
  style,
}: {
  id: string;
  "aria-label"?: string;
  value: string;
  disabled?: boolean;
  grupos: RhOrgOrganogramaGrupoPrestador[];
  onPick: (selectValue: string | null, opcao: RhOrgPrestadorVinculoOpcao | null) => void;
  /** Quando omitido, diretoria + gerência + time. */
  acceptLevels?: RhOrgPrestadorVinculoNivel[];
  style: CSSProperties;
}) {
  const allow = new Set(acceptLevels);
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
        const flat = grupos.flatMap((gr) => gr.vinculos);
        const op = encontrarVinculoPorSelectValue(flat, idSel);
        if (op && allow.has(op.nivel)) {
          onPick(idSel, op);
          return;
        }
        onPick(null, null);
      }}
      style={style}
    >
      <option value="">— Selecione —</option>
      {grupos.map((gr) => {
        const filtrados = gr.vinculos.filter((v) => allow.has(v.nivel));
        const placeholder = gr.emptyTimesPlaceholder ?? "Nenhuma opção neste ramo.";
        return (
          <optgroup key={gr.key} label={gr.label}>
            {filtrados.length > 0 ? (
              filtrados.map((o) => (
                <option key={`${gr.key}-${o.nivel}-${vinculoParaSelectValue(o)}`} value={vinculoParaSelectValue(o)}>
                  {o.nivel === "time" ? o.timeNome : o.label}
                </option>
              ))
            ) : (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
          </optgroup>
        );
      })}
    </select>
  );
}
