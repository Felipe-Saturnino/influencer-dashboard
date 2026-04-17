import { useState, useRef, useEffect } from "react";
import { Settings, HelpCircle, LogOut, Menu } from "lucide-react";
import { useApp } from "../context/AppContext";
import { MENU } from "../constants/menu";
import { FONT } from "../constants/theme";

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

/** Páginas fora do MENU lateral (acesso pelo dropdown). */
const HEADER_EXTRA_LABELS: Record<string, string> = {
  configuracoes: "CONFIGURAÇÕES",
  ajuda: "AJUDA",
};

/** Título da barra superior: nome da seção do menu (ex.: Lives, Estúdio), não o nome da página. */
function getHeaderLabel(pageKey: string): string | null {
  if (pageKey === "home") return "Bem-vindo";
  const extra = HEADER_EXTRA_LABELS[pageKey];
  if (extra) return extra;
  for (const sec of MENU) {
    const item = sec.items.find((i) => i.key === pageKey);
    if (item) return sec.section;
  }
  return null;
}

const SEMANTIC_RED = "#e84025";

const AVATAR_GRADIENT =
  "linear-gradient(135deg, var(--brand-secondary, #4a2082), var(--brand-primary, #7c3aed))";

export default function Header({ activePage, onNavigate, onLogout, showMenuButton = false, onMenuClick }: Props) {
  const { theme: t, user, operadoraBrand } = useApp();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const root = menuRef.current;
      if (!root) return;
      const items = [...root.querySelectorAll('[role="menuitem"]')] as HTMLButtonElement[];
      if (items.length === 0) return;
      const cur = items.indexOf(document.activeElement as HTMLButtonElement);
      let next = cur;
      if (e.key === "ArrowDown") next = cur < 0 ? 0 : (cur + 1) % items.length;
      else next = cur <= 0 ? items.length - 1 : cur - 1;
      items[next]?.focus();
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const first = menuRef.current?.querySelector('[role="menuitem"]') as HTMLButtonElement | null;
      first?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  if (!user) return null;

  const headerLabel = getHeaderLabel(activePage);
  const initial = user.name?.[0]?.toUpperCase() ?? "?";

  const dropdownItem: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "11px 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    color: t.text,
    fontFamily: FONT.body,
    textAlign: "left",
    transition: "background 0.12s",
  };

  const headerBg =
    user?.role === "operador" && operadoraBrand?.brand_bg && t.isDark ? operadoraBrand.brand_bg : t.headerBg;

  const triggerHot = open || hover;

  return (
    <header
      className="app-header-responsive"
      style={{
        background: headerBg,
        borderBottom: `1px solid ${t.headerBorder}`,
        padding: "0 32px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        {showMenuButton && onMenuClick && (
          <button
            type="button"
            aria-label="Abrir menu de navegação"
            onClick={onMenuClick}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              marginLeft: -6,
              border: "none",
              borderRadius: 12,
              background: "transparent",
              color: t.headerText,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Menu size={22} strokeWidth={2.2} />
          </button>
        )}
        <span
          style={{
            color: t.headerText,
            fontWeight: 800,
            fontSize: "15px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            fontFamily: FONT.title,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {headerLabel ?? ""}
        </span>
      </div>

      <div ref={ref} style={{ position: "relative" }}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Menu do usuário"
          title={user.name || undefined}
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            padding: "6px 10px",
            borderRadius: "12px",
            border: "none",
            background: triggerHot
              ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 8%, transparent)"
              : "transparent",
            transition: "background 0.15s, box-shadow 0.15s",
            boxShadow: triggerHot
              ? "0 0 0 1px color-mix(in srgb, var(--brand-primary, #7c3aed) 13%, transparent)"
              : "none",
          }}
        >
          <p
            className="app-header-user-name"
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: 600,
              color: t.headerText,
              fontFamily: FONT.body,
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.name}
          </p>
          <div
            title={user.name || undefined}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: AVATAR_GRADIENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "14px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
        </button>

        {open && (
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: "14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              minWidth: "190px",
              zIndex: 300,
              overflow: "hidden",
              padding: "6px 0",
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onNavigate("configuracoes");
                setOpen(false);
              }}
              style={dropdownItem}
              onMouseEnter={(e) => (e.currentTarget.style.background = t.inputBg ?? t.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Settings size={14} color={t.textMuted} aria-hidden />
              Configurações
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onNavigate("ajuda");
                setOpen(false);
              }}
              style={dropdownItem}
              onMouseEnter={(e) => (e.currentTarget.style.background = t.inputBg ?? t.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <HelpCircle size={14} color={t.textMuted} aria-hidden />
              Ajuda
            </button>

            <div style={{ height: "1px", background: t.cardBorder, margin: "6px 0" }} />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onLogout();
                setOpen(false);
              }}
              style={{
                ...dropdownItem,
                color: SEMANTIC_RED,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${SEMANTIC_RED}12`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut size={14} color={SEMANTIC_RED} aria-hidden />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
