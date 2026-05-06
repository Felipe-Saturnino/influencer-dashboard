import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import { Check, ChevronDown, ChevronUp, User, X } from "lucide-react";
import { FONT, type Theme } from "../constants/theme";

const BRAND_PRIMARY = "var(--brand-primary, #7c3aed)";
const SEMANTIC_RED = "#e94025";

interface InfluencerMultiSelectProps {
  selected: string[];
  onChange: (v: string[]) => void;
  influencers: { id: string; name: string }[];
  t: Theme;
  /** Rótulo do trigger quando nada está selecionado (padrão: "Influencers"). */
  triggerEmptyLabel?: string;
  /** `aria-label` do botão (padrão: "Filtrar por influencer — …"). */
  ariaFilterPrefix?: string;
  /** `aria-label` do listbox (padrão: "Selecionar influencers"). */
  listboxAriaLabel?: string;
  /** Campo de pesquisa no topo do dropdown (filtra por nome, correspondência parcial). */
  enableSearch?: boolean;
  searchPlaceholder?: string;
}

export default function InfluencerMultiSelect({
  selected,
  onChange,
  influencers,
  t,
  triggerEmptyLabel = "Influencers",
  ariaFilterPrefix = "Filtrar por influencer",
  listboxAriaLabel = "Selecionar influencers",
  enableSearch = false,
  searchPlaceholder = "Pesquisar…",
}: InfluencerMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useRef(`inf-multiselect-${Math.random().toString(36).slice(2, 9)}`).current;

  const filteredInfluencers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return influencers;
    return influencers.filter((inf) => inf.name.toLowerCase().includes(q));
  }, [influencers, searchQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const margin = 16;
    const dropdownMinW = enableSearch ? 240 : 190;
    const spaceRight = window.innerWidth - r.right;
    setAlignRight(spaceRight < margin && r.left > dropdownMinW);
  }, [open, enableSearch]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }
    if (enableSearch) {
      const t = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open, enableSearch]);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((n) => n !== id));
    else onChange([...selected, id]);
  }

  const active = selected.length > 0;
  const label =
    selected.length === 0
      ? triggerEmptyLabel
      : selected.length === 1
        ? (influencers.find((i) => i.id === selected[0])?.name ?? triggerEmptyLabel)
        : `${selected.length} selecionados`;

  const dropdownMinWidth = enableSearch ? 240 : 190;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        id={`${listboxId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`${ariaFilterPrefix} — ${label}`}
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 14px",
          borderRadius: "20px",
          border: `1.5px solid ${active ? BRAND_PRIMARY : t.cardBorder}`,
          background: active
            ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 13%, transparent)"
            : t.inputBg,
          color: active ? BRAND_PRIMARY : t.textMuted,
          fontSize: "12px",
          fontWeight: 600,
          fontFamily: FONT.body,
          cursor: "pointer",
          outline: "none",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap" as const,
        }}
      >
        <User size={13} strokeWidth={2} aria-hidden />
        {label}
        {open ? <ChevronUp size={9} aria-hidden /> : <ChevronDown size={9} aria-hidden />}
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={listboxAriaLabel}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: alignRight ? "auto" : 0,
            right: alignRight ? 0 : "auto",
            zIndex: 200,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: "12px",
            padding: "8px",
            minWidth: `${dropdownMinWidth}px`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            maxHeight: enableSearch ? "min(320px, 55vh)" : "240px",
            overflowY: "auto",
          }}
        >
          {enableSearch ? (
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Pesquisar na lista"
              autoComplete="off"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 8,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.text,
                fontSize: 12,
                fontFamily: FONT.body,
                outline: "none",
              }}
            />
          ) : null}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: "8px",
                border: "none",
                background: `${SEMANTIC_RED}11`,
                color: SEMANTIC_RED,
                fontSize: "11px",
                fontWeight: 600,
                fontFamily: FONT.body,
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <X size={10} aria-hidden /> Limpar seleção
            </button>
          )}
          {filteredInfluencers.length === 0 ? (
            enableSearch && searchQuery.trim() ? (
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
            ) : null
          ) : (
            filteredInfluencers.map((inf) => {
              const checked = selected.includes(inf.id);
              return (
                <div
                  key={inf.id}
                  role="option"
                  aria-selected={checked}
                  tabIndex={0}
                  onClick={() => toggle(inf.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(inf.id);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    background: checked
                      ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 13%, transparent)"
                      : "transparent",
                    color: checked ? BRAND_PRIMARY : t.text,
                    fontSize: "12px",
                    fontFamily: FONT.body,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: checked ? 700 : 400,
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "3px",
                      flexShrink: 0,
                      border: `1.5px solid ${checked ? BRAND_PRIMARY : t.cardBorder}`,
                      background: checked ? BRAND_PRIMARY : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {checked ? <Check size={9} color="#fff" strokeWidth={3} aria-hidden /> : null}
                  </span>
                  {inf.name}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
