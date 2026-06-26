import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  /** Título do tooltip — default «Alteração de escala». */
  tituloTooltip?: string;
  /** Rótulo do detalhe do valor anterior — default «Valor anterior:». */
  rotuloValorAnterior?: string;
  /** Rótulo da data/hora — default «Data/hora:». */
  rotuloDataHora?: string;
  /** Cor do ícone — default verde semântico (escala). */
  corIcone?: string;
};

type TooltipCoords = {
  top: number;
  left: number;
  above: boolean;
};

const TOOLTIP_Z = 5000;
const HIDE_DELAY_MS = 80;

function fmtAlteracaoDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function calcTooltipCoords(anchor: HTMLElement, tooltipEl: HTMLElement | null): TooltipCoords {
  const rect = anchor.getBoundingClientRect();
  const gap = 6;
  const estHeight = tooltipEl?.offsetHeight ?? 160;
  const spaceBelow = window.innerHeight - rect.bottom;
  const above = spaceBelow < estHeight + gap + 8 && rect.top > estHeight + gap;

  if (above) {
    return {
      top: rect.top - gap,
      left: rect.right,
      above: true,
    };
  }

  return {
    top: rect.bottom + gap,
    left: rect.right,
    above: false,
  };
}

export function CelulaIndicadorAlteracaoEscala({
  meta,
  valorAnteriorLabel,
  t,
  tituloTooltip = "Alteração de escala",
  rotuloValorAnterior = "Valor anterior:",
  rotuloDataHora = "Data/hora:",
  corIcone = "#22c55e",
}: CelulaIndicadorAlteracaoEscalaProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const tooltipId = useId();
  const obs = (meta.observacao ?? "").trim();
  const tooltipBg = t.isDark ? "#1a1625" : "#ffffff";
  const tooltipText = t.isDark ? "#f3f4f6" : "#111827";
  const tooltipMuted = t.isDark ? "#9ca3af" : "#6b7280";

  const clearHideTimer = () => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const show = () => {
    clearHideTimer();
    setOpen(true);
  };

  const scheduleHide = () => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const anchor = anchorRef.current;
    if (!anchor) return;
    setCoords(calcTooltipCoords(anchor, tooltipRef.current));

    const onScrollOrResize = () => {
      const a = anchorRef.current;
      if (!a) return;
      setCoords(calcTooltipCoords(a, tooltipRef.current));
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    setCoords(calcTooltipCoords(anchor, tooltipRef.current));
  }, [open, obs, meta.alteradoPorNome, meta.alteradoEm, valorAnteriorLabel]);

  useEffect(() => () => clearHideTimer(), []);

  const tooltipNode =
    open && coords ? (
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        style={{
          position: "fixed",
          top: coords.top,
          left: coords.left,
          transform: coords.above ? "translate(-100%, -100%)" : "translateX(-100%)",
          minWidth: 210,
          maxWidth: 280,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${t.isDark ? "rgba(255,255,255,0.18)" : "rgba(17,24,39,0.16)"}`,
          backgroundColor: tooltipBg,
          boxShadow: t.isDark
            ? "0 12px 32px rgba(0,0,0,0.6)"
            : "0 12px 28px rgba(17,24,39,0.22), 0 0 0 1px rgba(17,24,39,0.04)",
          fontFamily: FONT.body,
          fontSize: 11,
          lineHeight: 1.5,
          color: tooltipText,
          textAlign: "left",
          whiteSpace: "normal",
          zIndex: TOOLTIP_Z,
          pointerEvents: "auto",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6, color: tooltipText }}>{tituloTooltip}</div>
        <div>
          <span style={{ color: tooltipMuted }}>Alterado por: </span>
          {meta.alteradoPorNome}
        </div>
        <div>
          <span style={{ color: tooltipMuted }}>{rotuloDataHora} </span>
          {fmtAlteracaoDataHora(meta.alteradoEm)}
        </div>
        <div>
          <span style={{ color: tooltipMuted }}>{rotuloValorAnterior} </span>
          {valorAnteriorLabel}
        </div>
        {obs ? (
          <div style={{ marginTop: 6 }}>
            <span style={{ color: tooltipMuted }}>Observação: </span>
            {obs}
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <>
      <span
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          lineHeight: 0,
          zIndex: 3,
        }}
      >
        <button
          ref={anchorRef}
          type="button"
          aria-label="Ver detalhes da alteração desta célula"
          aria-describedby={open ? tooltipId : undefined}
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
          onFocus={show}
          onBlur={scheduleHide}
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
            color: corIcone,
            cursor: "help",
          }}
        >
          <MessageSquare
            size={11}
            strokeWidth={2.5}
            aria-hidden="true"
            fill={`color-mix(in srgb, ${corIcone} 18%, transparent)`}
          />
        </button>
      </span>
      {typeof document !== "undefined" && tooltipNode
        ? createPortal(tooltipNode, document.body)
        : null}
    </>
  );
}
