import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, UsersRound } from "lucide-react";
import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import { useListboxKeyboardNavigation } from "../../hooks/useListboxKeyboardNavigation";
import { usePainelSelectPortal } from "../../hooks/usePainelSelectPortal";
import { estiloPainelPortalFixed } from "../../lib/selectPainelPortal";
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
  const closePanel = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, pos } = usePainelSelectPortal({
    open,
    onClose: closePanel,
    matchTriggerWidth: true,
  });
  const uid = useId();
  const listboxId = `${id}-${uid.replace(/:/g, "")}`;

  const allOptions = useMemo(() => {
    const seen = new Set<string>();
    const base: SelectOrganogramaMultiOption[] = [];
    for (const o of options) {
      const id = (o.id ?? "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      base.push({ id, label: o.label });
    }
    if (incluirTodosPrestadores) {
      return [{ id: PORTAL_RH_APLICAVEL_TODOS, label: PORTAL_RH_APLICAVEL_TODOS }, ...base];
    }
    return base;
  }, [options, incluirTodosPrestadores]);

  const enableSearch = true;

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
  const listboxKeyboard = useListboxKeyboardNavigation({
    items: filtered,
    onSelect: (option) => toggleOption(option.id),
    onEscape: closePanel,
  });

  const borderColor = hasError ? "#e84025" : t.cardBorder;

  const panelNode =
    open && pos ? (
      <div
        ref={panelRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        aria-multiselectable="true"
        style={estiloPainelPortalFixed(pos, { background: t.cardBg, border: t.cardBorder })}
      >
        {enableSearch ? (
          <div style={{ marginBottom: 8, flexShrink: 0 }}>
            <BarraPesquisaFiltroPainel
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={placeholderPesquisaFiltro("Organograma")}
              aria-activedescendant={
                filtered[listboxKeyboard.activeIndex]
                  ? `${listboxId}-option-${listboxKeyboard.activeIndex}`
                  : undefined
              }
              onKeyDown={listboxKeyboard.onKeyDown}
            />
          </div>
        ) : null}
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {filtered.map((opt, index) => {
            const selected = value.includes(opt.id);
            const active = index === listboxKeyboard.activeIndex;
            return (
              <div
                key={opt.id}
                id={`${listboxId}-option-${index}`}
                ref={(node) => {
                  listboxKeyboard.optionRefs.current[index] = node;
                }}
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onMouseEnter={() => listboxKeyboard.setActiveIndex(index)}
                onClick={() => toggleOption(opt.id)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: selected || active
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
      </div>
    ) : null;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        ref={triggerRef}
        type="button"
        id={`${listboxId}-trigger`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`${ariaLabel} — ${triggerLabel}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            return;
          }
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          setOpen(true);
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: "10px 12px",
          minHeight: 44,
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
        <UsersRound size={15} aria-hidden style={{ flexShrink: 0, opacity: 0.85, marginTop: 1 }} />
        <span
          title={triggerLabel}
          style={{
            flex: 1,
            minWidth: 0,
            lineHeight: 1.35,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            whiteSpace: "normal",
            wordBreak: "break-word",
          }}
        >
          {triggerLabel}
        </span>
        <ChevronDown size={14} aria-hidden style={{ flexShrink: 0, opacity: 0.6, marginTop: 2 }} />
      </button>
      {panelNode ? createPortal(panelNode, document.body) : null}
    </div>
  );
}
