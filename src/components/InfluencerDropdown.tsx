import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { FONT } from "../constants/theme";
import { ChevronDown, Check } from "lucide-react";
import { GiStarMedal } from "react-icons/gi";

const BRAND_VERMELHO = "#e84025";
const BRAND_AZUL = "#1e36f8";

export interface InfluencerDropdownItem {
  id: string;
  name: string;
}

export function InfluencerDropdown({
  items,
  selected,
  onChange,
  accent,
}: {
  items: InfluencerDropdownItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  accent?: string;
}) {
  const { theme: t, isDark } = useApp();
  const accentColor = accent ?? BRAND_AZUL;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  const label =
    selected.length === 0
      ? "Todos os influencers"
      : selected.length === 1
        ? (items.find((i) => i.id === selected[0])?.name ?? "1 selecionado")
        : `${selected.length} selecionados`;

  const isActive = selected.length > 0;

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 210 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filtrar por influencer — ${label}`}
        style={{
          width: "100%",
          padding: "7px 14px",
          borderRadius: 999,
          border: `1px solid ${isActive ? accentColor : t.cardBorder}`,
          background: isActive
            ? accentColor.startsWith("var(")
              ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
              : `${accentColor}18`
            : (t.inputBg ?? t.cardBg),
          color: isActive ? accentColor : t.textMuted,
          fontSize: 13,
          fontWeight: isActive ? 700 : 400,
          cursor: "pointer",
          fontFamily: FONT.body,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          transition: "all 0.15s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <GiStarMedal size={13} aria-hidden="true" />
          {label}
        </span>
        <ChevronDown
          size={9}
          style={{
            opacity: 0.7,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 230,
            background: t.cardBg,
            border: `1.5px solid ${t.cardBorder}`,
            borderRadius: 14,
            boxShadow: isDark ? "0 12px 32px rgba(0,0,0,0.6)" : "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 14px 8px",
              borderBottom: `1px solid ${t.cardBorder}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                fontFamily: FONT.body,
              }}
            >
              Influencer
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  fontSize: 10,
                  color: BRAND_VERMELHO,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: FONT.body,
                }}
              >
                Limpar
              </button>
            )}
          </div>
          <div
            role="listbox"
            aria-multiselectable="true"
            aria-label="Selecionar influencers"
            style={{ maxHeight: 220, overflowY: "auto", padding: "6px 0" }}
          >
            {items.map((inf) => {
              const ativo = selected.includes(inf.id);
              return (
                <div
                  key={inf.id}
                  role="option"
                  aria-selected={ativo}
                  onClick={() => toggle(inf.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 14px",
                    cursor: "pointer",
                    background: ativo
                      ? accentColor.startsWith("var(")
                        ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                        : `${accentColor}18`
                      : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      flexShrink: 0,
                      border: `2px solid ${ativo ? accentColor : t.cardBorder}`,
                      background: ativo ? accentColor : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {ativo && <Check size={9} color="#fff" aria-hidden="true" strokeWidth={3} />}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: FONT.body,
                      color: ativo ? t.text : t.textMuted,
                      fontWeight: ativo ? 600 : 400,
                    }}
                  >
                    {inf.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
