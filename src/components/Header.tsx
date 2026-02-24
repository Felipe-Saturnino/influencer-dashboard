import { useApp } from "../context/AppContext";
import { MENU_ADMIN, MENU_INFLUENCER } from "../constants/menu";
import { BASE_COLORS, FONT } from "../constants/theme";

interface Props {
  activePage: string;
}

const STATIC_LABELS: Record<string, { icon: string; label: string }> = {
  configuracoes: { icon: "⚙️", label: "Configurações" },
  ajuda:         { icon: "❓", label: "Ajuda"          },
};

export default function Header({ activePage }: Props) {
  const { theme: t, user } = useApp();
  if (!user) return null;

  const allItems = [...MENU_ADMIN, ...MENU_INFLUENCER].flatMap(s => s.items);
  const found    = allItems.find(i => i.key === activePage);
  const current  = found ?? STATIC_LABELS[activePage] ?? { icon: "📄", label: activePage };

  return (
    <header style={{
      background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}`,
      padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <span style={{ color: t.headerText, fontWeight: 800, fontSize: "15px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.title }}>
        {current.icon} {current.label}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: t.headerText, fontFamily: FONT.body }}>{user.name}</p>
          <p style={{ margin: 0, fontSize: "11px", color: t.headerSub, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: FONT.body }}>{user.role}</p>
        </div>
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: "14px", fontWeight: 700,
        }}>
          {user.name[0]}
        </div>
      </div>
    </header>
  );
}
