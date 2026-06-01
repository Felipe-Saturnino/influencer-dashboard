import { FONT } from "../../constants/theme";
import { sanitizeInformativoHtml } from "../../lib/informativosWorkflow";

const ESTILO_LINK = `
.informativo-corpo-html a { color: var(--brand-primary, #7c3aed); text-decoration: underline; }
.informativo-corpo-html ul { margin: 0.5em 0; padding-left: 1.25em; }
.informativo-corpo-html li { margin: 0.25em 0; }
.informativo-corpo-html div + div { margin-top: 0.5em; }
`;

export function CorpoHtmlInformativo({
  html,
  color,
  className = "informativo-corpo-html",
}: {
  html: string;
  color: string;
  className?: string;
}) {
  return (
    <>
      <style>{ESTILO_LINK}</style>
      <div
        className={className}
        style={{ color, fontSize: 13, fontFamily: FONT.body, lineHeight: 1.55 }}
        dangerouslySetInnerHTML={{ __html: sanitizeInformativoHtml(html) }}
      />
    </>
  );
}
