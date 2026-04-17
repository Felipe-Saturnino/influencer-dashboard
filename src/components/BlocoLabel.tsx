import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { FONT } from "../constants/theme";

/** Rótulo uppercase pequeno acima de blocos/tabelas (padrão de páginas operacionais / Estúdio). */
export function BlocoLabel({ label }: { label: string }) {
  const brand = useDashboardBrand();
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color: brand.secondary,
        fontFamily: FONT.body,
      }}
    >
      {label}
    </span>
  );
}
