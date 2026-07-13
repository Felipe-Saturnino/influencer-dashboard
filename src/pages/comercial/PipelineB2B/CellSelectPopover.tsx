import { useEffect, useMemo, useRef, useState } from "react";
import { FONT } from "../../../constants/theme";
import { BarraPesquisaFiltroPainel } from "../../../components/BarraPesquisaFiltroPainel";
import { textoContemBusca } from "../../../lib/searchText";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";

export function CellSelectPopover<T extends string>({
  open,
  anchorRect,
  options,
  value,
  onSelect,
  onClose,
  labelOption,
  isOptionDisabled,
  disabledOptionTitle,
  /** Ativa busca no painel. Default: automaticamente se `options.length > 5`. */
  enableSearch,
  searchPlaceholder,
  t,
}: {
  open: boolean;
  anchorRect: DOMRect | null;
  options: readonly T[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
  labelOption: (v: T) => string;
  isOptionDisabled?: (v: T) => boolean;
  disabledOptionTitle?: string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  t: { cardBg: string; cardBorder: string; text: string; textMuted?: string; inputBg?: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busca, setBusca] = useState("");
  const searchable = enableSearch ?? options.length > 5;

  useEffect(() => {
    if (!open) {
      setBusca("");
      return;
    }
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    if (!searchable || !busca.trim()) return options;
    return options.filter((opt) => textoContemBusca(labelOption(opt), busca));
  }, [options, busca, searchable, labelOption]);

  if (!open || !anchorRect) return null;

  const top = Math.min(anchorRect.bottom + 6, window.innerHeight - 280);
  const left = Math.min(anchorRect.left, window.innerWidth - 260);
  const placeholder = searchPlaceholder ?? placeholderPesquisaFiltro("opção");

  return (
    <>
      <div
        role="presentation"
        style={{ position: "fixed", inset: 0, zIndex: 900 }}
        onMouseDown={onClose}
      />
      <div
        ref={ref}
        style={{
          position: "fixed",
          zIndex: 901,
          top,
          left,
          minWidth: 220,
          maxWidth: 300,
          maxHeight: searchable ? 320 : 240,
          display: "flex",
          flexDirection: "column",
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          padding: 6,
        }}
      >
        {searchable ? (
          <div style={{ marginBottom: 6, flexShrink: 0 }} onMouseDown={(e) => e.stopPropagation()}>
            <BarraPesquisaFiltroPainel
              value={busca}
              onChange={setBusca}
              placeholder={placeholder}
              aria-label={placeholder}
            />
          </div>
        ) : null}
        <div
          role="listbox"
          aria-label="Opções"
          style={{ overflowY: "auto", flex: 1, minHeight: 0 }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                color: t.textMuted ?? t.text,
                fontSize: 13,
                fontFamily: FONT.body,
              }}
            >
              Nenhuma opção encontrada.
            </div>
          ) : (
            filtered.map((opt) => {
              const disabled = isOptionDisabled?.(opt) ?? false;
              return (
                <button
                  key={opt || "__none__"}
                  type="button"
                  role="option"
                  aria-selected={opt === value}
                  aria-disabled={disabled}
                  disabled={disabled}
                  title={disabled ? disabledOptionTitle : undefined}
                  onClick={() => {
                    if (disabled) return;
                    onSelect(opt);
                    onClose();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: 8,
                    background:
                      opt === value
                        ? "color-mix(in srgb, var(--brand-accent, #1e36f8) 12%, transparent)"
                        : "transparent",
                    color: disabled ? (t.textMuted ?? t.text) : t.text,
                    fontSize: 13,
                    fontFamily: FONT.body,
                    fontWeight: opt === value ? 700 : 500,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.55 : 1,
                  }}
                >
                  {labelOption(opt)}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
