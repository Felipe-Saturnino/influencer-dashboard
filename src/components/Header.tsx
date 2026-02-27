import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { MENU } from "../constants/menu";
import { BASE_COLORS, FONT } from "../constants/theme";

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout:   () => void;
}

function getSectionForPage(pageKey: string): string | null {
  for (const sec of MENU) {
    if (sec.items.some(i => i.key === pageKey)) return sec.section.toUpperCase();
  }
  return null;
}

export default function Header({ activePage, onNavigate, onLogout }: Props) {
  const { theme: t, user } = useApp();
  const [open,   setOpen]   = useState(false);
  const [hover,  setHover]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  const section = getSectionForPage(activePage);

  return (
    <header style={{
      background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}`,
      padding: "0 32px", height: "60px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      {/* Seção da página */}
      <span style={{
        color: t.headerText, fontWeight: 800, fontSize: "15px",
        letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.title,
      }}>
        {section ?? ""}
      </span>

      {/* Avatar + Dropdown */}
      <div ref={ref} style={{ position: "relative" }}>
        <div
          onClick={() => setOpen(o => !o)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            cursor: "pointer", padding: "6px 10px", borderRadius: "12px",
            background: open || hover ? `${BASE_COLORS.purple}14` : "transparent",
            transition: "background 0.15s",
            boxShadow: open || hover ? `0 0 0 1px ${BASE_COLORS.purple}22` : "none",
          }}
        >
          <p style={{
            margin: 0, fontSize: "13px", fontWeight: 600,
            color: t.headerText, fontFamily: FONT.body,
          }}>
            {user.name}
          </p>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: "14px", fontWeight: 700,
          }}>
            {user.name[0]}
          </div>
        </div>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            minWidth: "180px", zIndex: 200, overflow: "hidden",
          }}>
            {[
              { icon: "⚙️", label: "Configurações", key: "configuracoes" },
              { icon: "❓", label: "Ajuda",          key: "ajuda"         },
            ].map(item => (
              <button key={item.key}
                onClick={() => { onNavigate(item.key); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  width: "100%", padding: "12px 16px", border: "none",
                  background: "transparent", cursor: "pointer",
                  fontSize: "13px", fontWeight: 500,
                  color: t.text, fontFamily: FONT.body, textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = t.inputBg)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {item.icon} {item.label}
              </button>
            ))}

            <div style={{ height: "1px", background: t.divider, margin: "4px 0" }} />

            <button
              onClick={() => { onLogout(); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                width: "100%", padding: "12px 16px", border: "none",
                background: "transparent", cursor: "pointer",
                fontSize: "13px", fontWeight: 600,
                color: BASE_COLORS.red, fontFamily: FONT.body, textAlign: "left",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = `${BASE_COLORS.red}10`)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              🚪 Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
