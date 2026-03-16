import { useState, useEffect, useRef } from "react";
import { BASE_COLORS, FONT, type Theme } from "../constants/theme";

interface InfluencerMultiSelectProps {
  selected: string[];
  onChange: (v: string[]) => void;
  influencers: { id: string; name: string }[];
  t: Theme;
}

export default function InfluencerMultiSelect({ selected, onChange, influencers, t }: InfluencerMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter(n => n !== id));
    else onChange([...selected, id]);
  }

  const active = selected.length > 0;
  const label = selected.length === 0
    ? "Influencers"
    : selected.length === 1
      ? (influencers.find(i => i.id === selected[0])?.name ?? "Influencers")
      : `${selected.length} selecionados`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 14px", borderRadius: "20px",
          border: `1.5px solid ${active ? BASE_COLORS.purple : t.cardBorder}`,
          background: active ? `${BASE_COLORS.purple}22` : t.inputBg,
          color: active ? BASE_COLORS.purple : t.textMuted,
          fontSize: "12px", fontWeight: 600, fontFamily: FONT.body,
          cursor: "pointer", outline: "none",
          display: "flex", alignItems: "center", gap: "6px",
          whiteSpace: "nowrap" as const,
        }}
      >
        👥 {label}
        <span style={{ fontSize: "9px", opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: "12px", padding: "8px", minWidth: "190px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          maxHeight: "240px", overflowY: "auto",
        }}>
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              style={{
                width: "100%", padding: "7px 12px", borderRadius: "8px",
                border: "none", background: `${BASE_COLORS.red}11`,
                color: BASE_COLORS.red, fontSize: "11px", fontWeight: 600,
                fontFamily: FONT.body, cursor: "pointer", textAlign: "left",
                marginBottom: "4px",
              }}
            >
              ✕ Limpar seleção
            </button>
          )}
          {influencers.map(inf => {
            const checked = selected.includes(inf.id);
            return (
              <button
                key={inf.id}
                onClick={() => toggle(inf.id)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: "8px",
                  border: "none",
                  background: checked ? `${BASE_COLORS.purple}22` : "transparent",
                  color: checked ? BASE_COLORS.purple : t.text,
                  fontSize: "12px", fontFamily: FONT.body,
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "8px",
                  fontWeight: checked ? 700 : 400,
                }}
              >
                <span style={{
                  width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                  border: `1.5px solid ${checked ? BASE_COLORS.purple : t.cardBorder}`,
                  background: checked ? BASE_COLORS.purple : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "9px", color: "#fff",
                }}>
                  {checked ? "✓" : ""}
                </span>
                {inf.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
