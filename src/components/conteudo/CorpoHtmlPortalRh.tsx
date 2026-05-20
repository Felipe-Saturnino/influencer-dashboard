import type { CSSProperties } from "react";
import { FONT } from "../../constants/theme";
import { sanitizePortalRhHtml } from "../../lib/portalRhWorkflow";

const baseStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  fontFamily: FONT.body,
  wordBreak: "break-word",
};

const innerCss = `
.portal-rh-corpo-html ul { margin: 0.5em 0; padding-left: 1.25em; }
.portal-rh-corpo-html li { margin: 0.25em 0; }
.portal-rh-corpo-html div + div { margin-top: 0.5em; }
`;

export function CorpoHtmlPortalRh({
  html,
  color,
  className = "portal-rh-corpo-html",
}: {
  html: string;
  color: string;
  className?: string;
}) {
  const safe = sanitizePortalRhHtml(html);
  if (!safe) return null;

  return (
    <>
      <style>{innerCss}</style>
      <div
        className={className}
        style={{ ...baseStyle, color }}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </>
  );
}
