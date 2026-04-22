import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

type SortTableThProps<T extends string> = {
  label: string;
  col: T;
  sortCol: T;
  sortDir: SortDir;
  onSort: (col: T) => void;
  thStyle: CSSProperties;
  align?: "left" | "right" | "center";
  rowSpan?: number;
  /** Conteúdo após o ícone de ordenação (ex.: botão); use stopPropagation no clique para não ordenar. */
  endAdornment?: ReactNode;
};

/**
 * Cabeçalho de coluna ordenável (tabelas de dashboard).
 * Clique alterna desc → asc; ícone neutro quando a coluna não está ativa.
 */
export function SortTableTh<T extends string>({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  thStyle,
  align = "left",
  rowSpan,
  endAdornment,
}: SortTableThProps<T>) {
  const ativo = sortCol === col;
  const ariaSort = ativo ? (sortDir === "desc" ? "descending" : "ascending") : "none";
  const justify =
    align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start";

  return (
    <th
      scope="col"
      rowSpan={rowSpan}
      onClick={() => onSort(col)}
      onKeyDown={(e: KeyboardEvent<HTMLTableCellElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(col);
        }
      }}
      tabIndex={0}
      style={{ ...thStyle, cursor: "pointer", userSelect: "none", textAlign: align }}
      aria-sort={ariaSort}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: justify,
          gap: 4,
          width: align === "right" ? "100%" : undefined,
        }}
      >
        {label}
        <span style={{ display: "inline-flex", opacity: ativo ? 1 : 0.35, flexShrink: 0 }} aria-hidden>
          {ativo ? (
            sortDir === "desc" ? (
              <ChevronDown size={11} aria-hidden />
            ) : (
              <ChevronUp size={11} aria-hidden />
            )
          ) : (
            <ChevronsUpDown size={11} aria-hidden />
          )}
        </span>
        {endAdornment != null ? <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}>{endAdornment}</span> : null}
      </span>
    </th>
  );
}
