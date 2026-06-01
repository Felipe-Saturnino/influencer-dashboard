import { useApp } from "../../context/AppContext";
import { FONT, FONT_TITLE } from "../../constants/theme";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import {
  hasSectionTitleSub,
  normalizeSectionTitleSub,
  SECTION_TITLE_SUB_DASH_GAP_PX,
  SECTION_TITLE_SUB_GAP_PX,
  SECTION_TITLE_SUB_SEPARATOR,
} from "../../lib/sectionTitleSub";

interface Props {
  /** Omitir em blocos de informação (nível 3) — ícone só no cabeçalho de página. */
  icon?: React.ReactNode;
  children: React.ReactNode;
  sub?: React.ReactNode;
  /** Sem margem inferior — toolbar na mesma linha que CTA (ex.: Agenda). */
  compact?: boolean;
}

export default function SectionTitle({ icon, children, sub, compact }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const subContent = hasSectionTitleSub(sub) ? normalizeSectionTitleSub(sub) : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: icon ? 8 : 0, marginBottom: compact ? 0 : 16, flexWrap: "wrap" }}>
      {icon ? (
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: brand.primaryIconBg,
            border: brand.primaryIconBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: brand.primaryIconColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      ) : null}
      <span
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          flexWrap: "wrap",
          columnGap: SECTION_TITLE_SUB_GAP_PX,
          rowGap: 4,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: brand.primary,
            fontFamily: FONT_TITLE,
            letterSpacing: "0.05em",
            textTransform: "uppercase" as const,
          }}
        >
          {children}
        </span>
        {subContent != null && subContent !== "" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: SECTION_TITLE_SUB_DASH_GAP_PX,
              fontSize: 11,
              fontWeight: 400,
              color: t.textMuted,
              fontFamily: FONT.body,
            }}
          >
            <span aria-hidden="true">{SECTION_TITLE_SUB_SEPARATOR}</span>
            <span>{subContent}</span>
          </span>
        ) : null}
      </span>
    </div>
  );
}
