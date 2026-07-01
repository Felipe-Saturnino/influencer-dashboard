import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import {
  PRESENCA_JUSTIFICATIVA_MEDICO_STATUS_LABEL,
  presencaJustificativaMedicoStatusEfetivo,
  PRESENCA_JUSTIFICATIVA_MEDICO_COR,
  type PresencaJustificativaMeta,
} from "../../../lib/rhCalendarioPresencaGestao";

type Props = {
  t: Theme;
  justificativa: PresencaJustificativaMeta;
};

type TooltipCoords = {
  top: number;
  left: number;
  above: boolean;
};

const TOOLTIP_Z = 5000;
const HIDE_DELAY_MS = 120;

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
    return { top: rect.top - gap, left: rect.right, above: true };
  }
  return { top: rect.bottom + gap, left: rect.right, above: false };
}

export function CelulaIndicadorJustificativaMedicoPresencaCalendario({ t, justificativa }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const atestadoStatus = presencaJustificativaMedicoStatusEfetivo(justificativa);
  const corIcone = PRESENCA_JUSTIFICATIVA_MEDICO_COR[atestadoStatus];
  const statusLabel = PRESENCA_JUSTIFICATIVA_MEDICO_STATUS_LABEL[atestadoStatus];

  const tooltipBg =
    atestadoStatus === "aprovado"
      ? t.isDark
        ? "color-mix(in srgb, #22c55e 14%, #1a1625)"
        : "color-mix(in srgb, #22c55e 12%, #ffffff)"
      : atestadoStatus === "rejeitado"
        ? t.isDark
          ? "color-mix(in srgb, #e84025 14%, #1a1625)"
          : "color-mix(in srgb, #e84025 10%, #ffffff)"
        : t.isDark
          ? "color-mix(in srgb, #f59e0b 16%, #1a1625)"
          : "color-mix(in srgb, #f59e0b 14%, #ffffff)";
  const tooltipText = t.isDark ? "#f3f4f6" : "#111827";
  const tooltipMuted = t.isDark ? "#9ca3af" : "#6b7280";
  const tooltipBorder =
    atestadoStatus === "aprovado"
      ? "rgba(34,197,94,0.45)"
      : atestadoStatus === "rejeitado"
        ? "rgba(232,64,37,0.45)"
        : t.isDark
          ? "rgba(255,255,255,0.18)"
          : "rgba(245,158,11,0.45)";

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
  }, [open, atestadoStatus]);

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    setCoords(calcTooltipCoords(anchor, tooltipRef.current));
  }, [open, justificativa.registradoPorNome, justificativa.registradoEm, atestadoStatus]);

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
          minWidth: 220,
          maxWidth: 300,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${tooltipBorder}`,
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
        <div style={{ fontWeight: 700, marginBottom: 6, color: corIcone }}>Justificativa - Médico</div>
        <div>
          <span style={{ color: tooltipMuted }}>Alterado por: </span>
          {justificativa.registradoPorNome}
        </div>
        <div>
          <span style={{ color: tooltipMuted }}>Data/Hora da Alteração: </span>
          {fmtAlteracaoDataHora(justificativa.registradoEm)}
        </div>
        <div>
          <span style={{ color: tooltipMuted }}>Status do Atestado: </span>
          {statusLabel}
        </div>
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
          aria-label="Ver detalhes da justificativa médica"
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
      {typeof document !== "undefined" && tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </>
  );
}
