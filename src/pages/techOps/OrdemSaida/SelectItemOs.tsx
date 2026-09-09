import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Package } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { BarraPesquisaFiltroPainel } from "../../../components/BarraPesquisaFiltroPainel";
import { useListboxKeyboardNavigation } from "../../../hooks/useListboxKeyboardNavigation";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";
import { textoContemBusca } from "../../../lib/searchText";
import type { OsItemDisponivel } from "../../../lib/techOpsOrdemSaida";
import { getOsInputStyle } from "./ordemSaidaUi";

type Opt = { key: string; label: string; grupo: "Itens" | "Equipamentos" | "Jogo" };

function entidadeKeyOf(it: OsItemDisponivel): string {
  return `${it.entidade_tipo}:${it.entidade_id}`;
}

function catalogoParaOpcoes(catalogo: OsItemDisponivel[]): Opt[] {
  const out: Opt[] = [];
  for (const c of catalogo) {
    if (c.entidade_tipo === "item") out.push({ key: entidadeKeyOf(c), label: c.label, grupo: "Itens" });
    else if (c.entidade_tipo === "equipamento")
      out.push({ key: entidadeKeyOf(c), label: c.label, grupo: "Equipamentos" });
    else out.push({ key: entidadeKeyOf(c), label: c.label, grupo: "Jogo" });
  }
  return out;
}

/**
 * Seletor único de item/equipamento/lote da OS — painel com busca e altura limitada
 * (substitui `<select>` nativo que estoura a tela com dezenas de EQP).
 */
export function SelectItemOs({
  value,
  onChange,
  catalogo,
  disabled = false,
  id,
}: {
  value: string;
  onChange: (entidadeKey: string) => void;
  catalogo: OsItemDisponivel[];
  disabled?: boolean;
  id?: string;
}) {
  const { theme: t } = useApp();
  const inputStyle = getOsInputStyle(t);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const listboxId = `os-item-${(id ?? uid).replace(/:/g, "")}`;

  const options = useMemo(() => catalogoParaOpcoes(catalogo), [catalogo]);
  const enableSearch = true;

  const selected = options.find((o) => o.key === value) ?? null;
  const triggerLabel = selected?.label ?? "Selecione…";

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return options;
    return options.filter((o) => textoContemBusca(o.label, searchQuery));
  }, [options, searchQuery]);

  const groups = useMemo(() => {
    const order: Opt["grupo"][] = ["Itens", "Equipamentos", "Jogo"];
    return order
      .map((g) => ({ grupo: g, items: filtered.filter((o) => o.grupo === g) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

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

  const listboxKeyboard = useListboxKeyboardNavigation({
    items: filtered,
    onSelect: (opt) => {
      onChange(opt.key);
      setOpen(false);
    },
    onEscape: () => setOpen(false),
  });

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", minWidth: 0 }}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Item da ordem — ${triggerLabel}`}
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
          ...inputStyle,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          opacity: disabled ? 0.65 : 1,
        }}
      >
        <Package size={15} aria-hidden style={{ flexShrink: 0, opacity: 0.75 }} />
        <span
          title={triggerLabel}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: selected ? t.text : t.textMuted,
            fontFamily: FONT.body,
            fontSize: 13,
          }}
        >
          {triggerLabel}
        </span>
        <ChevronDown size={14} aria-hidden style={{ flexShrink: 0, opacity: 0.55 }} />
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 400,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            maxHeight: "min(280px, 42vh)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxSizing: "border-box",
          }}
        >
          {enableSearch ? (
            <BarraPesquisaFiltroPainel
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={placeholderPesquisaFiltro("Item")}
              aria-label="Pesquisar item da ordem"
              aria-activedescendant={
                filtered[listboxKeyboard.activeIndex]
                  ? `${listboxId}-option-${listboxKeyboard.activeIndex}`
                  : undefined
              }
              onKeyDown={listboxKeyboard.onKeyDown}
            />
          ) : null}
          <div
            id={listboxId}
            role="listbox"
            aria-label="Itens da ordem"
            style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: 2 }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 8px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                Nenhum item encontrado.
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.grupo} style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      padding: "6px 8px 4px",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: t.textMuted,
                      fontFamily: FONT.body,
                    }}
                  >
                    {g.grupo}
                  </div>
                  {g.items.map((opt) => {
                    const flatIdx = filtered.findIndex((o) => o.key === opt.key);
                    const active = flatIdx === listboxKeyboard.activeIndex;
                    const selectedOpt = opt.key === value;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        id={`${listboxId}-option-${flatIdx}`}
                        ref={(node) => {
                          listboxKeyboard.optionRefs.current[flatIdx] = node;
                        }}
                        role="option"
                        aria-selected={selectedOpt}
                        tabIndex={-1}
                        onMouseEnter={() => listboxKeyboard.setActiveIndex(flatIdx)}
                        onClick={() => {
                          onChange(opt.key);
                          setOpen(false);
                        }}
                        style={{
                          width: "100%",
                          display: "block",
                          textAlign: "left",
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "none",
                          background:
                            active || selectedOpt
                              ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 14%, transparent)"
                              : "transparent",
                          color: t.text,
                          fontSize: 12,
                          fontFamily: FONT.body,
                          cursor: "pointer",
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {opt.label}
                      </button>
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
