import type { CSSProperties } from "react";
import { Briefcase, Building2, ChevronLeft, ChevronRight, KeyRound, User, UserCog } from "lucide-react";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import {
  getFilterBarRowStyle,
  getFilterBarWrapperStyle,
  getFiltroBarTabButtonStyle,
} from "../../../lib/filterBarStyles";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import type { Role } from "../../../types";
import {
  BRAND,
  FILTROS_PERFIL_LINHAS,
  FILTROS_PERFIL_LINHAS_PERMISSOES,
  STATUS_USUARIO_CARROSSEL,
  STATUS_USUARIO_TODOS_LABEL,
  roleBadgeColor,
  roleLabel,
  type FiltroStatusUsuarios,
} from "./constants";
import { rolePermTabIcon } from "./gestaoUsuariosRoleIcons";

export type AbaGestaoPrincipal = "usuarios" | "permissoes" | "escopos";
export type AbaGestaoEscopo = "operadora" | "gestores" | "prestadores";

export interface ContagensFiltroUsuarios {
  qtdAtivos: number;
  qtdDesativados: number;
  qtdPorPerfil: Record<Role, number>;
}

interface GestaoUsuariosFiltroBarProps {
  aba: AbaGestaoPrincipal;
  onAbaChange: (aba: AbaGestaoPrincipal) => void;
  mostrarAbasAdmin: boolean;
  /** Aba Usuários */
  busca: string;
  onBuscaChange: (v: string) => void;
  filtroStatus: FiltroStatusUsuarios;
  onFiltroStatusChange: (v: FiltroStatusUsuarios) => void;
  filtroPerfilSet: Set<Role>;
  onTogglePerfil: (role: Role) => void;
  contagens: ContagensFiltroUsuarios;
  /** Aba Permissões */
  roleAtivo: Role;
  onRoleAtivoChange: (role: Role) => void;
  /** Aba Escopos */
  escopoSubAba: AbaGestaoEscopo;
  onEscopoSubAbaChange: (aba: AbaGestaoEscopo) => void;
}

const ABAS_PRINCIPAIS: { key: AbaGestaoPrincipal; label: string }[] = [
  { key: "usuarios", label: "Usuários" },
  { key: "permissoes", label: "Permissões" },
  { key: "escopos", label: "Escopos" },
];

const ABAS_ESCOPO: { key: AbaGestaoEscopo; label: string }[] = [
  { key: "operadora", label: "Operadora" },
  { key: "gestores", label: "Gestores" },
  { key: "prestadores", label: "Prestadores" },
];

