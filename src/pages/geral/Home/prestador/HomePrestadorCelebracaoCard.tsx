import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { FONT } from "../../../../constants/theme";
import {
  getPageHeaderIconBoxStyle,
  getPageHeaderTitleRowStyle,
  PAGE_HEADER_ICON_PROPS,
} from "../../../../lib/pageHeaderStyles";
import { HOME_BODY_MUTED } from "../shared/homeSharedUi";

type HomePrestadorCelebracaoCardProps = {
  sectionId: string;
  titleIcon: LucideIcon;
  title: ReactNode;
  body: string;
  endIcon: LucideIcon;
  topBarGradient?: string;
};

export function HomePrestadorCelebracaoCard({
  sectionId,
  titleIcon: TitleIcon,
  title,
  body,
  endIcon: EndIcon,
  topBarGradient,
}: HomePrestadorCelebracaoCardProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const cardBg = brand.useBrand && brand.blockBg ? brand.blockBg : t.cardBg;

  const defaultGradient = brand.useBrand
    ? "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))"
    : "linear-gradient(90deg, #f59e0b, #ec4899, var(--brand-primary, #7c3aed))";

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: t.text,
    fontFamily: FONT_TITLE,
    letterSpacing: "0.02em",
    lineHeight: 1.3,
  };

  return (
    <section
      aria-labelledby={sectionId}
      style={{
        background: cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 20,
        padding: "24px 28px",
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
          background: topBarGradient ?? defaultGradient,
        }}
        aria-hidden
      />
      <div style={getPageHeaderTitleRowStyle()}>
        <div style={getPageHeaderIconBoxStyle(brand)}>
          <TitleIcon {...PAGE_HEADER_ICON_PROPS} />
        </div>
        <h2 id={sectionId} style={titleStyle}>{title}</h2>
      </div>
      <p
        style={{
          ...HOME_BODY_MUTED,
          color: t.textMuted,
          margin: "12px 0 0",
          fontFamily: FONT.body,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span>{body}</span>
        <EndIcon
          size={16}
          strokeWidth={2}
          aria-hidden
          color={brand.primaryIconColor}
          style={{ flexShrink: 0 }}
        />
      </p>
    </section>
  );
}
