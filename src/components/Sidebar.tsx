import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { MENU } from "../constants/menu";
import { BASE_COLORS, FONT } from "../constants/theme";

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
}

// Cor do ícone inativo — lilás neutro, subordinado ao texto
const ICON_COLOR_INACTIVE = "#c4b5d4";
// Cor do ícone ativo — branco puro, máximo contraste sobre gradiente
const ICON_COLOR_ACTIVE    = "#ffffff";

const LOGO_DEFAULT = "/Logo Spin Gaming White.png";

export default function Sidebar({ activePage, onNavigate }: Props) {
  const { theme: t, permissions, operadoraBrand } = useApp();
  const logoUrl = operadoraBrand?.logo_url || LOGO_DEFAULT;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Dashboards: true, Lives: true, "Operações": true, Plataforma: true,
  });

  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "10px",
    width: "100%", padding: "11px 14px", borderRadius: "12px", border: "none",
    cursor: "pointer", fontSize: "13px", fontWeight: 500, textAlign: "left",
    background: "transparent", color: "#e5dce1",
    fontFamily: "var(--brand-fontFamily, 'Inter', sans-serif)",
  };

  const sidebarBg = operadoraBrand?.cor_background ?? t.sidebar;

  return (
    <aside style={{
      width: "240px", height: "100vh", flexShrink: 0,
      position: "fixed", top: 0, left: 0,
      background: sidebarBg, display: "flex", flexDirection: "column",
      padding: "0px 16px 24px", borderRight: `1px solid ${t.sidebarBorder}`,
      boxSizing: "border-box", zIndex: 100,
    }}>
      {/* LOGO — operador vê logo da operadora; demais veem Spin Gaming. Regra: mantém dentro do esquadro */}
      <div style={{
        marginBottom: 16, paddingTop: 12, display: "flex", justifyContent: "center", alignItems: "center",
        flexShrink: 0, width: "100%", maxHeight: 64, overflow: "hidden",
      }}>
        <img
          src={logoUrl}
          alt={operadoraBrand ? "Operadora" : "Spin Gaming"}
          style={{
            maxWidth: "100%", maxHeight: 64, width: "auto", height: "auto",
            objectFit: "contain", display: "block",
          }}
          onError={(e) => { (e.target as HTMLImageElement).src = LOGO_DEFAULT; }}
        />
      </div>

      {/* NAV */}
      <nav style={{
        flex: 1, overflowY: "auto", display: "flex",
        flexDirection: "column", gap: "4px",
        paddingRight: "4px", minHeight: 0,
      }}>
        {MENU.map((sec) => {
          const itensFiltrados = sec.items.filter(
            (item) => permissions[item.key] === "sim" || permissions[item.key] === "proprios"
          );
          if (itensFiltrados.length === 0) return null;

          const isOpen    = openSections[sec.section] ?? true;
          const hasActive = itensFiltrados.some((i) => i.key === activePage);

          return (
            <div key={sec.section}>
              {/* Cabeçalho da seção */}
              <button
                onClick={() => setOpenSections((p) => ({ ...p, [sec.section]: !p[sec.section] }))}
                style={{
                  ...btnBase,
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  color: hasActive ? "white" : "#8888aa",
                  fontWeight: 700,
                  fontSize: "11px",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {/* Chevron Lucide — substitui o ">" de texto */}
                  <span style={{
                    display: "inline-flex",
                    transition: "transform 0.25s",
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    color: "#6b6b8a",
                  }}>
                    <ChevronRight size={12} />
                  </span>
                  {sec.section}
                </span>
              </button>

              {/* Itens da seção */}
              <div style={{
                overflow: "hidden",
                maxHeight: isOpen ? `${itensFiltrados.length * 52}px` : "0px",
                transition: "max-height 0.25s ease",
                display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "8px",
              }}>
                {itensFiltrados.map((item) => {
                  const active    = activePage === item.key;
                  const Icon      = item.icon;
                  const iconColor = active ? ICON_COLOR_ACTIVE : ICON_COLOR_INACTIVE;

                  return (
                    <button
                      key={item.key}
                      onClick={() => onNavigate(item.key)}
                      style={{
                        ...btnBase,
                        background: active
                          ? "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 80%, transparent), color-mix(in srgb, var(--brand-secondary) 80%, transparent))"
                          : "transparent",
                        color:     active ? "white" : "#e5dce1",
                        boxShadow: active ? "0 4px 16px color-mix(in srgb, var(--brand-primary) 27%, transparent)" : "none",
                      }}
                    >
                      <Icon size={15} color={iconColor} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
