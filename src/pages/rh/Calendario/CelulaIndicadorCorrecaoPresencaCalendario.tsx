import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MessageSquare, X } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import {
  presencaCorrecaoAnaliseStatusEfetivo,
  presencaCorrecaoCorIndicador,
  presencaCorrecaoRotuloAnalisePor,
  presencaCorrecaoTituloTooltipCampo,
  type PresencaCorrecaoMeta,
} from "../../../lib/rhCalendarioPresencaGestao";

type Props = {
  t: Theme;
  campo: "entrada" | "saida";
  correcao: PresencaCorrecaoMeta;
  valorCorrecao: string;
  podeAnalisar: boolean;
  onAprovar: () => void;
  onRejeitar: () => void;
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
  const estHeight = tooltipEl?.offsetHeight ?? 200;
  const spaceBelow = window.innerHeight - rect.bottom;
  const above = spaceBelow < estHeight + gap + 8 && rect.top > estHeight + gap;

  if (above) {
    return { top: rect.top - gap, left: rect.right, above: true };
  }
  return { top: rect.bottom + gap, left: rect.right, above: false };
}

export function CelulaIndicadorCorrecaoPresencaCalendario({
  t,
  campo,
  correcao,
  valorCorrecao,
  podeAnalisar,
  onAprovar,
  onRejeitar,
}: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const analiseStatus = presencaCorrecaoAnaliseStatusEfetivo(correcao);
  const corIcone = presencaCorrecaoCorIndicador(correcao);
  const titulo = presencaCorrecaoTituloTooltipCampo(campo, correcao);
  const rotuloCorrecao = campo === "entrada" ? "Correção de Entrada:" : "Correção de Saída:";
  const obs = (correcao.observacao ?? "").trim();
  const mostrarAcoes = podeAnalisar && analiseStatus === "pendente";

  const tooltipBg =
    analiseStatus === "aprovada"
      ? t.isDark
        ? "color-mix(in srgb, #22c55e 14%, #1a1625)"
        : "color-mix(in srgb, #22c55e 12%, #ffffff)"
      : analiseStatus === "recusada"
        ? t.isDark
          ? "color-mix(in srgb, #e84025 14%, #1a1625)"
          : "color-mix(in srgb, #e84025 10%, #ffffff)"
        : t.isDark
          ? "color-mix(in srgb, #f59e0b 16%, #1a1625)"
          : "color-mix(in srgb, #f59e0b 14%, #ffffff)";
  const tooltipText = t.isDark ? "#f3f4f6" : "#111827";
  const tooltipMuted = t.isDark ? "#9ca3af" : "#6b7280";
  const tooltipBorder =
    analiseStatus === "aprovada"
      ? "rgba(34,197,94,0.45)"
      : analiseStatus === "recusada"
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
  }, [open, mostrarAcoes, analiseStatus]);

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    setCoords(calcTooltipCoords(anchor, tooltipRef.current));
  }, [open, obs, correcao.corrigidoPorNome, correcao.corrigidoEm, valorCorrecao, analiseStatus]);

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
        <div style={{ fontWeight: 700, marginBottom: 6, color: corIcone }}>{titulo}</div>
        <div>
          <span style={{ color: tooltipMuted }}>Alterado por: </span>
          {correcao.corrigidoPorNome}
        </div>
        <div>
          <span style={{ color: tooltipMuted }}>Data/Hora da Alteração: </span>
          {fmtAlteracaoDataHora(correcao.corrigidoEm)}
        </div>
        <div>
          <span style={{ color: tooltipMuted }}>{rotuloCorrecao} </span>
          {valorCorrecao}
        </div>
        {obs ? (
          <div style={{ marginTop: 6 }}>
            <span style={{ color: tooltipMuted }}>Observação: </span>
            {obs}
          </div>
        ) : null}
        {analiseStatus !== "pendente" && correcao.analisePorNome && correcao.analiseEm ? (
          <>
            <div style={{ marginTop: 6 }}>
              <span style={{ color: tooltipMuted }}>{presencaCorrecaoRotuloAnalisePor(analiseStatus)} </span>
              {correcao.analisePorNome}
            </div>
            <div>
              <span style={{ color: tooltipMuted }}>Data/Hora da Análise: </span>
              {fmtAlteracaoDataHora(correcao.analiseEm)}
            </div>
          </>
        ) : null}
        {mostrarAcoes ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 10,
              paddingTop: 8,
              borderTop: `1px solid ${t.cardBorder}`,
            }}
          >
            <button
              type="button"
              aria-label="Aprovar correção de presença"
              title="Aprovar"
              onClick={() => {
                onAprovar();
                setOpen(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                padding: 0,
                borderRadius: 8,
                border: "1px solid rgba(34,197,94,0.45)",
                background: "rgba(34,197,94,0.12)",
                color: "#22c55e",
                cursor: "pointer",
              }}
            >
              <Check size={16} aria-hidden="true" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label="Rejeitar correção de presença"
              title="Rejeitar"
              onClick={() => {
                onRejeitar();
                setOpen(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                padding: 0,
                borderRadius: 8,
                border: "1px solid rgba(232,64,37,0.45)",
                background: "rgba(232,64,37,0.10)",
                color: "#e84025",
                cursor: "pointer",
              }}
            >
              <X size={16} aria-hidden="true" strokeWidth={2.5} />
            </button>
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
          aria-label={`Ver detalhes da ${campo === "entrada" ? "correção de entrada" : "correção de saída"}`}
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
