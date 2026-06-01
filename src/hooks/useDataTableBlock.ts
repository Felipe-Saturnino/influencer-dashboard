import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "./useDashboardBrand";
import { createDataTableBlockStyles } from "../lib/dataTableStyles";

/** Estilos canónicos de tabela em bloco (Overview Spin → Detalhamento Diário). */
export function useDataTableBlock() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return useMemo(() => createDataTableBlockStyles(t, brand), [t, brand]);
}
