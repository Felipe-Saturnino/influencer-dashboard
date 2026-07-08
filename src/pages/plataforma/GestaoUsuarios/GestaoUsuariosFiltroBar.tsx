import type { CSSProperties, ReactNode } from "react";
import { Briefcase, Building2, ChevronLeft, ChevronRight, Eye, KeyRound, User, UserCog } from "lucide-react";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
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
  roleLabel,
  type FiltroStatusUsuarios,
} from "./constants";
import { GestaoUsuariosPerfilPill } from "./GestaoUsuariosPerfilPill";

export type AbaGestaoPrincipal = "usuarios" | "permissoes" | "escopos" | "simulador";
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
  filtroStatus: FiltroStatusUsuarios;
  onFiltroStatusChange: (v: FiltroStatusUsuarios) => void;
  filtroPerfilSet: Set<Role>;
  onTogglePerfil: (role: Role) => void;
  contagens: ContagensFiltroUsuarios;
  roleAtivo: Role;
  onRoleAtivoChange: (role: Role) => void;
  escopoSubAba: AbaGestaoEscopo;
  onEscopoSubAbaChange: (aba: AbaGestaoEscopo) => void;
}

const ABAS_PRINCIPAIS: { key: AbaGestaoPrincipal; label: string }[] = [
  { key: "usuarios", label: "Usuários" },
  { key: "permissoes", label: "Permissões" },
  { key: "escopos", label: "Escopos" },
  { key: "simulador", label: "Simulador de Login" },
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
  simulador: <Eye {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

const ESCOPO_TAB_ICONS: Record<AbaGestaoEscopo, React.ReactNode> = {
  operadora: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  gestores: <Briefcase {...FILTRO_BAR_TAB_ICON_PROPS} />,
  prestadores: <UserCog {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

/** Rótulo lateral — referência Influencers (Status / Plataforma). */
function rotuloSecaoFiltroStyle(t: { textMuted: string }): CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 700,
    color: t.textMuted,
    fontFamily: FONT.body,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginRight: 4,
    flexShrink: 0,
  };
}

function rotuloCurtoPerfil(titulo: string): string {
  return titulo.replace(/^Perfis\s+/i, "");
}

function FiltroBarSecaoSeparada({ children }: { children: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        paddingTop: 12,
        marginTop: 12,
        borderTop: `1px solid ${t.cardBorder}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

function LinhasPerfis({
  linhas,
  filtroPerfilSet,
  onTogglePerfil,
  contagens,
  roleAtivo,
  onRoleSelect,
  modo,
}: {
  linhas: { titulo: string; roles: Role[] }[];
  filtroPerfilSet?: Set<Role>;
  onTogglePerfil?: (role: Role) => void;
  contagens?: ContagensFiltroUsuarios;
  roleAtivo?: Role;
  onRoleSelect?: (role: Role) => void;
  modo: "multi" | "single";
}) {
  const { theme: t } = useApp();

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 10 }}>
      {linhas.map(({ titulo, roles }) => (
        <div
          key={titulo}
          {...(modo === "single"
            ? {
                role: "tablist" as const,
                "aria-label": titulo,
                onKeyDown: (e: React.KeyboardEvent) =>
                  onFiltroBarTabsKeyDown(e, roles, onRoleSelect!, (k) => `tab-perm-${k}`),
              }
            : {})}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <span style={rotuloSecaoFiltroStyle(t)}>{rotuloCurtoPerfil(titulo)}</span>
          {roles.map((roleVal) => {
            const count = contagens?.qtdPorPerfil[roleVal] ?? 0;
            if (modo === "single" && roleAtivo != null && onRoleSelect) {
              return (
                <GestaoUsuariosPerfilPill
                  key={roleVal}
                  role={roleVal}
                  active={roleAtivo === roleVal}
                  onClick={() => onRoleSelect(roleVal)}
                  count={count}
                  showClearIcon={false}
                  aria-label={`Permissões do perfil ${roleLabel(roleVal)}`}
                />
              );
            }
            const sel = filtroPerfilSet?.has(roleVal) ?? false;
            return (
              <GestaoUsuariosPerfilPill
                key={roleVal}
                role={roleVal}
                active={sel}
                onClick={() => onTogglePerfil?.(roleVal)}
                count={count}
                showClearIcon
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function GestaoUsuariosFiltroBar({
  aba,
  onAbaChange,
  mostrarAbasAdmin,
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
    <div style={getFilterBarWrapperStyle(brand, t)}>
      {mostrarAbasAdmin ? (
        <div
          role="tablist"
          aria-label="Seções de gestão de usuários"
          style={getFilterBarRowStyle({ marginBottom: 0 })}
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            ...(mostrarAbasAdmin ? { paddingTop: 12, marginTop: 12 } : {}),
          }}
        >
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

          <FiltroBarSecaoSeparada>
            <LinhasPerfis
              linhas={FILTROS_PERFIL_LINHAS}
              filtroPerfilSet={filtroPerfilSet}
              onTogglePerfil={onTogglePerfil}
              contagens={contagens}
              modo="multi"
            />
          </FiltroBarSecaoSeparada>
        </div>
      ) : null}

      {aba === "permissoes" ? (
        <FiltroBarSecaoSeparada>
          <LinhasPerfis
            linhas={FILTROS_PERFIL_LINHAS_PERMISSOES}
            roleAtivo={roleAtivo}
            onRoleSelect={onRoleAtivoChange}
            contagens={contagens}
            modo="single"
          />
        </FiltroBarSecaoSeparada>
      ) : null}

      {aba === "simulador" ? (
        <FiltroBarSecaoSeparada>
          <LinhasPerfis
            linhas={FILTROS_PERFIL_LINHAS_PERMISSOES}
            roleAtivo={roleAtivo}
            onRoleSelect={onRoleAtivoChange}
            contagens={contagens}
            modo="single"
          />
        </FiltroBarSecaoSeparada>
      ) : null}

      {aba === "escopos" ? (
        <FiltroBarSecaoSeparada>
          <div
            role="tablist"
            aria-label="Escopos de acesso"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
              width: "100%",
            }}
            onKeyDown={(e) =>
              onFiltroBarTabsKeyDown(e, ABAS_ESCOPO.map((a) => a.key), onEscopoSubAbaChange, (k) => `tab-escopo-${k}`)
            }
          >
            <span style={rotuloSecaoFiltroStyle(t)}>Perfis</span>
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
        </FiltroBarSecaoSeparada>
      ) : null}
    </div>
  );
}
