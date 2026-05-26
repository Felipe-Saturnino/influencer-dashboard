import { useState, useEffect, useMemo } from "react";
import { Briefcase, Building2, KeyRound, User, UserCog } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { AbaUsuarios } from "./AbaUsuarios";
import { AbaPermissoes } from "./AbaPermissoes";
import { AbaOperadora } from "./AbaOperadora";
import { AbaGestores } from "./AbaGestores";
import { AbaPrestadores } from "./AbaPrestadores";
import { GestaoUsuariosLoading } from "./gestaoUsuariosUi";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";

type AbaGestao = "usuarios" | "permissoes" | "operadora" | "gestores" | "prestadores";

export default function GestaoUsuarios() {
  const { theme: t, user } = useApp();
  const perm = usePermission("gestao_usuarios");
  const [aba, setAba] = useState<AbaGestao>("usuarios");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin && aba !== "usuarios") setAba("usuarios");
  }, [isAdmin, aba]);

  useEffect(() => {
    if (isAdmin && !perm.canEditarOk && aba !== "usuarios") setAba("usuarios");
  }, [isAdmin, perm.canEditarOk, aba]);

  const GESTAO_TAB_ICONS: Record<AbaGestao, React.ReactNode> = {
    usuarios: <User {...FILTRO_BAR_TAB_ICON_PROPS} />,
    permissoes: <KeyRound {...FILTRO_BAR_TAB_ICON_PROPS} />,
    operadora: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
    gestores: <Briefcase {...FILTRO_BAR_TAB_ICON_PROPS} />,
    prestadores: <UserCog {...FILTRO_BAR_TAB_ICON_PROPS} />,
  };

  const abasConfigPlataforma = useMemo(
    (): { key: Exclude<AbaGestao, "usuarios">; label: string }[] => [
      { key: "permissoes", label: "Permissões" },
      { key: "operadora", label: "Operadora" },
      { key: "gestores", label: "Gestores" },
      { key: "prestadores", label: "Prestadores" },
    ],
    [],
  );

  const ABAS = useMemo((): { key: AbaGestao; label: string }[] => {
    if (!isAdmin) return [{ key: "usuarios", label: "Usuários" }];
    return [
      { key: "usuarios", label: "Usuários" },
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
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="gestao_usuarios" />}
        title={getPageMenuLabel("gestao_usuarios")}
        subtitle="Configure e acompanhe os usuários, permissões por perfil e menus de acesso à plataforma."
      />

      {isAdmin && (
        <div
          role="tablist"
          aria-label="Seções de gestão de usuários"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", overflowX: "auto", scrollbarWidth: "thin" }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, abaKeys, setAba, (k) => `tab-gestao-${k}`)}
        >
          {ABAS.map((a) => (
            <FiltroBarTabButton
              key={a.key}
              id={`tab-gestao-${a.key}`}
              active={aba === a.key}
              aria-controls={`panel-gestao-${a.key}`}
              onClick={() => setAba(a.key)}
              icon={GESTAO_TAB_ICONS[a.key]}
            >
              {a.label}
            </FiltroBarTabButton>
          ))}
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
