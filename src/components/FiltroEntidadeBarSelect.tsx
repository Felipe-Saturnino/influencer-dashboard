import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useMemo,
  useId,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { FONT } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import {
  FILTRO_BAR_PILL_GAP,
  FILTRO_BAR_PILL_PADDING,
  getFiltroBarPillStateStyle,
} from "../lib/filterBarStyles";
import { FILTER_SEARCH_STAFF } from "../lib/searchBarConstants";
import { BarraPesquisaFiltroPainel } from "./BarraPesquisaFiltroPainel";

const SEMANTIC_RED = "#e84025";

export type FiltroEntidadeBarOption = { id: string; name: string };

export interface FiltroEntidadeBarSelectProps {
  selected: string[];
  onChange: (value: string[]) => void;
  items: readonly FiltroEntidadeBarOption[];
  icon: ReactNode;
  /** Rótulo do trigger quando nenhum item está selecionado. */
  triggerEmptyLabel: string;
  ariaFilterPrefix: string;
  listboxAriaLabel: string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
}

/**
 * Dropdown na barra (pill 999 + ícone) — mesmo contrato visual que `FiltroInfluencerSelect`.
 */
export function FiltroEntidadeBarSelect({
  selected,
  onChange,
  items,
  icon,
  triggerEmptyLabel,
  ariaFilterPrefix,
  listboxAriaLabel,
  enableSearch: enableSearchProp,
  searchPlaceholder = FILTER_SEARCH_STAFF,
  disabled = false,
}: FiltroEntidadeBarSelectProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const accentColor = brand.useBrand ? "var(--brand-action, #7c3aed)" : brand.accent;
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const listboxId = `filtro-entidade-bar-${uid.replace(/:/g, "")}`;

  const enableSearch = enableSearchProp ?? items.length > 5;
  const dropdownMinWidth = enableSearch ? 240 : 190;
  const isActive = selected.length > 0;
  const activeStyle = getFiltroBarPillStateStyle(t, brand, isActive);

  const [alignRight, setAlignRight] = useState(false);
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const margin = 16;
    const spaceRight = window.innerWidth - r.right;
    setAlignRight(spaceRight < margin && r.left > dropdownMinWidth);
  }, [open, dropdownMinWidth]);

  const closePanel = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closePanel();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [closePanel]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }
    if (enableSearch) {
      const id = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open, enableSearch]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [...items];
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const triggerLabel =
    selected.length === 0
      ? triggerEmptyLabel
      : selected.length === 1
        ? (items.find((i) => i.id === selected[0])?.name ?? triggerEmptyLabel)
        : `${selected.length} selecionados`;

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
    minWidth: dropdownMinWidth,
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    maxHeight: enableSearch ? "min(320px, 55vh)" : 240,
    overflowY: "auto",
  };

  function renderOptionRow(id: string, label: string, picked: boolean, onPick: () => void) {
    return (
      <div
        key={id}
        role="option"
        aria-selected={picked}
        tabIndex={0}
        onClick={onPick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick();
          }
        }}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: "none",
          background: picked
            ? "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
            : "transparent",
          color: picked ? accentColor : t.text,
          fontSize: 12,
          fontFamily: FONT.body,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: picked ? 700 : 400,
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            flexShrink: 0,
            border: `1.5px solid ${picked ? accentColor : t.cardBorder}`,
            background: picked ? accentColor : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {picked ? <Check size={9} color="#fff" strokeWidth={3} aria-hidden="true" /> : null}
        </span>
        {label}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        ref={triggerRef}
        type="button"
        id={`${listboxId}-trigger`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`${ariaFilterPrefix} — ${triggerLabel}`}
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
          opacity: disabled ? 0.6 : 1,
          ...activeStyle,
        }}
      >
        {icon}
        {triggerLabel}
        {open ? <ChevronUp size={9} aria-hidden="true" /> : <ChevronDown size={9} aria-hidden="true" />}
      </button>

      {open && (
        <div id={listboxId} role="listbox" aria-multiselectable="true" aria-label={listboxAriaLabel} style={panelStyle}>
          {enableSearch ? (
            <BarraPesquisaFiltroPainel
              inputRef={searchInputRef}
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={searchPlaceholder}
            />
          ) : null}

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: 8,
                border: "none",
                background: `${SEMANTIC_RED}11`,
                color: SEMANTIC_RED,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: FONT.body,
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <X size={10} aria-hidden="true" /> Limpar seleção
            </button>
          )}

          {filtered.length === 0 && enableSearch && searchQuery.trim() ? (
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
            filtered.map((item) =>
              renderOptionRow(item.id, item.name, selected.includes(item.id), () => {
                if (selected.includes(item.id)) onChange(selected.filter((id) => id !== item.id));
                else onChange([...selected, item.id]);
              })
            )
          )}
        </div>
      )}
    </div>
  );
}
