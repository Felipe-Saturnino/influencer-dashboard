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

  return (
    <span
      style={{
        position: "absolute",
        top: 2,
        right: 2,
        lineHeight: 0,
        zIndex: 2,
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
          width: 16,
          height: 16,
          padding: 0,
          border: "none",
          borderRadius: 4,
          background: "transparent",
          color: "#f59e0b",
          cursor: "help",
        }}
      >
        <MessageSquare size={11} strokeWidth={2.25} aria-hidden="true" />
      </button>
      {hover ? (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            minWidth: 200,
            maxWidth: 280,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.isDark ? "#1a1625" : "#fffef8",
            boxShadow: t.isDark
              ? "0 8px 24px rgba(0,0,0,0.45)"
              : "0 8px 20px rgba(0,0,0,0.12)",
            fontFamily: FONT.body,
            fontSize: 11,
            lineHeight: 1.45,
            color: t.text,
            textAlign: "left",
            whiteSpace: "normal",
            zIndex: 40,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: t.text }}>Alteração de escala</div>
          <div>
            <span style={{ color: t.textMuted }}>Alterado por: </span>
            {meta.alteradoPorNome}
          </div>
          <div>
            <span style={{ color: t.textMuted }}>Data/hora: </span>
            {fmtAlteracaoDataHora(meta.alteradoEm)}
          </div>
          <div>
            <span style={{ color: t.textMuted }}>Valor anterior: </span>
            {valorAnteriorLabel}
          </div>
          {obs ? (
            <div style={{ marginTop: 6 }}>
              <span style={{ color: t.textMuted }}>Observação: </span>
              {obs}
            </div>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}
