import { Fragment, type ReactNode } from "react";

/** Negrito (`**texto**`) e itálico (`*texto*`) inline — usado na Ajuda. */
function parseAjudaInlineLine(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      parts.push(<em key={key++}>{match[2]}</em>);
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length ? parts : [line];
}

/** Renderiza parágrafos da Ajuda com quebras de linha e markdown inline mínimo. */
export function renderAjudaTexto(texto: string): ReactNode {
  const lines = texto.split("\n");
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 ? "\n" : null}
      {parseAjudaInlineLine(line)}
    </Fragment>
  ));
}
