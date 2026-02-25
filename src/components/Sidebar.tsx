import { useState } from "react";
import { useApp } from "../context/AppContext";
import { MENU_ADMIN, MENU_INFLUENCER } from "../constants/menu";
import { BASE_COLORS, FONT } from "../constants/theme";
import { PageKey, User } from "../types";
import { useT } from "../hooks/useT";

interface Props {
  activePage: PageKey | "configuracoes" | "ajuda";
  onNavigate: (page: any) => void;
  onLogout:   () => void;
  user:       User;
}

export default function Sidebar({ activePage, onNavigate, onLogout, user }: Props) {
  const { theme: t } = useApp();
  const T = useT();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Dashboards: true, Lives: true, "Operações": true,
  });

  const rawSections = user.role === "admin" ? MENU_ADMIN : MENU_INFLUENCER;

  const sections = rawSections.map(sec => ({
    ...sec,
    section: T.sidebar.sections[sec.section as keyof typeof T.sidebar.sections] ?? sec.section,
    items: sec.items.map(item => ({
      ...item,
      label: T.menu[item.key as keyof typeof T.menu] ?? item.label,
    })),
  }));

  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "10px",
    width: "100%", padding: "11px 14px", borderRadius: "12px", border: "none",
    cursor: "pointer", fontSize: "13px", fontWeight: 500, textAlign: "left",
    background: "transparent", color: "#e5dce1", fontFamily: FONT.body,
  };

  return (
    <aside style={{
      width: "240px", height: "100vh", flexShrink: 0, position: "sticky", top: 0,
      background: t.sidebar, display: "flex", flexDirection: "column", justifyContent: "flex-start",
      padding: "0px 16px 24px", borderRight: `1px solid ${t.sidebarBorder}`,
      boxSizing: "border-box",
    }}>
      {/* LOGO */}
      <div style={{ marginBottom: "4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
        <img
          src="/Logo Spin Gaming White.png"
          alt="Spin Gaming"
          style={{ height: "96px", objectFit: "contain", display: "block" }}
        />
      </div>

      {/* NAV */}
      <nav style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }}>
        {sections.map((sec, idx) => {
          const originalKey = (user.role === "admin" ? MENU_ADMIN : MENU_INFLUENCER)[idx].section;
          const isOpen    = openSections[originalKey];
          const hasActive = sec.items.some(i => i.key === activePage);
          return (
            <div key={originalKey}>
              <button
                onClick={() => setOpenSections(p => ({ ...p, [originalKey]: !p[originalKey] }))}
                style={{ ...btnBase, justifyContent: "space-between", padding: "10px 14px", color: hasActive ? "white" : "#8888aa", fontWeight: 700, fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", display: "inline-block", transition: "transform 0.25s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", color: "#6b6b8a" }}>▶</span>
                  {sec.section}
                </span>
              </button>

              <div style={{ overflow: "hidden", maxHeight: isOpen ? `${sec.items.length * 52}px` : "0px", transition: "max-height 0.25s ease", display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "8px" }}>
                {sec.items.map(item => {
                  const active = activePage === item.key;
                  return (
                    <button key={item.key} onClick={() => onNavigate(item.key)}
                      style={{ ...btnBase, background: active ? `linear-gradient(135deg, ${BASE_COLORS.purple}cc, ${BASE_COLORS.blue}cc)` : "transparent", color: active ? "white" : "#e5dce1", boxShadow: active ? `0 4px 16px ${BASE_COLORS.purple}44` : "none" }}>
                      <span style={{ fontSize: "15px" }}>{item.icon}</span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* RODAPÉ — sem nome/email (exibidos no Header) */}
      <div style={{ borderTop: "2px solid #3a3a5c", paddingTop: "14px", marginTop: "16px", flexShrink: 0 }}>
        <button onClick={() => onNavigate("configuracoes")}
          style={{ ...btnBase, padding: "7px 14px", background: activePage === "configuracoes" ? `${BASE_COLORS.purple}44` : "transparent" }}>
          ⚙️ {T.sidebar.settings}
        </button>
        <button onClick={() => onNavigate("ajuda")}
          style={{ ...btnBase, padding: "7px 14px", background: activePage === "ajuda" ? `${BASE_COLORS.purple}44` : "transparent" }}>
          ❓ {T.sidebar.help}
        </button>
        <button onClick={onLogout} style={{ ...btnBase, padding: "7px 14px" }}>
          🚪 {T.sidebar.logout}
        </button>
      </div>
    </aside>
  );
}
