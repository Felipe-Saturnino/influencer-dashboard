import { ChevronRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { getPageContentBoxShadow } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";

const BTN_LI_OCULTAR: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  marginTop: 14,
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid var(--brand-primary, #7c3aed)",
  background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)",
  color: "var(--brand-primary, #7c3aed)",
  fontSize: 12,
  fontWeight: 700,
  fontFamily: FONT.body,
  cursor: "pointer",
};

export function HomeStaffFeedCard({
  title,
  titleIcon,
  recolhido,
  onExpandir,
  onLiEOcultar,
  mostrarLiEOcultar = true,
  rodape,
  reacoes,
  children,
}: {
  title: string;
  titleIcon?: ReactNode;
  recolhido: boolean;
  onExpandir: () => void;
  onLiEOcultar: () => void;
  /** Default true. Manuais com ciência pendente ficam sem o botão. */
  mostrarLiEOcultar?: boolean;
  rodape?: string;
  /** Barra de reações (UX). Não substitui «Li e Ocultar». */
  reacoes?: ReactNode;
  children: ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const cardShadow = getPageContentBoxShadow(t.isDark ?? false);

  const tituloEl = (
    <h3
      style={{
        margin: 0,
        flex: 1,
        fontSize: 15,
        fontWeight: 800,
        color: t.text,
        fontFamily: FONT.body,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {titleIcon ? <span style={{ display: "inline-flex", flexShrink: 0 }}>{titleIcon}</span> : null}
      <span>{title}</span>
    </h3>
  );

  if (recolhido && mostrarLiEOcultar) {
    return (
      <article
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 14,
          padding: "12px 16px",
          boxShadow: cardShadow,
        }}
      >
        <button
          type="button"
          onClick={onExpandir}
          aria-expanded={false}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: FONT.body,
          }}
        >
          {tituloEl}
          <ChevronRight
            size={18}
            color={brand.primary}
            aria-hidden
            style={{ flexShrink: 0, transform: "rotate(0deg)" }}
          />
        </button>
      </article>
    );
  }

  return (
    <article
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: cardShadow,
      }}
    >
      {tituloEl}
      <div style={{ marginTop: 12 }}>{children}</div>
      {rodape ? (
        <p style={{ fontSize: 12, color: t.textMuted, margin: "14px 0 0", fontFamily: FONT.body }}>{rodape}</p>
      ) : null}
      {reacoes ? <div style={{ marginTop: 12 }}>{reacoes}</div> : null}
      {mostrarLiEOcultar ? (
        <button type="button" onClick={onLiEOcultar} style={{ ...BTN_LI_OCULTAR, borderColor: t.cardBorder }}>
          Li e Ocultar
        </button>
      ) : null}
    </article>
  );
}
