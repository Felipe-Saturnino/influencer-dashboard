import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { HOME_INVESTIDOR_BODY_MUTED } from "./homeInvestidorUi";

export function BoasVindasInvestidor({ nome }: { nome: string }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const cardBg =
    brand.useBrand && brand.blockBg ? brand.blockBg : t.cardBg;

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 20,
        padding: "28px 28px 26px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, var(--brand-primary, #7c3aed), var(--brand-secondary, #1e36f8))`,
        }}
        aria-hidden
      />
      <h1
        style={{
          margin: "0 0 12px",
          fontSize: 22,
          fontWeight: 800,
          color: t.text,
          fontFamily: FONT_TITLE,
          letterSpacing: "0.02em",
          lineHeight: 1.25,
        }}
      >
        Olá {nome}!
      </h1>
      <p style={{ ...HOME_INVESTIDOR_BODY_MUTED, color: t.text, marginBottom: 10 }}>
        Acesso privilegiado. Parceria real.
      </p>
      <p style={{ ...HOME_INVESTIDOR_BODY_MUTED, color: t.textMuted }}>
        Você enxerga a operação de onde ela acontece. Dashboards e métricas calibrados com a profundidade de quem faz
        parte do resultado.
      </p>
    </div>
  );
}
