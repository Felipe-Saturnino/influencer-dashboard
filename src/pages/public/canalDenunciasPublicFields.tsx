import { type ReactNode } from "react";
import { CampoObrigatorioMark } from "../../components/CampoObrigatorioMark";

export function TimelineItem({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <li
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.05)",
        borderLeft: "3px solid var(--brand-primary, #7c3aed)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 13, color: "#b8a8d4" }}>{subtitulo}</div>
    </li>
  );
}

export function Campo({
  label,
  obrigatorio,
  legenda,
  htmlFor,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  legenda?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={htmlFor}
        style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "block", marginBottom: 8 }}
      >
        {label}
        {obrigatorio ? <CampoObrigatorioMark /> : null}
      </label>
      {legenda ? (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#9b8ab8", lineHeight: 1.5 }}>{legenda}</p>
      ) : null}
      {children}
    </div>
  );
}
