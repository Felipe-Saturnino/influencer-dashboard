import { useState, useEffect, useRef, useLayoutEffect, useMemo, useId, useCallback, type CSSProperties } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { FilterBarIcons } from "../lib/filterBarIconCatalog";
import { FONT } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import {
  FILTRO_BAR_PILL_GAP,
  FILTRO_BAR_PILL_PADDING,
  getFiltroBarPillStateStyle,
} from "../lib/filterBarStyles";
import { FILTER_SEARCH_AFILIADO } from "../lib/searchBarConstants";
import { textoContemBusca } from "../lib/searchText";
import { BarraPesquisaFiltroPainel } from "./BarraPesquisaFiltroPainel";

/** Valor canónico da opção agregadora (todos no escopo). */
export const AFILIADO_FILTRO_TODOS_VALUE = "todos";

/** Rótulo visível quando nenhum afiliado específico está selecionado (single ou multi). */
export const AFILIADO_FILTRO_TODOS_LABEL = "Todos Afiliados";

/** Nome do controlo para `aria-label` (distinto do rótulo da opção agregadora). */
export const AFILIADO_FILTRO_ARIA_LABEL = "Afiliados";

const SEMANTIC_RED = "#e84025";
const ARIA_FILTER_PREFIX = "Filtrar por afiliado";

export type AfiliadoFiltroOption = { id: string; name: string };

type BaseProps = {
  afiliados: readonly AfiliadoFiltroOption[];
  disabled?: boolean;
};

export type FiltroAfiliadoSelectSingleProps = BaseProps & {
  mode: "single";
  value: string;
  onChange: (value: string) => void;
};

export type FiltroAfiliadoSelectMultipleProps = BaseProps & {
  mode: "multiple";
  value: string[];
  onChange: (value: string[]) => void;
};

export type FiltroAfiliadoSelectProps =
  | FiltroAfiliadoSelectSingleProps
  | FiltroAfiliadoSelectMultipleProps;

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

function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, onClose]);
}

function useActiveFilterStyle(isActive: boolean) {
  const brand = useDashboardBrand();
  const { theme: t } = useApp();
  return getFiltroBarPillStateStyle(t, brand, isActive);
}

function FiltroPainelSearchFocus({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <BarraPesquisaFiltroPainel
      inputRef={inputRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

/**
 * Filtro de afiliados padronizado: pill 999, ícone Users 15px, agregadora "Todos Afiliados",
 * pesquisa no painel quando há mais de 5 opções. Modos `single` e `multiple` — regras de negócio na página.
 */
export function FiltroAfiliadoSelect(props: FiltroAfiliadoSelectProps) {
  const { afiliados, disabled = false } = props;
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const accentColor = brand.useBrand ? "var(--brand-action, #7c3aed)" : brand.accent;
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const listboxId = `filtro-afiliado-${uid.replace(/:/g, "")}`;

  const enableSearch = afiliados.length > 5;
  const dropdownMinWidth = enableSearch ? 240 : 190;
  const alignRight = useDropdownAlign(open, triggerRef, dropdownMinWidth);

  const closePanel = useCallback(() => setOpen(false), []);
  useClickOutside(ref, closePanel);

  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [...afiliados];
    return afiliados.filter((inf) => textoContemBusca(inf.name, searchQuery));
  }, [afiliados, searchQuery]);

  const isSingle = props.mode === "single";
  const isActive = isSingle
    ? props.value !== AFILIADO_FILTRO_TODOS_VALUE
    : props.value.length > 0;

  const triggerLabel = useMemo(() => {
    if (isSingle) {
      if (props.value === AFILIADO_FILTRO_TODOS_VALUE) return AFILIADO_FILTRO_TODOS_LABEL;
      return afiliados.find((i) => i.id === props.value)?.name ?? AFILIADO_FILTRO_TODOS_LABEL;
    }
    if (props.value.length === 0) return AFILIADO_FILTRO_TODOS_LABEL;
    if (props.value.length === 1) {
      return afiliados.find((i) => i.id === props.value[0])?.name ?? AFILIADO_FILTRO_TODOS_LABEL;
    }
    return `${props.value.length} selecionados`;
  }, [isSingle, props, afiliados]);

  const activeStyle = useActiveFilterStyle(isActive);

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

  function renderOptionRow(
    key: string,
    label: string,
    selected: boolean,
    onPick: () => void,
    variant: "radio" | "checkbox"
  ) {
    return (
      <div
        key={key}
        role="option"
        aria-selected={selected}
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
          background: selected
            ? "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
            : "transparent",
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
            borderRadius: variant === "radio" ? "50%" : 3,
            flexShrink: 0,
            border: `1.5px solid ${selected ? accentColor : t.cardBorder}`,
            background: selected ? accentColor : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? <Check size={9} color="#fff" strokeWidth={3} aria-hidden /> : null}
        </span>
        {label}
      </div>
    );
  }

  const listboxLabel = isSingle ? "Selecionar afiliado" : "Selecionar afiliados";

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
        aria-label={`${ARIA_FILTER_PREFIX} — ${triggerLabel}`}
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
        {FilterBarIcons.afiliado}
        {triggerLabel}
        {open ? <ChevronUp size={9} aria-hidden="true" /> : <ChevronDown size={9} aria-hidden="true" />}
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable={!isSingle}
          aria-label={listboxLabel}
          style={panelStyle}
        >
          {enableSearch ? (
            <FiltroPainelSearchFocus
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={FILTER_SEARCH_AFILIADO}
            />
          ) : null}

          {!isSingle && props.value.length > 0 && (
            <button
              type="button"
              onClick={() => props.onChange([])}
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

          {isSingle ? (
            <>
              {renderOptionRow(
                AFILIADO_FILTRO_TODOS_VALUE,
                AFILIADO_FILTRO_TODOS_LABEL,
                props.value === AFILIADO_FILTRO_TODOS_VALUE,
                () => {
                  props.onChange(AFILIADO_FILTRO_TODOS_VALUE);
                  setOpen(false);
                },
                "radio"
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
                filtered.map((inf) =>
                  renderOptionRow(
                    inf.id,
                    inf.name,
                    props.value === inf.id,
                    () => {
                      props.onChange(inf.id);
                      setOpen(false);
                    },
                    "radio"
                  )
                )
              )}
            </>
          ) : (
            <>
              {renderOptionRow(
                "__todos__",
                AFILIADO_FILTRO_TODOS_LABEL,
                props.value.length === 0,
                () => props.onChange([]),
                "checkbox"
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
                filtered.map((inf) =>
                  renderOptionRow(
                    inf.id,
                    inf.name,
                    props.value.includes(inf.id),
                    () => {
                      const sel = props.value;
                      if (sel.includes(inf.id)) props.onChange(sel.filter((id) => id !== inf.id));
                      else props.onChange([...sel, inf.id]);
                    },
                    "checkbox"
                  )
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
