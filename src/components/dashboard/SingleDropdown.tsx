import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { FONT } from "../../constants/theme";
import { BRAND } from "../../lib/dashboardConstants";

export interface SingleDropdownOption {
  value: string;
  label: string;
}

interface SingleDropdownTheme {
  cardBg: string;
  cardBorder: string;
  text: string;
}

interface Props {
  value: string;
  options: SingleDropdownOption[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  t: SingleDropdownTheme;
  accent?: string;
  ariaLabelPrefix?: string;
}

export function SingleDropdown({
  value,
  options,
  onChange,
  icon,
  t,
  accent,
  ariaLabelPrefix = "Modo de visualização",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const accentColor = accent ?? BRAND.roxoVivo;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${ariaLabelPrefix}: ${current?.label ?? value}`}
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          border: `1px solid ${accentColor}`,
          background: accentColor.startsWith("var(")
            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
            : `${accentColor}22`,
          color: accentColor,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT.body,
          cursor: "pointer",
          outline: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
          lineHeight: 1,
          minHeight: 44,
        }}
      >
        {icon && (
          <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>{icon}</span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center" }}>{current?.label}</span>
        {open ? (
          <ChevronUp size={9} style={{ opacity: 0.7 }} aria-hidden="true" />
        ) : (
          <ChevronDown size={9} style={{ opacity: 0.7 }} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 200,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 8,
            minWidth: 130,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                type="button"
                role="menuitem"
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: selected
                    ? accentColor.startsWith("var(")
                      ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                      : `${accentColor}22`
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
                  {selected ? <Check size={9} color="#fff" aria-hidden="true" /> : null}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
