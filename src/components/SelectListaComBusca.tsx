import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { FONT } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { useListboxKeyboardNavigation } from "../hooks/useListboxKeyboardNavigation";
import {
  FILTRO_BAR_PILL_GAP,
  FILTRO_BAR_PILL_PADDING,
  getFiltroBarPillStateStyle,
} from "../lib/filterBarStyles";
import { placeholderPesquisaFiltro } from "../lib/searchBarConstants";
import { textoContemBusca } from "../lib/searchText";
import type { SelectListaComBuscaOption } from "../lib/selectListaComBuscaOptions";
import { BarraPesquisaFiltroPainel } from "./BarraPesquisaFiltroPainel";

export type { SelectListaComBuscaOption };

export type SelectListaComBuscaProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectListaComBuscaOption[];
  /** aria-label do trigger e nome usado no placeholder «Pesquisar …». */
  label: string;
  searchPlaceholder?: string;
  icon?: ReactNode;
  /** `pill` = barra de filtros (Staff/Time). `campo` = formulário/modal largura 100%. */
  variant?: "pill" | "campo";
  minWidth?: number;
  disabled?: boolean;
  style?: CSSProperties;
  wrapperStyle?: CSSProperties;
  id?: string;
  listboxAriaLabel?: string;
};

/**
 * Seleção única com painel e barra de pesquisa — mesmo contrato visual do Staff/Time no Calendário.
 */
export function SelectListaComBusca({
  value,
  onChange,
  options,
  label,
  searchPlaceholder,
  icon,
  variant = "pill",
  minWidth = 160,
  disabled = false,
  style,
  wrapperStyle,
  id,
  listboxAriaLabel,
}: SelectListaComBuscaProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const isPill = variant === "pill";
  const accentColor = brand.useBrand ? "var(--brand-action, #7c3aed)" : brand.accent;
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const listboxId = `select-busca-${(id ?? uid).replace(/:/g, "")}`;
  const placeholder = searchPlaceholder ?? placeholderPesquisaFiltro(label);

  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected?.label || label;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return options;
    return options.filter((o) => !o.disabled && textoContemBusca(o.label, searchQuery));
  }, [options, searchQuery]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, SelectListaComBuscaOption[]>();
    for (const opt of filtered) {
      const g = opt.group ?? "";
      if (!map.has(g)) {
        map.set(g, []);
        order.push(g);
      }
      map.get(g)!.push(opt);
    }
    return order.map((g) => ({ group: g, items: map.get(g)! }));
  }, [filtered]);

  const closePanel = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closePanel();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [closePanel]);

  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  const [alignRight, setAlignRight] = useState(false);
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const margin = 16;
    const spaceRight = window.innerWidth - r.right;
    setAlignRight(spaceRight < margin && r.left > Math.max(minWidth, 240));
  }, [open, minWidth]);

  const { activeIndex, optionRefs, onKeyDown } = useListboxKeyboardNavigation({
    items: filtered,
    onSelect: (item) => {
      if (item.disabled) return;
      onChange(item.value);
      closePanel();
    },
    onEscape: closePanel,
  });

  const pillState = getFiltroBarPillStateStyle(t, brand, false);

  const triggerStyle: CSSProperties = isPill
    ? {
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
        opacity: disabled ? 0.6 : 1,
        minWidth,
        ...pillState,
        ...style,
      }
    : {
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg ?? t.cardBg,
        color: t.text,
        fontSize: 13,
        fontFamily: FONT.body,
        cursor: disabled ? "not-allowed" : "pointer",
        outline: "none",
        display: "flex",
        alignItems: "center",
        gap: 8,
        textAlign: "left",
        opacity: disabled ? 0.75 : 1,
        ...style,
      };

  const panelStyle: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: alignRight ? "auto" : 0,
    right: alignRight ? 0 : "auto",
    zIndex: isPill ? 200 : 1100,
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: 8,
    minWidth: isPill ? Math.max(minWidth, 240) : "100%",
    width: isPill ? undefined : "100%",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    maxHeight: "min(320px, 55vh)",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  };

  function pick(opt: SelectListaComBuscaOption) {
    if (opt.disabled) return;
    onChange(opt.value);
    closePanel();
  }

  let flatIndex = 0;

  return (
    <div ref={ref} style={{ position: "relative", display: isPill ? "inline-flex" : "block", width: isPill ? undefined : "100%", ...wrapperStyle }}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={label}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={triggerStyle}
      >
        {icon}
        <span style={{ flex: isPill ? undefined : 1, overflow: "hidden", textOverflow: "ellipsis" }}>{triggerLabel}</span>
        {open ? <ChevronUp size={isPill ? 9 : 14} aria-hidden="true" /> : <ChevronDown size={isPill ? 9 : 14} aria-hidden="true" />}
      </button>

      {open ? (
        <div style={panelStyle}>
          <BarraPesquisaFiltroPainel
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={placeholder}
            aria-label={placeholder}
            onKeyDown={onKeyDown}
            aria-activedescendant={filtered[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined}
          />
          <div
            id={listboxId}
            role="listbox"
            aria-label={listboxAriaLabel ?? label}
            style={{ overflowY: "auto", flex: 1, minHeight: 0 }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "10px 12px",
                  fontSize: 12,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  textAlign: "center",
                }}
              >
                Nenhum resultado para a pesquisa.
              </div>
            ) : (
              groups.map(({ group, items }) => (
                <div key={group || "__ungrouped__"}>
                  {group ? (
                    <div
                      style={{
                        padding: "6px 12px 4px",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: t.textMuted,
                        fontFamily: FONT.body,
                      }}
                    >
                      {group}
                    </div>
                  ) : null}
                  {items.map((opt) => {
                    const i = flatIndex++;
                    const selectedOpt = opt.value === value;
                    const active = i === activeIndex;
                    return (
                      <div
                        key={`${group}:${opt.value}:${i}`}
                        id={`${listboxId}-opt-${i}`}
                        ref={(el) => {
                          optionRefs.current[i] = el;
                        }}
                        role="option"
                        aria-selected={selectedOpt}
                        aria-disabled={opt.disabled || undefined}
                        tabIndex={-1}
                        onClick={() => pick(opt)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "none",
                          background: selectedOpt
                            ? "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                            : active
                              ? "color-mix(in srgb, var(--brand-action, #7c3aed) 8%, transparent)"
                              : "transparent",
                          color: selectedOpt ? accentColor : t.text,
                          fontSize: 12,
                          fontFamily: FONT.body,
                          cursor: opt.disabled ? "not-allowed" : "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontWeight: selectedOpt ? 700 : 400,
                          boxSizing: "border-box",
                          opacity: opt.disabled ? 0.55 : 1,
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            flexShrink: 0,
                            border: `1.5px solid ${selectedOpt ? accentColor : t.cardBorder}`,
                            background: selectedOpt ? accentColor : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {selectedOpt ? <Check size={9} color="#fff" strokeWidth={3} aria-hidden="true" /> : null}
                        </span>
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
