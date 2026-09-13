import { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { ModalConfirmDelete } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { FONT } from "../../../constants/theme";
import { AbaUsuarios } from "./AbaUsuarios";
import { AbaPermissoes } from "./AbaPermissoes";
import { AbaOperadora } from "./AbaOperadora";
import { AbaPrestadores } from "./AbaPrestadores";
import { AbaSimuladorLogin } from "./AbaSimuladorLogin";
import { GestaoUsuariosLoading } from "./gestaoUsuariosUi";
import {
  GestaoUsuariosFiltroBar,
  type AbaGestaoEscopo,
  type ContagensFiltroUsuarios,
} from "./GestaoUsuariosFiltroBar";
import type { Role } from "../../../types";
import { roleLabel, type FiltroStatusUsuarios } from "./constants";
import { ROLES_GESTOR_DEPARTAMENTO } from "../../../lib/staffRoles";

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
  const [roleAtivo, setRoleAtivo] = useState<Role>(ROLES_GESTOR_DEPARTAMENTO[0] ?? "executivo");
  const [matrizSuja, setMatrizSuja] = useState(false);
  const [rolePendenteTroca, setRolePendenteTroca] = useState<Role | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusUsuarios>("ativo");
  const [filtroPerfilSet, setFiltroPerfilSet] = useState<Set<Role>>(() => new Set());
  const [contagensFiltro, setContagensFiltro] = useState<ContagensFiltroUsuarios>(CONTAGENS_VAZIAS);

  const isAdmin = user?.role === "admin";
  const mostrarAbasAdmin = isAdmin && perm.canEditarOk;

  const onDirtyChange = useCallback((dirty: boolean) => {
    setMatrizSuja(dirty);
  }, []);

  const solicitarTrocaRole = useCallback(
    (next: Role) => {
      if (next === roleAtivo) return;
      if ((aba === "permissoes" || aba === "simulador") && matrizSuja) {
        setRolePendenteTroca(next);
        return;
      }
      setRoleAtivo(next);
      setMatrizSuja(false);
    },
    [aba, matrizSuja, roleAtivo],
  );

  useEffect(() => {
    if (perm.loading) return;
    if (!isAdmin && aba !== "usuarios") setAba("usuarios");
  }, [perm.loading, isAdmin, aba, setAba]);

  useEffect(() => {
    if (perm.loading) return;
    if (isAdmin && !perm.canEditarOk && aba !== "usuarios") setAba("usuarios");
  }, [perm.loading, isAdmin, perm.canEditarOk, aba, setAba]);

  useEffect(() => {
    setMatrizSuja(false);
  }, [aba]);

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
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  const panelId =
    aba === "escopos"
      ? `panel-gestao-${escopoSubAba}`
      : `panel-gestao-${aba}`;

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
        onRoleAtivoChange={solicitarTrocaRole}
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
        {aba === "permissoes" && (
          <AbaPermissoes roleAtivo={roleAtivo} onDirtyChange={onDirtyChange} />
        )}
        {aba === "escopos" && escopoSubAba === "operadora" && <AbaOperadora />}
        {aba === "escopos" && escopoSubAba === "prestadores" && <AbaPrestadores />}
        {aba === "simulador" && (
          <AbaSimuladorLogin viewerRole={roleAtivo} onDirtyChange={onDirtyChange} />
        )}
      </div>

      {rolePendenteTroca ? (
        <ModalConfirmDelete
          title="Descartar alterações?"
          texto={`Há alterações não salvas em ${roleLabel(roleAtivo)}. Deseja descartá-las e abrir ${roleLabel(rolePendenteTroca)}?`}
          onCancel={() => setRolePendenteTroca(null)}
          onConfirm={() => {
            setRoleAtivo(rolePendenteTroca);
            setRolePendenteTroca(null);
            setMatrizSuja(false);
          }}
          confirmLabel="Descartar"
        />
      ) : null}
    </div>
  );
}
