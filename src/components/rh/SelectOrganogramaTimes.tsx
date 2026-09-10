import type { CSSProperties } from "react";
import type {
  RhOrgOrganogramaGrupoPrestador,
  RhOrgPrestadorVinculoNivel,
  RhOrgPrestadorVinculoOpcao,
} from "../../types/rhOrganograma";
import { encontrarVinculoPorSelectValue, vinculoParaSelectValue } from "../../lib/rhOrganogramaTree";
import { SelectListaComBusca, type SelectListaComBuscaOption } from "../SelectListaComBusca";
import { placeholderPesquisaFiltro } from "../../lib/searchBarConstants";

const DEFAULT_LEVELS: RhOrgPrestadorVinculoNivel[] = ["diretoria", "gerencia", "time"];

/**
 * Select com grupos por Diretoria ou Diretoria › Gerência, painel com busca.
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
  const options: SelectListaComBuscaOption[] = [
    { value: "", label: "— Selecione —" },
    ...grupos.flatMap((gr) => {
      const filtrados = gr.vinculos.filter((v) => allow.has(v.nivel));
      if (filtrados.length === 0) {
        return [
          {
            value: `__empty_${gr.key}`,
            label: gr.emptyTimesPlaceholder ?? "Nenhuma opção neste ramo.",
            disabled: true,
            group: gr.label,
          },
        ];
      }
      return filtrados.map((o) => ({
        value: vinculoParaSelectValue(o),
        label: o.nivel === "time" ? o.timeNome : o.label,
        group: gr.label,
      }));
    }),
  ];

  return (
    <SelectListaComBusca
      id={id}
      label={ariaLabel ?? "Organograma"}
      searchPlaceholder={placeholderPesquisaFiltro("time")}
      value={value}
      disabled={disabled}
      variant="campo"
      options={options}
      style={style}
      onChange={(idSel) => {
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
    />
  );
}
