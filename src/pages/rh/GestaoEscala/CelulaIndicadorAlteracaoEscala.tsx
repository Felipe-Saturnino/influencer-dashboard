import { useId, useState } from "react";
import { MessageSquare } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";

export type EscalaAlteracaoCelulaMeta = {
  valorAnterior: string;
  alteradoPorNome: string;
  alteradoEm: string;
  observacao: string | null;
};

type CelulaIndicadorAlteracaoEscalaProps = {
  meta: EscalaAlteracaoCelulaMeta;
  valorAnteriorLabel: string;
  t: Theme;
};

function fmtAlteracaoDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function CelulaIndicadorAlteracaoEscala({
  meta,
  valorAnteriorLabel,
  t,
}: CelulaIndicadorAlteracaoEscalaProps) {
  const [hover, setHover] = useState(false);
  const tooltipId = useId();
  const obs = (meta.observacao ?? "").trim();
  const tooltipBg = t.isDark ? "#1a1625" : "#ffffff";
  const tooltipText = t.isDark ? "#f3f4f6" : "#111827";
  const tooltipMuted = t.isDark ? "#9ca3af" : "#6b7280";

  return (
    <span
      style={{
        position: "absolute",
        top: 3,
        right: 3,
        lineHeight: 0,
        zIndex: 3,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-label="Ver detalhes da alteração desta célula"
        aria-describedby={hover ? tooltipId : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          padding: 0,
          border: "none",
          borderRadius: 3,
          background: "transparent",
          color: "#22c55e",
          cursor: "help",
        }}
      >
        <MessageSquare size={11} strokeWidth={2.5} aria-hidden="true" fill="color-mix(in srgb, #22c55e 18%, transparent)" />
      </button>
      {hover ? (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            minWidth: 210,
            maxWidth: 280,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.12)"}`,
            background: tooltipBg,
            opacity: 1,
            boxShadow: t.isDark
              ? "0 10px 28px rgba(0,0,0,0.55)"
              : "0 10px 24px rgba(17,24,39,0.18), 0 2px 6px rgba(17,24,39,0.08)",
            fontFamily: FONT.body,
            fontSize: 11,
            lineHeight: 1.5,
            color: tooltipText,
            textAlign: "left",
            whiteSpace: "normal",
            zIndex: 9999,
            isolation: "isolate",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: tooltipText }}>Alteração de escala</div>
          <div>
            <span style={{ color: tooltipMuted }}>Alterado por: </span>
            {meta.alteradoPorNome}
          </div>
          <div>
            <span style={{ color: tooltipMuted }}>Data/hora: </span>
            {fmtAlteracaoDataHora(meta.alteradoEm)}
          </div>
          <div>
            <span style={{ color: tooltipMuted }}>Valor anterior: </span>
            {valorAnteriorLabel}
          </div>
          {obs ? (
            <div style={{ marginTop: 6 }}>
              <span style={{ color: tooltipMuted }}>Observação: </span>
              {obs}
            </div>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}
