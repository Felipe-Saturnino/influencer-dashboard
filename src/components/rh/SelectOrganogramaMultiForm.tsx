import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, ChevronDown, UsersRound } from "lucide-react";
import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import { placeholderPesquisaFiltro } from "../../lib/searchBarConstants";
import { textoContemBusca } from "../../lib/searchText";
import { BarraPesquisaFiltroPainel } from "../BarraPesquisaFiltroPainel";
import { PORTAL_RH_APLICAVEL_TODOS } from "../../lib/portalRhDocumentoNormativo";

export type SelectOrganogramaMultiOption = { id: string; label: string };

type Props = {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: readonly SelectOrganogramaMultiOption[];
  disabled?: boolean;
  style?: CSSProperties;
  hasError?: boolean;
  ariaLabel?: string;
  incluirTodosPrestadores?: boolean;
};

/**
 * Multi-select em painel dropdown (padrão Influencer) para formulários — não usar na barra de filtros.
 */
export function SelectOrganogramaMultiForm({
  id,
  value,
  onChange,
  options,
  disabled = false,
  style,
  hasError = false,
  ariaLabel = "Aplicável a",
  incluirTodosPrestadores = true,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const accentColor = brand.useBrand ? "var(--brand-action, #7c3aed)" : brand.accent;
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const listboxId = `${id}-${uid.replace(/:/g, "")}`;

  const allOptions = useMemo(() => {
    const base = [...options];
    if (incluirTodosPrestadores) {
      return [{ id: PORTAL_RH_APLICAVEL_TODOS, label: PORTAL_RH_APLICAVEL_TODOS }, ...base];
    }
    return base;
  }, [options, incluirTodosPrestadores]);

  const enableSearch = allOptions.length > 5;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allOptions;
    return allOptions.filter((o) => textoContemBusca(o.label, searchQuery));
  }, [allOptions, searchQuery]);

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return incluirTodosPrestadores ? PORTAL_RH_APLICAVEL_TODOS : "Selecione…";
    if (value.length === 1) {
      return allOptions.find((o) => o.id === value[0])?.label ?? value[0];
    }
    return `${value.length} selecionados`;
  }, [value, allOptions, incluirTodosPrestadores]);

  const toggleOption = useCallback(
    (optionId: string) => {
      if (optionId === PORTAL_RH_APLICAVEL_TODOS) {
        onChange(value.includes(PORTAL_RH_APLICAVEL_TODOS) ? [] : [PORTAL_RH_APLICAVEL_TODOS]);
        return;
      }
      const semTodos = value.filter((x) => x !== PORTAL_RH_APLICAVEL_TODOS);
      const next = semTodos.includes(optionId) ? semTodos.filter((x) => x !== optionId) : [...semTodos, optionId];
      onChange(next);
    },
    [onChange, value],
  );

  const borderColor = hasError ? "#e84025" : t.cardBorder;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        id={`${listboxId}-trigger`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`${ariaLabel} — ${triggerLabel}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${borderColor}`,
          background: t.inputBg,
          color: t.text,
          fontSize: 13,
          fontFamily: FONT.body,
          cursor: disabled ? "not-allowed" : "pointer",
          boxSizing: "border-box",
          textAlign: "left",
          ...style,
        }}
      >
        <UsersRound size={15} aria-hidden style={{ flexShrink: 0, opacity: 0.85 }} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {triggerLabel}
        </span>
        <ChevronDown size={14} aria-hidden style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          aria-multiselectable="true"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 200,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            maxHeight: enableSearch ? "min(320px, 55vh)" : 240,
            overflowY: "auto",
          }}
        >
          {enableSearch ? (
            <div style={{ marginBottom: 8 }}>
              <BarraPesquisaFiltroPainel
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={placeholderPesquisaFiltro("Organograma")}
              />
            </div>
          ) : null}
          {filtered.map((opt) => {
            const selected = value.includes(opt.id);
            return (
              <div
                key={opt.id}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => toggleOption(opt.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleOption(opt.id);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: selected
                    ? "color-mix(in srgb, var(--brand-accent, #1e36f8) 12%, transparent)"
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
                    borderRadius: 3,
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
                {opt.label}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
