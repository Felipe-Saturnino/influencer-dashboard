import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { MENU } from "../constants/menu";
import { usePendenciasCount } from "../hooks/usePendenciasCount";

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
  isDrawer?: boolean;
  drawerOpen?: boolean;
}

const ICON_COLOR_INACTIVE = "#c4b5d4";
const ICON_COLOR_ACTIVE = "#ffffff";

const LOGO_DEFAULT = "/Logo Spin Gaming White.png";

const DEFAULT_OPEN: Record<string, boolean> = {
  Dashboards: true,
  Lives: true,
  Aquisição: true,
  Marketing: true,
  Estúdio: true,
  RH: true,
  Conteúdo: true,
  Plataforma: true,
};

function storageKey(userId: string) {
  return `sidebar_sections_${userId}`;
}

export default function Sidebar({ activePage, onNavigate, isDrawer = false, drawerOpen = false }: Props) {
  const { theme: t, permissions, operadoraBrand, user } = useApp();
  const pendGestor = usePendenciasCount("gestor");
  const pendOperadora = usePendenciasCount("operadora");
  const badgeCentral =
    user?.role === "operador"
      ? pendOperadora
      : user?.role === "gestor" ||
          user?.role === "prestador" ||
          user?.role === "admin" ||
          user?.role === "executivo"
        ? pendGestor
        : 0;
  const logoUrl = operadoraBrand?.logo_url || LOGO_DEFAULT;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(DEFAULT_OPEN);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    try {
      const raw = localStorage.getItem(storageKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        if (parsed && typeof parsed === "object") {
          const normalized: Record<string, boolean> = { ...parsed };
          let migrated = false;
          if ("Operações" in normalized && !("Estúdio" in normalized)) {
            normalized["Estúdio"] = normalized["Operações"];
            delete normalized["Operações"];
            migrated = true;
          }
          if ("Financeiro" in normalized && !("Aquisição" in normalized)) {
            normalized["Aquisição"] = normalized["Financeiro"];
            delete normalized["Financeiro"];
            migrated = true;
          }
          if (migrated) {
            try {
              localStorage.setItem(storageKey(uid), JSON.stringify(normalized));
            } catch {
              /* ignore */
            }
          }
          setOpenSections({ ...DEFAULT_OPEN, ...normalized });
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setOpenSections(DEFAULT_OPEN);
  }, [user?.id]);

  const persistSections = (next: Record<string, boolean>) => {
    const uid = user?.id;
    if (!uid) return;
    try {
      localStorage.setItem(storageKey(uid), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const btnBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "11px 14px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    textAlign: "left",
    background: "transparent",
    color: "#e5dce1",
    fontFamily: "var(--brand-fontFamily, 'Inter', sans-serif)",
  };

  const sidebarBg = operadoraBrand?.brand_bg ?? t.sidebar;

  const asideClass = ["app-sidebar-fill", isDrawer ? "app-sidebar-drawer" : "", isDrawer && drawerOpen ? "app-sidebar-drawer-open" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      className={asideClass}
      style={{
        width: "240px",
        flexShrink: 0,
        position: "fixed",
        top: 0,
        left: 0,
        background: sidebarBg,
        display: "flex",
        flexDirection: "column",
        padding: "0px 16px 24px",
        borderRight: `1px solid ${t.sidebarBorder}`,
        boxSizing: "border-box",
        zIndex: 100,
      }}
    >
      <div
        style={{
          marginBottom: 16,
          paddingTop: 12,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexShrink: 0,
          width: "100%",
          maxHeight: 64,
          overflow: "hidden",
        }}
      >
        <img
          src={logoUrl}
          alt={operadoraBrand ? "Operadora" : "Spin Gaming"}
          style={{
            maxWidth: "100%",
            maxHeight: 64,
            width: "auto",
            height: "auto",
            objectFit: "contain",
            display: "block",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = LOGO_DEFAULT;
          }}
        />
      </div>

      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          paddingRight: "4px",
          minHeight: 0,
        }}
      >
        {MENU.map((sec) => {
          const itensFiltrados = sec.items.filter(
            (item) => permissions[item.key] === "sim" || permissions[item.key] === "proprios",
          );
          if (itensFiltrados.length === 0) return null;

          const isOpen = openSections[sec.section] ?? true;
          const hasActive = itensFiltrados.some((i) => i.key === activePage);

          return (
            <div key={sec.section}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpenSections((p) => {
                    const next = { ...p, [sec.section]: !p[sec.section] };
                    persistSections(next);
                    return next;
                  });
                }}
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
                  <span
                    style={{
                      display: "inline-flex",
                      transition: "transform 0.25s",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      color: "#6b6b8a",
                    }}
                  >
                    <ChevronRight size={12} aria-hidden />
                  </span>
                  {sec.section}
                </span>
              </button>

              <div
                aria-hidden={!isOpen}
                style={{
                  overflow: "hidden",
                  maxHeight: isOpen ? `${itensFiltrados.length * 52}px` : "0px",
                  transition: "max-height 0.25s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  paddingLeft: "8px",
                }}
              >
                {itensFiltrados.map((item) => {
                  const active = activePage === item.key;
                  const Icon = item.icon;
                  const iconColor = active ? ICON_COLOR_ACTIVE : ICON_COLOR_INACTIVE;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => onNavigate(item.key)}
                      className={active ? "sidebar-nav-item--active" : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                        textAlign: "left",
                        fontFamily: "var(--brand-fontFamily, 'Inter', sans-serif)",
                        ...(active ? {} : { background: "transparent" }),
                        color: active ? "white" : "#e5dce1",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 0 }}>
                        <Icon size={15} color={iconColor} />
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                        {item.label}
                        {item.key === "central_notificacoes" && badgeCentral > 0 ? (
                          <span
                            aria-label={`${badgeCentral} notificações pendentes`}
                            style={{
                              minWidth: 18,
                              height: 18,
                              padding: "0 5px",
                              borderRadius: 9,
                              background: "#e84025",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {badgeCentral > 99 ? "99+" : badgeCentral}
                          </span>
                        ) : null}
                      </span>
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
