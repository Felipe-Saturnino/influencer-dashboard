import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { UserCog } from "lucide-react";
import { GiShield, GiPerson, GiLockedChest, GiOfficeChair, GiBriefcase } from "react-icons/gi";
import { BRAND, FONT_TITLE } from "./constants";
import { AbaUsuarios } from "./AbaUsuarios";
import { AbaPermissoes } from "./AbaPermissoes";
import { AbaOperadora } from "./AbaOperadora";
import { AbaGestores } from "./AbaGestores";
import { AbaPrestadores } from "./AbaPrestadores";

type AbaGestao = "usuarios" | "permissoes" | "operadora" | "gestores" | "prestadores";

export default function GestaoUsuarios() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const [aba, setAba] = useState<AbaGestao>("usuarios");

  if (user?.role !== "admin") {
    return (
      <div className="app-page-shell" style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Apenas administradores podem acessar a Gestão de Usuários.
      </div>
    );
  }

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const card: React.CSSProperties = {
    background: t.cardBg,
    borderRadius: 18,
    padding: 28,
    border: `1px solid ${t.cardBorder}`,
    boxShadow: cardShadow,
  };

  const ABAS: { key: AbaGestao; label: string; icon: React.ReactNode }[] = [
    { key: "usuarios", label: "Usuários", icon: <GiPerson size={13} /> },
    { key: "permissoes", label: "Permissões", icon: <GiLockedChest size={13} /> },
    { key: "operadora", label: "Operadora", icon: <GiOfficeChair size={13} /> },
    { key: "gestores", label: "Gestores", icon: <GiBriefcase size={13} /> },
    { key: "prestadores", label: "Prestadores", icon: <UserCog size={13} aria-hidden /> },
  ];

  return (
    <div className="app-page-shell" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: brand.primaryIconBg,
              border: brand.primaryIconBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: brand.primaryIconColor,
              flexShrink: 0,
            }}
          >
            <GiShield size={14} />
          </span>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: brand.primary,
                fontFamily: FONT_TITLE,
                margin: 0,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Gestão de Usuários
            </h1>
            <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "5px 0 0" }}>
              Gerencie usuários, acessos e permissões da plataforma.
            </p>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Seções de gestão de usuários" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ABAS.map((a) => {
          const ativa = aba === a.key;
          return (
            <button
              key={a.key}
              type="button"
              role="tab"
              id={`tab-gestao-${a.key}`}
              aria-selected={ativa}
              aria-controls={`panel-gestao-${a.key}`}
              onClick={() => setAba(a.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: ativa ? `${BRAND.roxoVivo}22` : t.inputBg ?? t.bg,
                border: `1px solid ${ativa ? BRAND.roxoVivo : t.cardBorder}`,
                color: ativa ? BRAND.roxoVivo : t.textMuted,
                borderRadius: 20,
                padding: "7px 18px",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: ativa ? 700 : 400,
                transition: "all 0.18s",
              }}
            >
              {a.icon}
              {a.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-gestao-${aba}`} aria-labelledby={`tab-gestao-${aba}`} style={card}>
        {aba === "usuarios" && <AbaUsuarios t={t} />}
        {aba === "permissoes" && <AbaPermissoes t={t} />}
        {aba === "operadora" && <AbaOperadora t={t} />}
        {aba === "gestores" && <AbaGestores t={t} />}
        {aba === "prestadores" && <AbaPrestadores t={t} />}
      </div>
    </div>
  );
}
