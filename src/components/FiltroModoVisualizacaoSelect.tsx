import { useState, useRef, useLayoutEffect, useMemo, useId, useCallback, type CSSProperties } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { FilterBarIcons } from "../lib/filterBarIconCatalog";
import { FONT } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import {
  FILTRO_BAR_PILL_GAP,
  FILTRO_BAR_PILL_PADDING,
  getFiltroBarPillStateStyle,
  getFiltroCampoAtivoStyle,
} from "../lib/filterBarStyles";

export type ModoVisualizacaoOption = { value: string; label: string };

export interface FiltroModoVisualizacaoSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly ModoVisualizacaoOption[];
  /** Valor considerado “padrão” (estilo inativo no trigger). Default: primeira opção. */
  defaultValue?: string;
  /** Destaque no trigger quando valor ≠ `defaultValue` (default true). */
  highlightWhenNotDefault?: boolean;
  disabled?: boolean;
  ariaLabelPrefix?: string;
  listboxAriaLabel?: string;
}

function useDropdownAlign(open: boolean, triggerRef: React.RefObject<HTMLButtonElement | null>, minWidth: number) {
  const [alignRight, setAlignRight] = useState(false);
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const margin = 16;
    const spaceRight = window.innerWidth - r.right;
    setAlignRight(spaceRight < margin && r.left > minWidth);
  }, [open, minWidth, triggerRef]);
  return alignRight;
}

/**
 * Seleção única de modo de visualização (ex.: Mês / Semana / Dia na Agenda).
 * Trigger com o mesmo pill/estados que Operadora, Influencer e Histórico (Overview Influencer).
 */
export function FiltroModoVisualizacaoSelect({
  value,
  onChange,
  options,
  defaultValue,
  highlightWhenNotDefault = true,
  disabled = false,
  ariaLabelPrefix = "Modo de visualização",
  listboxAriaLabel = "Selecionar modo de visualização",
}: FiltroModoVisualizacaoSelectProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const resolvedDefault = defaultValue ?? options[0]?.value ?? "";
  const isHighlighted = highlightWhenNotDefault && value !== resolvedDefault;
  const stateStyle = getFiltroBarPillStateStyle(t, brand, isHighlighted);
  const activeOptionStyle = getFiltroCampoAtivoStyle(brand);
  const accentColor = activeOptionStyle.color;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const listboxId = `filtro-modo-vis-${uid.replace(/:/g, "")}`;

  const closePanel = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closePanel();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, closePanel]);

  const alignRight = useDropdownAlign(open, triggerRef, 160);

  const triggerLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? value,
    [options, value]
  );

  const panelStyle: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: alignRight ? "auto" : 0,
    right: alignRight ? 0 : "auto",
    zIndex: 200,
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: 8,
    minWidth: 160,
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    maxHeight: 240,
    overflowY: "auto",
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`${ariaLabelPrefix} — ${triggerLabel}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          padding: FILTRO_BAR_PILL_PADDING,
          borderRadius: 999,
          fontSize: 13,
          fontFamily: FONT.body,
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          display: "flex",
          alignItems: "center",
          gap: FILTRO_BAR_PILL_GAP,
          whiteSpace: "nowrap",
          lineHeight: 1.25,
          transition: "all 0.15s",
          opacity: disabled ? 0.6 : 1,
          ...stateStyle,
        }}
      >
        {FilterBarIcons.modoVisualizacao}
        {triggerLabel}
        {open ? <ChevronUp size={9} aria-hidden="true" /> : <ChevronDown size={9} aria-hidden="true" />}
      </button>

      {open && (
        <div id={listboxId} role="listbox" aria-label={listboxAriaLabel} style={panelStyle}>
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => {
                  onChange(opt.value);
                  closePanel();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(opt.value);
                    closePanel();
                  }
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: selected ? activeOptionStyle.background : "transparent",
                  color: selected ? accentColor : t.text,
                  fontSize: 12,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: selected ? 700 : 400,
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: `1.5px solid ${selected ? accentColor : t.cardBorder}`,
                    background: selected ? accentColor : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected ? <Check size={9} color="#fff" strokeWidth={3} aria-hidden="true" /> : null}
                </span>
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
