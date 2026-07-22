import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FONT } from "../constants/theme";
import type { Theme } from "../constants/theme";
import {
  clampPageIndex,
  labelFaixaPaginacao,
  totalPaginasTabela,
} from "../lib/tablePagination";

type Props = {
  t: Theme;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  /** Esconde a barra quando há uma única página (default true). */
  hideIfSinglePage?: boolean;
  style?: CSSProperties;
};

/**
 * Controles de paginação client-side para tabelas densas (Prestadores, Escala).
 * Não altera o dataset — só a fatia visível.
 */
export function TabelaPaginacaoBar({
  t,
  page,
  pageSize,
  totalItems,
  onPageChange,
  hideIfSinglePage = true,
  style,
}: Props) {
  const totalPages = totalPaginasTabela(totalItems, pageSize);
  const pageSafe = clampPageIndex(page, totalItems, pageSize);

  if (hideIfSinglePage && totalPages <= 1) return null;

  const btnBase: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    cursor: "pointer",
    padding: 0,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 12,
        fontFamily: FONT.body,
        fontSize: 12,
        color: t.textMuted,
        ...style,
      }}
    >
      <button
        type="button"
        aria-label="Página anterior"
        disabled={pageSafe <= 0}
        onClick={() => onPageChange(pageSafe - 1)}
        style={{
          ...btnBase,
          opacity: pageSafe <= 0 ? 0.35 : 1,
          cursor: pageSafe <= 0 ? "not-allowed" : "pointer",
        }}
      >
        <ChevronLeft size={14} aria-hidden />
      </button>
      <span aria-live="polite">
        {labelFaixaPaginacao(pageSafe, pageSize, totalItems)}
        {totalPages > 1 ? ` · página ${pageSafe + 1} de ${totalPages}` : null}
      </span>
      <button
        type="button"
        aria-label="Próxima página"
        disabled={pageSafe >= totalPages - 1}
        onClick={() => onPageChange(pageSafe + 1)}
        style={{
          ...btnBase,
          opacity: pageSafe >= totalPages - 1 ? 0.35 : 1,
          cursor: pageSafe >= totalPages - 1 ? "not-allowed" : "pointer",
        }}
      >
        <ChevronRight size={14} aria-hidden />
      </button>
    </div>
  );
}
