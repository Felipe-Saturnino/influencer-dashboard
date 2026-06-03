import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { FONT } from "../../../../constants/theme";

export function HomeAtalhoCard({
  href,
  onClick,
  icon,
  title,
  subtitle,
  iconBg,
}: {
  href: string;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  iconBg: string;
}) {
  const { theme: t } = useApp();

  return (
    <a
      href={href}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "16px 18px",
        borderRadius: 12,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg ?? t.cardBg,
        color: t.text,
        fontFamily: FONT.body,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.35,
              overflowWrap: "break-word",
              wordBreak: "normal",
            }}
          >
            {title}
          </span>
          <ArrowRight size={14} color={t.textMuted} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        </div>
        {subtitle ? (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: t.textMuted,
              lineHeight: 1.5,
              overflowWrap: "break-word",
              wordBreak: "normal",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </a>
  );
}