const GESTAO_TAB_ICONS: Record<AbaGestaoPrincipal, React.ReactNode> = {
  usuarios: <User {...FILTRO_BAR_TAB_ICON_PROPS} />,
  permissoes: <KeyRound {...FILTRO_BAR_TAB_ICON_PROPS} />,
  escopos: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

const ESCOPO_TAB_ICONS: Record<AbaGestaoEscopo, React.ReactNode> = {
  operadora: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  gestores: <Briefcase {...FILTRO_BAR_TAB_ICON_PROPS} />,
  prestadores: <UserCog {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

function linhaTituloStyle(t: { textMuted: string }): CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 700,
    color: t.textMuted,
    fontFamily: FONT.body,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    flexShrink: 0,
    width: "100%",
    textAlign: "center",
    marginBottom: 2,
  };
}

function PerfilFiltroToggle({
  role,
  active,
  count,
  onClick,
  idPrefix,
}: {
  role: Role;
  active: boolean;
  count: number;
  onClick: () => void;
  idPrefix: string;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const cor = roleBadgeColor(role);
  const label = roleLabel(role);
  const tabStyle = getFiltroBarTabButtonStyle(t, brand, active, cor);

  return (
    <button
      type="button"
      id={`${idPrefix}-${role}`}
      aria-pressed={active}
      aria-label={`Filtrar por perfil ${label}${active ? " — ativo" : ""}`}
      onClick={onClick}
      style={{
        ...tabStyle,
        fontFamily: FONT.body,
        transition: "all 0.15s",
      }}
    >
      {rolePermTabIcon(role)}
      {label}
      <span style={{ fontSize: 11, fontWeight: 800, minWidth: 18, textAlign: "center" }}>{count}</span>
    </button>
  );
}

function LinhasPerfis({
  linhas,
  filtroPerfilSet,
  onTogglePerfil,
  contagens,
  idPrefix,
  roleAtivo,
  onRoleSelect,
  modo,
}: {
  linhas: { titulo: string; roles: Role[] }[];
  filtroPerfilSet?: Set<Role>;
  onTogglePerfil?: (role: Role) => void;
  contagens?: ContagensFiltroUsuarios;
  idPrefix: string;
  roleAtivo?: Role;
  onRoleSelect?: (role: Role) => void;
  modo: "multi" | "single";
}) {
  const { theme: t } = useApp();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {linhas.map(({ titulo, roles }) => (
        <div key={titulo} style={{ width: "100%" }}>
          <div style={linhaTituloStyle(t)}>{titulo}</div>
          <div
            {...(modo === "single"
              ? {
                  role: "tablist" as const,
                  "aria-label": titulo,
                  onKeyDown: (e: React.KeyboardEvent) =>
                    onFiltroBarTabsKeyDown(e, roles, onRoleSelect!, (k) => `tab-${idPrefix}-${k}`),
                }
              : {})}
            style={getFilterBarRowStyle()}
          >
            {roles.map((roleVal) => {
              if (modo === "single" && roleAtivo != null && onRoleSelect) {
                return (
                  <FiltroBarTabButton
                    key={roleVal}
                    id={`tab-${idPrefix}-${roleVal}`}
                    active={roleAtivo === roleVal}
                    aria-controls="panel-permissoes-matriz"
                    onClick={() => onRoleSelect(roleVal)}
                    activeColor={roleBadgeColor(roleVal)}
                    icon={rolePermTabIcon(roleVal)}
                  >
                    {roleLabel(roleVal)}
                  </FiltroBarTabButton>
                );
              }
              const sel = filtroPerfilSet?.has(roleVal) ?? false;
              const count = contagens?.qtdPorPerfil[roleVal] ?? 0;
              return (
                <PerfilFiltroToggle
                  key={roleVal}
                  role={roleVal}
                  active={sel}
                  count={count}
                  onClick={() => onTogglePerfil?.(roleVal)}
                  idPrefix={idPrefix}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GestaoUsuariosFiltroBar({
  aba,
  onAbaChange,
  mostrarAbasAdmin,
  busca,
  onBuscaChange,
  filtroStatus,
  onFiltroStatusChange,
  filtroPerfilSet,
  onTogglePerfil,
  contagens,
  roleAtivo,
  onRoleAtivoChange,
  escopoSubAba,
  onEscopoSubAbaChange,
}: GestaoUsuariosFiltroBarProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const abasVisiveis = mostrarAbasAdmin ? ABAS_PRINCIPAIS : ABAS_PRINCIPAIS.filter((a) => a.key === "usuarios");
  const abaKeys = abasVisiveis.map((a) => a.key);

  const labelStatusCentral =
    filtroStatus === "todos"
      ? STATUS_USUARIO_TODOS_LABEL
      : STATUS_USUARIO_CARROSSEL.find((s) => s.key === filtroStatus)?.label ?? STATUS_USUARIO_TODOS_LABEL;

  const countStatusCentral =
    filtroStatus === "ativo"
      ? contagens.qtdAtivos
      : filtroStatus === "desativado"
        ? contagens.qtdDesativados
        : contagens.qtdAtivos + contagens.qtdDesativados;

  const avancarStatus = () => {
    if (filtroStatus === "todos") {
      onFiltroStatusChange("ativo");
      return;
    }
    const idx = STATUS_USUARIO_CARROSSEL.findIndex((s) => s.key === filtroStatus);
    const next = STATUS_USUARIO_CARROSSEL[(idx + 1) % STATUS_USUARIO_CARROSSEL.length]!;
    onFiltroStatusChange(next.key);
  };

  const retrocederStatus = () => {
    if (filtroStatus === "todos") {
      onFiltroStatusChange("desativado");
      return;
    }
    const idx = STATUS_USUARIO_CARROSSEL.findIndex((s) => s.key === filtroStatus);
    const prev =
      STATUS_USUARIO_CARROSSEL[(idx - 1 + STATUS_USUARIO_CARROSSEL.length) % STATUS_USUARIO_CARROSSEL.length]!;
    onFiltroStatusChange(prev.key);
  };

  const todosStatusAtivo = filtroStatus === "todos";
  const pillTodos = getFiltroBarTabButtonStyle(t, brand, todosStatusAtivo, BRAND.cinza);

  return (
    <div style={{ ...getFilterBarWrapperStyle(brand), marginBottom: 18 }}>
      {mostrarAbasAdmin ? (
        <div
          role="tablist"
          aria-label="Seções de gestão de usuários"
          style={getFilterBarRowStyle({ marginBottom: 12 })}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, abaKeys, onAbaChange, (k) => `tab-gestao-${k}`)}
        >
          {abasVisiveis.map((a) => (
            <FiltroBarTabButton
              key={a.key}
              id={`tab-gestao-${a.key}`}
              active={aba === a.key}
              aria-controls={`panel-gestao-${a.key}`}
              onClick={() => onAbaChange(a.key)}
              icon={GESTAO_TAB_ICONS[a.key]}
            >
              {a.label}
            </FiltroBarTabButton>
          ))}
        </div>
      ) : null}

      {aba === "usuarios" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <div style={getFilterBarRowStyle()}>
            <button
              type="button"
              aria-label="Status anterior"
              onClick={retrocederStatus}
              style={getCarouselBtnNavStyle(t, false)}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span
              style={{
                ...getCarouselPeriodLabelStyle(t, { minWidth: 140 }),
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {labelStatusCentral}
              {filtroStatus !== "todos" ? (
                <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 800, opacity: 0.9 }}>
                  {countStatusCentral}
                </span>
              ) : null}
            </span>
            <button
              type="button"
              aria-label="Próximo status"
              onClick={avancarStatus}
              style={getCarouselBtnNavStyle(t, false)}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={todosStatusAtivo}
              onClick={() => onFiltroStatusChange("todos")}
              style={{
                ...pillTodos,
                fontFamily: FONT.body,
                transition: "all 0.15s",
              }}
            >
              {STATUS_USUARIO_TODOS_LABEL}
            </button>
          </div>

          <div style={getFilterBarRowStyle()}>
            <BarraPesquisaPagina
              value={busca}
              onChange={onBuscaChange}
              placeholder={PAGE_SEARCH.nomeEmail}
              aria-label="Buscar usuários por nome ou e-mail"
              wrapperStyle={{ flex: "1 1 280px", minWidth: 200, maxWidth: 560 }}
              inputStyle={{ fontSize: 13 }}
            />
          </div>

          <LinhasPerfis
            linhas={FILTROS_PERFIL_LINHAS}
            filtroPerfilSet={filtroPerfilSet}
            onTogglePerfil={onTogglePerfil}
            contagens={contagens}
            idPrefix="usu-perfil"
            modo="multi"
          />
        </div>
      ) : null}

      {aba === "permissoes" ? (
        <LinhasPerfis
          linhas={FILTROS_PERFIL_LINHAS_PERMISSOES}
          roleAtivo={roleAtivo}
          onRoleSelect={onRoleAtivoChange}
          idPrefix="perm"
          modo="single"
        />
      ) : null}

      {aba === "escopos" ? (
        <div
          role="tablist"
          aria-label="Escopos de acesso"
          style={getFilterBarRowStyle()}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(e, ABAS_ESCOPO.map((a) => a.key), onEscopoSubAbaChange, (k) => `tab-escopo-${k}`)
          }
        >
          {ABAS_ESCOPO.map((a) => (
            <FiltroBarTabButton
              key={a.key}
              id={`tab-escopo-${a.key}`}
              active={escopoSubAba === a.key}
              aria-controls={`panel-gestao-${a.key}`}
              onClick={() => onEscopoSubAbaChange(a.key)}
              icon={ESCOPO_TAB_ICONS[a.key]}
            >
              {a.label}
            </FiltroBarTabButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}
