import { useState, useEffect, useMemo } from "react";
import { Briefcase, Building2, KeyRound, Shield, User, UserCog, Users } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "./constants";
import { AbaUsuarios } from "./AbaUsuarios";
import { AbaPermissoes } from "./AbaPermissoes";
import { AbaOperadora } from "./AbaOperadora";
import { AbaGestores } from "./AbaGestores";
import { AbaPrestadores } from "./AbaPrestadores";
import { GestaoUsuariosLoading } from "./gestaoUsuariosUi";
import { handleGestaoTabsArrowKeyDown, tabAtivaPrincipalStyle } from "./gestaoUsuariosHelpers";

type AbaGestao = "usuarios" | "permissoes" | "operadora" | "gestores" | "prestadores";

export default function GestaoUsuarios() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("gestao_usuarios");
  const [aba, setAba] = useState<AbaGestao>("usuarios");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin && aba !== "usuarios") setAba("usuarios");
  }, [isAdmin, aba]);

  useEffect(() => {
    if (isAdmin && !perm.canEditarOk && aba !== "usuarios") setAba("usuarios");
  }, [isAdmin, perm.canEditarOk, aba]);

  const abasConfigPlataforma = useMemo(
    (): { key: Exclude<AbaGestao, "usuarios">; label: string; icon: React.ReactNode }[] => [
      { key: "permissoes", label: "Permissões", icon: <KeyRound size={13} aria-hidden="true" /> },
      { key: "operadora", label: "Operadora", icon: <Building2 size={13} aria-hidden="true" /> },
      { key: "gestores", label: "Gestores", icon: <Briefcase size={13} aria-hidden="true" /> },
      { key: "prestadores", label: "Prestadores", icon: <UserCog size={13} aria-hidden="true" /> },
    ],
    [],
  );

  const ABAS = useMemo((): { key: AbaGestao; label: string; icon: React.ReactNode }[] => {
    if (!isAdmin) return [{ key: "usuarios", label: "Usuários", icon: <Users size={13} aria-hidden="true" /> }];
    return [
      { key: "usuarios", label: "Usuários", icon: <User size={13} aria-hidden="true" /> },
      ...(perm.canEditarOk ? abasConfigPlataforma : []),
    ];
  }, [isAdmin, perm.canEditarOk, abasConfigPlataforma]);

  const abaKeys = useMemo(() => ABAS.map((a) => a.key), [ABAS]);

  if (perm.loading) {
    return (
      <div className="app-page-shell">
        <GestaoUsuariosLoading />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
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
            <Shield size={14} aria-hidden="true" />
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
              Configure e acompanhe os usuários, permissões por perfil e menus de acesso à plataforma.
            </p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div
          role="tablist"
          aria-label="Seções de gestão de usuários"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", overflowX: "auto", scrollbarWidth: "thin" }}
        >
          {ABAS.map((a) => {
            const ativa = aba === a.key;
            const tabStyle = tabAtivaPrincipalStyle(ativa, t.cardBorder, t.inputBg ?? t.bg);
            return (
              <button
                key={a.key}
                type="button"
                role="tab"
                id={`tab-gestao-${a.key}`}
                tabIndex={ativa ? 0 : -1}
                aria-selected={ativa}
                aria-controls={`panel-gestao-${a.key}`}
                onClick={() => setAba(a.key)}
                onKeyDown={(e) =>
                  handleGestaoTabsArrowKeyDown(e, abaKeys, a.key, setAba, "tab-gestao-")
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: tabStyle.background,
                  border: tabStyle.border,
                  color: ativa ? tabStyle.color : t.textMuted,
                  borderRadius: 20,
                  padding: "7px 18px",
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  fontWeight: tabStyle.fontWeight,
                  transition: "all 0.18s",
                  flexShrink: 0,
                }}
              >
                {a.icon}
                {a.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={card}
        {...(isAdmin
          ? {
              role: "tabpanel" as const,
              id: `panel-gestao-${aba}`,
              "aria-labelledby": `tab-gestao-${aba}`,
              tabIndex: 0,
            }
          : { role: "region" as const, "aria-label": "Usuários da plataforma" })}
      >
        {aba === "usuarios" && (
          <AbaUsuarios
            modoAdmin={isAdmin}
            podeCriarUsuario={perm.canCriarOk}
            podeEditarUsuario={perm.canEditarOk}
            podeExcluirUsuario={perm.canExcluirOk}
          />
        )}
        {aba === "permissoes" && <AbaPermissoes />}
        {aba === "operadora" && <AbaOperadora />}
        {aba === "gestores" && <AbaGestores />}
        {aba === "prestadores" && <AbaPrestadores />}
      </div>
    </div>
  );
}
