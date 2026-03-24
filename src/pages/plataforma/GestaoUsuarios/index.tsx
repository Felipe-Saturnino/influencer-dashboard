import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { GiShield, GiPerson, GiLockedChest, GiOfficeChair } from "react-icons/gi";
import { BRAND, FONT_TITLE } from "./constants";
import { AbaUsuarios } from "./AbaUsuarios";
import { AbaPermissoes } from "./AbaPermissoes";
import { AbaOperadora } from "./AbaOperadora";

type AbaGestao = "usuarios" | "permissoes" | "operadora";

export default function GestaoUsuarios() {
  const { theme: t, user } = useApp();
  const [aba, setAba] = useState<AbaGestao>("usuarios");

  if (user?.role !== "admin") {
    return (
      <div className="app-page-shell" style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Apenas administradores podem acessar a Gestão de Usuários.
      </div>
    );
  }

  const card: React.CSSProperties = {
    background: t.cardBg,
    borderRadius: 18,
    padding: 28,
    border: `1px solid ${t.cardBorder}`,
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  const ABAS: { key: AbaGestao; label: string; icon: React.ReactNode }[] = [
    { key: "usuarios", label: "Usuários", icon: <GiPerson size={13} /> },
    { key: "permissoes", label: "Permissões", icon: <GiLockedChest size={13} /> },
    { key: "operadora", label: "Operadora", icon: <GiOfficeChair size={13} /> },
  ];

  return (
    <div className="app-page-shell" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(74,32,130,0.18)",
              border: "1px solid rgba(74,32,130,0.30)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: BRAND.ciano,
              flexShrink: 0,
            }}
          >
            <GiShield size={14} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: t.text,
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

      <div style={{ display: "flex", gap: 8 }}>
        {ABAS.map((a) => {
          const ativa = aba === a.key;
          return (
            <button
              key={a.key}
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

      <div style={card}>
        {aba === "usuarios" && <AbaUsuarios t={t} />}
        {aba === "permissoes" && <AbaPermissoes t={t} />}
        {aba === "operadora" && <AbaOperadora t={t} />}
      </div>
    </div>
  );
}
