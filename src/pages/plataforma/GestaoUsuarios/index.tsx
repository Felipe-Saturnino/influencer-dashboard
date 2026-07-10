import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { FONT } from "../../../constants/theme";
import { AbaUsuarios } from "./AbaUsuarios";
import { AbaPermissoes } from "./AbaPermissoes";
import { AbaOperadora } from "./AbaOperadora";
import { AbaGestores } from "./AbaGestores";
import { AbaPrestadores } from "./AbaPrestadores";
import { AbaSimuladorLogin } from "./AbaSimuladorLogin";
import { GestaoUsuariosLoading } from "./gestaoUsuariosUi";
import {
  GestaoUsuariosFiltroBar,
  type AbaGestaoEscopo,
  type ContagensFiltroUsuarios,
} from "./GestaoUsuariosFiltroBar";
import type { Role } from "../../../types";
import type { FiltroStatusUsuarios } from "./constants";

const CONTAGENS_VAZIAS: ContagensFiltroUsuarios = {
  qtdAtivos: 0,
  qtdDesativados: 0,
  qtdPorPerfil: {} as Record<Role, number>,
};

export default function GestaoUsuarios() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("gestao_usuarios");
  const [aba, setAba] = useRouteTab("gestao_usuarios", "usuarios", ["usuarios", "permissoes", "escopos", "simulador"] as const);
  const [escopoSubAba, setEscopoSubAba] = useState<AbaGestaoEscopo>("operadora");
  const [roleAtivo, setRoleAtivo] = useState<Role>("gestor");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusUsuarios>("ativo");
  const [filtroPerfilSet, setFiltroPerfilSet] = useState<Set<Role>>(() => new Set());
  const [contagensFiltro, setContagensFiltro] = useState<ContagensFiltroUsuarios>(CONTAGENS_VAZIAS);

  const isAdmin = user?.role === "admin";
  const mostrarAbasAdmin = isAdmin && perm.canEditarOk;

  useEffect(() => {
    if (perm.loading) return;
    if (!isAdmin && aba !== "usuarios") setAba("usuarios");
  }, [perm.loading, isAdmin, aba, setAba]);

  useEffect(() => {
    if (perm.loading) return;
    if (isAdmin && !perm.canEditarOk && aba !== "usuarios") setAba("usuarios");
  }, [perm.loading, isAdmin, perm.canEditarOk, aba, setAba]);

  const card = useMemo(
    () => getPageContentBoxStyle(brand, t, { padding: 28 }),
    [brand, t],
  );

  const toggleFiltroPerfil = (role: Role) => {
    setFiltroPerfilSet((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

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

  const panelId =
    aba === "escopos"
      ? `panel-gestao-${escopoSubAba}`
      : aba === "permissoes"
        ? "panel-permissoes-matriz"
        : aba === "simulador"
          ? "panel-gestao-simulador"
          : "panel-gestao-usuarios";

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="gestao_usuarios" />}
        title={getPageMenuLabel("gestao_usuarios")}
        subtitle="Configure e acompanhe os usuários, permissões por perfil e menus de acesso à plataforma."
      />

      <GestaoUsuariosFiltroBar
        aba={aba}
        onAbaChange={setAba}
        mostrarAbasAdmin={mostrarAbasAdmin}
        filtroStatus={filtroStatus}
        onFiltroStatusChange={setFiltroStatus}
        filtroPerfilSet={filtroPerfilSet}
        onTogglePerfil={toggleFiltroPerfil}
        contagens={contagensFiltro}
        roleAtivo={roleAtivo}
        onRoleAtivoChange={setRoleAtivo}
        escopoSubAba={escopoSubAba}
        onEscopoSubAbaChange={setEscopoSubAba}
      />

      <div
        style={card}
        {...(mostrarAbasAdmin
          ? {
              role: "tabpanel" as const,
              id: panelId,
              "aria-labelledby":
                aba === "escopos"
                  ? `tab-escopo-${escopoSubAba}`
                  : aba === "permissoes" || aba === "simulador"
                    ? `tab-perm-${roleAtivo}`
                    : `tab-gestao-usuarios`,
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
            busca={busca}
            onBuscaChange={setBusca}
            filtroStatus={filtroStatus}
            filtroPerfilSet={filtroPerfilSet}
            onContagensChange={setContagensFiltro}
          />
        )}
        {aba === "permissoes" && <AbaPermissoes roleAtivo={roleAtivo} />}
        {aba === "escopos" && escopoSubAba === "operadora" && <AbaOperadora />}
        {aba === "escopos" && escopoSubAba === "gestores" && <AbaGestores />}
        {aba === "escopos" && escopoSubAba === "prestadores" && <AbaPrestadores />}
        {aba === "simulador" && <AbaSimuladorLogin viewerRole={roleAtivo} />}
      </div>
    </div>
  );
}
