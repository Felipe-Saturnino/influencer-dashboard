import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { X, Search, AlertCircle, ShieldCheck, Plus, Trash2 } from "lucide-react";
import { GiShield } from "react-icons/gi";
import {
  Role, PageKey, PermissaoValor, RolePermission,
  UsuarioCompleto, UserScope, Operadora,
} from "../../../types";

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── BRAND ───────────────────────────────────────────────────────────────────

const BRAND = {
  roxo:      "#4a2082",
  roxoVivo:  "#7c3aed",
  azul:      "#1e36f8",
  vermelho:  "#e84025",
  ciano:     "#70cae4",
  verde:     "#22c55e",
  amarelo:   "#f59e0b",
  cinza:     "#6b7280",
  gradiente: "linear-gradient(135deg, #4a2082, #1e36f8)",
};

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const ROLES: { value: Role; label: string }[] = [
  { value: "admin",      label: "Administrador" },
  { value: "gestor",     label: "Gestor"        },
  { value: "executivo",  label: "Executivo"     },
  { value: "influencer", label: "Influencer"    },
  { value: "operador",   label: "Operador"      },
  { value: "agencia",    label: "Agência"       },
];

const PAGES: {
  key: PageKey; label: string; secao: string;
  hasCriar: boolean; hasEditar: boolean; hasExcluir: boolean;
}[] = [
  { key: "agenda",                  label: "Agenda",              secao: "Lives",      hasCriar: true,  hasEditar: true,  hasExcluir: true  },
  { key: "resultados",              label: "Resultados",          secao: "Lives",      hasCriar: false, hasEditar: true,  hasExcluir: false },
  { key: "feedback",                label: "Feedback",            secao: "Lives",      hasCriar: false, hasEditar: true,  hasExcluir: true  },
  { key: "dash_overview",           label: "Overview",            secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_overview_influencer",label: "Overview Influencer", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_conversao",          label: "Conversão",           secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_financeiro",         label: "Financeiro",          secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "mesas_spin",              label: "Mesas Spin",          secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_midias_sociais",     label: "Mídias Sociais",      secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "influencers",             label: "Influencers",         secao: "Operações",  hasCriar: true,  hasEditar: true,  hasExcluir: false },
  { key: "scout",                   label: "Scout",               secao: "Operações",  hasCriar: true,  hasEditar: true,  hasExcluir: true  },
  { key: "financeiro",              label: "Financeiro",          secao: "Operações",  hasCriar: false, hasEditar: true,  hasExcluir: false },
  { key: "gestao_links",            label: "Gestão de Links",     secao: "Operações",  hasCriar: false, hasEditar: true,  hasExcluir: false },
  { key: "campanhas",               label: "Campanhas",           secao: "Operações",  hasCriar: true,  hasEditar: true,  hasExcluir: false },
  { key: "gestao_dealers",          label: "Gestão de Dealers",   secao: "Operações",  hasCriar: true,  hasEditar: true,  hasExcluir: true  },
  { key: "gestao_usuarios",         label: "Gestão de Usuários",  secao: "Plataforma", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "gestao_operadoras",       label: "Gestão de Operadoras",secao: "Plataforma", hasCriar: true,  hasEditar: true,  hasExcluir: false },
  { key: "status_tecnico",          label: "Status Técnico",      secao: "Plataforma", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "configuracoes",           label: "Configurações",       secao: "Geral",      hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "ajuda",                   label: "Ajuda",               secao: "Geral",      hasCriar: false, hasEditar: false, hasExcluir: false },
];

const ROLES_PERMISSOES: Role[] = ["admin", "gestor", "executivo", "influencer", "operador", "agencia"];

const PERM_OPCOES: { value: PermissaoValor; label: string }[] = [
  { value: "sim",      label: "Sim"      },
  { value: "nao",      label: "Não"      },
  { value: "proprios", label: "Próprios" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function roleLabel(role: Role) {
  return ROLES.find(r => r.value === role)?.label ?? role;
}

/** Cor temática por perfil — usada em borderLeft, badge e multi-select */
function roleBadgeColor(role: Role): string {
  const map: Record<Role, string> = {
    admin:      BRAND.roxoVivo,
    gestor:     BRAND.azul,
    executivo:  BRAND.ciano,
    influencer: BRAND.verde,
    operador:   BRAND.amarelo,
    agencia:    BRAND.vermelho,
  };
  return map[role] ?? BRAND.cinza;
}

function escopoBloqueado(role: Role) {
  return role === "admin" || role === "gestor";
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function GestaoUsuarios() {
  const { theme: t, user } = useApp();
  const [aba, setAba] = useState<"usuarios" | "permissoes">("usuarios");

  if (user?.role !== "admin") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── HEADER — padrão SectionTitle (idêntico ao Scout) ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: BRAND.roxo, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <GiShield size={14} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Gestão de Usuários
            </h1>
            <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "5px 0 0" }}>
              Gerencie usuários, acessos e permissões da plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* ── ABAS — pill style ── */}
      <div style={{ display: "flex", gap: 8 }}>
        {(["usuarios", "permissoes"] as const).map(a => {
          const ativa = aba === a;
          return (
            <button
              key={a}
              onClick={() => setAba(a)}
              style={{
                background:   ativa ? `${BRAND.roxoVivo}22` : t.inputBg ?? t.bg,
                border:       `1px solid ${ativa ? BRAND.roxoVivo : t.cardBorder}`,
                color:        ativa ? BRAND.roxoVivo : t.textMuted,
                borderRadius: 20,
                padding:      "7px 18px",
                cursor:       "pointer",
                fontFamily:   FONT.body,
                fontSize:     13,
                fontWeight:   ativa ? 700 : 400,
                transition:   "all 0.18s",
              }}
            >
              {a === "usuarios" ? "👤 Usuários" : "🔐 Permissões"}
            </button>
          );
        })}
      </div>

      <div style={card}>
        {aba === "usuarios" ? <AbaUsuarios t={t} /> : <AbaPermissoes t={t} />}
      </div>
    </div>
  );
}

// ─── ABA USUÁRIOS ─────────────────────────────────────────────────────────────

type FiltroStatus = "todos" | "ativos" | "desativados";

function AbaUsuarios({ t }: { t: ReturnType<typeof useApp>["theme"] }) {
  const [usuarios,      setUsuarios]      = useState<UsuarioCompleto[]>([]);
  const [operadoras,    setOperadoras]    = useState<Operadora[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editando,      setEditando]      = useState<UsuarioCompleto | null>(null);
  const [busca,         setBusca]         = useState("");
  const [filtroStatus,  setFiltroStatus]  = useState<FiltroStatus>("todos");
  const [modalDesativar,setModalDesativar]= useState<UsuarioCompleto | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: scopes }, { data: ops }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, role, ativo, created_at").order("created_at", { ascending: true }),
      supabase.from("user_scopes").select("*"),
      supabase.from("operadoras").select("*").order("nome"),
    ]);
    const lista: UsuarioCompleto[] = (profiles ?? []).map(p => ({
      ...p,
      scopes: (scopes ?? []).filter(s => s.user_id === p.id),
    }));
    setUsuarios(lista);
    setOperadoras(ops ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo   = () => { setEditando(null); setModalOpen(true); };
  const abrirEditar = (u: UsuarioCompleto) => { setEditando(u); setModalOpen(true); };

  const formatarEscopo = (scopes: UserScope[], ops: Operadora[]) => {
    if (!scopes || scopes.length === 0) return null;
    const partes = scopes.map(s => {
      if (s.scope_type === "operadora") return ops.find(o => o.slug === s.scope_ref)?.nome ?? s.scope_ref;
      if (s.scope_type === "agencia_par") {
        const [, slug] = s.scope_ref.split(":");
        return ops.find(o => o.slug === slug)?.nome ?? slug;
      }
      return "Influencer";
    });
    return [...new Set(partes)].join(", ");
  };

  const usuariosFiltrados = busca.trim()
    ? usuarios.filter(u =>
        (u.name  ?? "").toLowerCase().includes(busca.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(busca.toLowerCase())
      )
    : usuarios;

  const usuariosPorStatus = usuariosFiltrados.filter((u: UsuarioCompleto) => {
    const ativo = u.ativo !== false;
    if (filtroStatus === "todos")       return true;
    if (filtroStatus === "ativos")      return ativo;
    return !ativo;
  });

  const desativarOuReativar = async (u: UsuarioCompleto) => {
    const novoAtivo = u.ativo === false;
    const { error } = await supabase.from("profiles").update({ ativo: novoAtivo }).eq("id", u.id);
    if (!error) { setModalDesativar(null); carregar(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── BUSCA + FILTROS ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Campo de busca com ícone */}
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            color={t.textMuted}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 16px 10px 36px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.bg,
              color: t.text,
              fontSize: 14,
              fontFamily: FONT.body,
              outline: "none",
              transition: "border-color 0.18s",
            }}
            onFocus={e  => { e.currentTarget.style.borderColor = BRAND.roxoVivo; }}
            onBlur={e   => { e.currentTarget.style.borderColor = t.cardBorder;   }}
          />
        </div>

        {/* Filtros de status + contador + botão novo */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["todos", "ativos", "desativados"] as const).map(f => {
              const ativo = filtroStatus === f;
              return (
                <button
                  key={f}
                  onClick={() => setFiltroStatus(f)}
                  style={{
                    padding:      "6px 14px",
                    borderRadius: 20,
                    border:       `1px solid ${ativo ? BRAND.roxoVivo : t.cardBorder}`,
                    background:   ativo ? `${BRAND.roxoVivo}22` : t.inputBg ?? "transparent",
                    color:        ativo ? BRAND.roxoVivo : t.textMuted,
                    fontSize:     13,
                    fontWeight:   ativo ? 700 : 400,
                    cursor:       "pointer",
                    fontFamily:   FONT.body,
                    transition:   "all 0.18s",
                  }}
                >
                  {f === "todos" ? "Todos" : f === "ativos" ? "Ativos" : "Desativados"}
                </button>
              );
            })}
          </div>

          {/* Badge contador */}
          <span style={{
            background:   t.cardBorder,
            borderRadius: 20,
            padding:      "2px 10px",
            fontSize:     12,
            color:        t.textMuted,
            fontFamily:   FONT.body,
          }}>
            {usuariosPorStatus.length} usuário{usuariosPorStatus.length !== 1 ? "s" : ""}
          </span>

          <div style={{ flex: 1 }} />

          <button onClick={abrirNovo} style={{
            background:   BRAND.gradiente,
            color:        "#fff",
            border:       "none",
            borderRadius: 10,
            padding:      "9px 18px",
            cursor:       "pointer",
            fontFamily:   FONT.body,
            fontSize:     13,
            fontWeight:   600,
          }}>
            + Novo Usuário
          </button>
        </div>
      </div>

      {/* ── GRID DE CARDS ── */}
      {loading ? (
        <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Carregando...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {usuariosPorStatus.map((u: UsuarioCompleto) => {
            const escopoTexto = formatarEscopo(u.scopes ?? [], operadoras);
            const ativo       = u.ativo !== false;
            const corPerfil   = roleBadgeColor(u.role as Role);
            return (
              <div
                key={u.id}
                style={{
                  background:   t.cardBg,
                  border:       `1px solid ${t.cardBorder}`,
                  borderLeft:   `3px solid ${corPerfil}`,
                  borderRadius: 14,
                  padding:      18,
                  display:      "flex",
                  flexDirection:"column",
                  gap:          12,
                  opacity:      ativo ? 1 : 0.75,
                  boxShadow:    "0 4px 20px rgba(0,0,0,0.18)",
                  transition:   "box-shadow 0.18s",
                }}
              >
                {/* Nome + badge Ativo/Desativado */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <strong style={{ fontFamily: FONT.body, fontSize: 15, color: t.text }}>{u.name}</strong>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{u.email}</div>
                  </div>
                  <span style={{
                    background:   ativo ? "#22c55e22" : `${t.cardBorder}`,
                    color:        ativo ? BRAND.verde  : t.textMuted,
                    border:       `1px solid ${ativo ? BRAND.verde : t.cardBorder}`,
                    borderRadius: 20,
                    padding:      "3px 10px",
                    fontSize:     11,
                    fontWeight:   700,
                    fontFamily:   FONT.body,
                    whiteSpace:   "nowrap",
                  }}>
                    {ativo ? "Ativo" : "Desativado"}
                  </span>
                </div>

                {/* Badge de perfil + escopo */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{
                    background:   corPerfil + "22",
                    color:        corPerfil,
                    border:       `1px solid ${corPerfil}`,
                    borderRadius: 20,
                    padding:      "3px 10px",
                    fontSize:     11,
                    fontWeight:   700,
                    fontFamily:   FONT.body,
                    textTransform:"uppercase",
                    letterSpacing:"0.3px",
                  }}>
                    {roleLabel(u.role as Role)}
                  </span>
                  {escopoTexto && (
                    <span style={{ fontSize: 12, color: t.textMuted }}>{escopoTexto}</span>
                  )}
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button onClick={() => abrirEditar(u)} style={{
                    background:   "none",
                    border:       `1px solid ${t.cardBorder}`,
                    borderRadius: 8,
                    padding:      "6px 14px",
                    cursor:       "pointer",
                    fontFamily:   FONT.body,
                    fontSize:     12,
                    color:        t.text,
                    transition:   "border-color 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND.roxoVivo; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = t.cardBorder;   }}
                  >
                    Editar
                  </button>
                  {ativo ? (
                    <button onClick={() => setModalDesativar(u)} style={{
                      background:   "none",
                      border:       `1px solid ${BRAND.vermelho}`,
                      borderRadius: 8,
                      padding:      "6px 14px",
                      cursor:       "pointer",
                      fontFamily:   FONT.body,
                      fontSize:     12,
                      color:        BRAND.vermelho,
                      transition:   "background 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${BRAND.vermelho}18`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                    >
                      Desativar
                    </button>
                  ) : (
                    <button onClick={() => desativarOuReativar(u)} style={{
                      background:   `${BRAND.verde}22`,
                      border:       `1px solid ${BRAND.verde}`,
                      borderRadius: 8,
                      padding:      "6px 14px",
                      cursor:       "pointer",
                      fontFamily:   FONT.body,
                      fontSize:     12,
                      color:        BRAND.verde,
                      fontWeight:   600,
                    }}>
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL CONFIRMAR DESATIVAR ── */}
      {modalDesativar && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setModalDesativar(null)}
        >
          <div
            style={{
              background:   t.cardBg,
              border:       `1px solid ${t.cardBorder}`,
              borderRadius: 20,
              padding:      "28px 32px",
              maxWidth:     400,
              width:        "90%",
              position:     "relative",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Botão fechar */}
            <button
              onClick={() => setModalDesativar(null)}
              style={{
                position:   "absolute",
                top:        14,
                right:      14,
                background: "none",
                border:     "none",
                cursor:     "pointer",
                color:      t.textMuted,
                display:    "flex",
                padding:    4,
              }}
            >
              <X size={18} />
            </button>

            {/* Bloco de erro/aviso */}
            <div style={{
              display:      "flex",
              alignItems:   "flex-start",
              gap:          10,
              background:   `${BRAND.vermelho}18`,
              border:       `1px solid ${BRAND.vermelho}44`,
              borderRadius: 10,
              padding:      "12px 14px",
              marginBottom: 20,
            }}>
              <AlertCircle size={16} color={BRAND.vermelho} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>
                  Desativar usuário
                </div>
                <p style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted, margin: 0 }}>
                  O usuário <strong>{modalDesativar.name}</strong> perderá acesso imediato à plataforma. Deseja continuar?
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setModalDesativar(null)} style={{
                padding:    "8px 18px",
                borderRadius: 8,
                border:     `1px solid ${t.cardBorder}`,
                background: "transparent",
                color:      t.text,
                fontSize:   13,
                cursor:     "pointer",
                fontFamily: FONT.body,
              }}>
                Cancelar
              </button>
              <button onClick={() => desativarOuReativar(modalDesativar)} style={{
                padding:    "8px 18px",
                borderRadius: 8,
                border:     "none",
                background: BRAND.vermelho,
                color:      "#fff",
                fontSize:   13,
                fontWeight: 600,
                cursor:     "pointer",
                fontFamily: FONT.body,
              }}>
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <ModalUsuario
          t={t}
          editando={editando}
          operadoras={operadoras}
          onClose={() => setModalOpen(false)}
          onSalvo={carregar}
        />
      )}
    </div>
  );
}

// ─── PARES AGÊNCIA UI: linhas Influencer × Operadora ──────────────────────────

interface ParesAgenciaUIProps {
  pares: Array<{ influencerId: string; operadoraSlug: string }>;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: "influencerId" | "operadoraSlug", val: string) => void;
  influencers: { id: string; nome: string }[];
  operadoras: Operadora[];
  labelStyle: React.CSSProperties;
  selectStyle: React.CSSProperties;
  field: React.CSSProperties;
  t: ReturnType<typeof useApp>["theme"];
}

function ParesAgenciaUI({
  pares, onAdd, onRemove, onUpdate, influencers, operadoras,
  labelStyle, selectStyle, field, t,
}: ParesAgenciaUIProps) {
  return (
    <div style={field}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={labelStyle}>
          Pares Influencer × Operadora
          <span style={{ color: BRAND.vermelho, marginLeft: 4 }}>*</span>
        </label>
        <button
          type="button"
          onClick={onAdd}
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          6,
            padding:      "6px 12px",
            borderRadius:  8,
            border:       `1px solid ${BRAND.roxoVivo}`,
            background:   `${BRAND.roxoVivo}18`,
            color:        BRAND.roxoVivo,
            fontSize:     12,
            fontWeight:   600,
            cursor:       "pointer",
            fontFamily:   FONT.body,
          }}
        >
          <Plus size={14} /> Adicionar par
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pares.map((par, idx) => (
          <div
            key={idx}
            style={{
              display:       "flex",
              gap:           10,
              alignItems:   "center",
              flexWrap:     "wrap",
            }}
          >
            <select
              style={{ ...selectStyle, flex: 1, minWidth: 140 }}
              value={par.influencerId}
              onChange={e => onUpdate(idx, "influencerId", e.target.value)}
            >
              <option value="">Selecione o influencer</option>
              {[...influencers].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(i => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
            <span style={{ color: t.textMuted, fontSize: 14 }}>×</span>
            <select
              style={{ ...selectStyle, flex: 1, minWidth: 140 }}
              value={par.operadoraSlug}
              onChange={e => onUpdate(idx, "operadoraSlug", e.target.value)}
            >
              <option value="">Selecione a operadora</option>
              {[...operadoras].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(op => (
                <option key={op.slug} value={op.slug}>{op.nome}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              style={{
                display:    "flex",
                alignItems: "center",
                padding:    8,
                border:     "none",
                background: "none",
                color:      t.textMuted,
                cursor:     "pointer",
                borderRadius: 6,
              }}
              title="Remover par"
              onMouseEnter={e => { e.currentTarget.style.color = BRAND.vermelho; e.currentTarget.style.background = `${BRAND.vermelho}18`; }}
              onMouseLeave={e => { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = "none"; }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 6 }}>
        {pares.filter(p => p.influencerId && p.operadoraSlug).length} par{pares.filter(p => p.influencerId && p.operadoraSlug).length !== 1 ? "es" : ""} definido{pares.filter(p => p.influencerId && p.operadoraSlug).length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ─── MODAL DE USUÁRIO ─────────────────────────────────────────────────────────

interface ModalUsuarioProps {
  t: ReturnType<typeof useApp>["theme"];
  editando: UsuarioCompleto | null;
  operadoras: Operadora[];
  onClose: () => void;
  onSalvo: () => void;
}

function ModalUsuario({ t, editando, operadoras, onClose, onSalvo }: ModalUsuarioProps) {
  const [nome,             setNome]             = useState(editando?.name  ?? "");
  const [email,            setEmail]            = useState(editando?.email ?? "");
  const [role,             setRole]             = useState<Role>(editando?.role ?? "gestor");
  const [scopeInfluencers, setScopeInfluencers] = useState<string[]>([]);
  const [scopeOperadoras,  setScopeOperadoras]  = useState<string[]>([]);
  const [scopePares,       setScopePares]       = useState<string[]>([]);
  const [paresAgencia,     setParesAgencia]     = useState<Array<{ influencerId: string; operadoraSlug: string }>>([]);
  const [influencers,      setInfluencers]      = useState<{ id: string; nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro,             setErro]             = useState("");

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("role", "influencer")
        .order("name");
      if (!profiles?.length) {
        setInfluencers([]);
        return;
      }
      const ids = profiles.map((p: { id: string }) => p.id);
      const { data: perfis } = await supabase
        .from("influencer_perfil")
        .select("id, nome_artistico")
        .in("id", ids);
      const perfisMap = new Map((perfis ?? []).map((p: { id: string; nome_artistico: string }) => [p.id, p.nome_artistico]));
      setInfluencers(profiles.map((p: { id: string; name?: string; email?: string }) => ({
        id: p.id,
        nome: perfisMap.get(p.id) ?? p.name ?? p.email ?? p.id,
      })));
    })();
  }, []);

  useEffect(() => {
    const scopes = editando?.scopes ?? [];
    setScopeInfluencers(scopes.filter(s => s.scope_type === "influencer").map(s => s.scope_ref));
    setScopeOperadoras(scopes.filter(s => s.scope_type === "operadora").map(s => s.scope_ref));
    setScopePares(scopes.filter(s => s.scope_type === "agencia_par").map(s => s.scope_ref));
  }, [editando]);

  useEffect(() => {
    setScopeInfluencers([]);
    setScopeOperadoras([]);
    setScopePares([]);
  }, [role]);

  // Pares Agência: sync ao carregar editando (agência) ou ao mudar role para agência
  useEffect(() => {
    if (role !== "agencia") return;
    const scopes = editando?.scopes ?? [];
    const agenciaPars = scopes.filter((s: { scope_type: string }) => s.scope_type === "agencia_par");
    if (agenciaPars.length > 0) {
      const parsed = agenciaPars.map((s: { scope_ref: string }) => {
        const [inf, op] = (s.scope_ref || "").split(":");
        return { influencerId: inf ?? "", operadoraSlug: op ?? "" };
      });
      setParesAgencia(parsed);
    } else {
      setParesAgencia([{ influencerId: "", operadoraSlug: "" }]);
    }
  }, [role, editando?.id]);

  const toggleItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    val: string
  ) => setList(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const salvar = async () => {
    setErro("");
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    if (!editando && !email.trim()) { setErro("E-mail é obrigatório."); return; }
    if (role === "influencer" && scopeOperadoras.length === 0) {
      setErro("Selecione pelo menos uma operadora para o influencer."); return;
    }
    if (role === "operador" && scopeOperadoras.length === 0) {
      setErro("Selecione pelo menos uma operadora para o operador."); return;
    }
    const paresValidos = role === "agencia"
      ? paresAgencia.filter(p => p.influencerId && p.operadoraSlug)
      : [];
    if (role === "agencia" && paresValidos.length === 0) {
      setErro("Adicione pelo menos um par influencer + operadora."); return;
    }
    setSalvando(true);
    try {
      let uid = editando?.id ?? "";
      const { data: { session } } = await supabase.auth.getSession();
      const scopeParesParaApi = role === "agencia"
        ? paresAgencia.filter(p => p.influencerId && p.operadoraSlug).map(p => `${p.influencerId}:${p.operadoraSlug}`)
        : scopePares;
      const scopeInfluencersArr = Array.isArray(scopeInfluencers) ? scopeInfluencers : [];
      const scopeOperadorasArr = Array.isArray(scopeOperadoras) ? scopeOperadoras : [];

      if (editando) {
        const res = await fetch("/api/atualizar-perfil", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({ userId: uid, name: nome.trim(), role, scopeInfluencers: scopeInfluencersArr, scopeOperadoras: scopeOperadorasArr, scopePares: scopeParesParaApi }),
        });
        const fnData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((fnData as any)?.error ?? `Erro ${res.status}`);
        if ((fnData as any)?.error) throw new Error((fnData as any).error);
      } else {
        const loginUrl = typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch("/api/criar-usuario", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({ email: email.trim().toLowerCase(), nome: nome.trim(), role, scopeInfluencers: scopeInfluencersArr, scopeOperadoras: scopeOperadorasArr, scopePares: scopeParesParaApi, loginUrl }),
        });
        const fnData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((fnData as any)?.error ?? `Erro ${res.status}`);
        if ((fnData as any)?.error) throw new Error((fnData as any).error);
        uid = (fnData as any)?.userId ?? "";
        if (!uid) throw new Error("Usuário criado mas ID não retornado");
      }
      onSalvo(); onClose();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  // ── ESTILOS DO MODAL ──
  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 999, padding: 24,
  };
  const modal: React.CSSProperties = {
    background:  t.cardBg,
    borderRadius: 20,
    padding:     "28px 32px",
    width:       "100%",
    maxWidth:    560,
    border:      `1px solid ${t.cardBorder}`,
    maxHeight:   "90vh",
    overflowY:   "auto",
    position:    "relative",
  };
  const labelStyle: React.CSSProperties = {
    display:        "block",
    fontFamily:     FONT.body,
    fontSize:       11,
    fontWeight:     700,
    color:          t.textMuted,
    marginBottom:   6,
    textTransform:  "uppercase",
    letterSpacing:  "0.8px",
  };
  const inputStyle: React.CSSProperties = {
    width:       "100%",
    background:  t.bg,
    border:      `1px solid ${t.cardBorder}`,
    borderRadius: 8,
    padding:     "10px 12px",
    color:       t.text,
    fontFamily:  FONT.body,
    fontSize:    14,
    boxSizing:   "border-box",
    outline:     "none",
    transition:  "border-color 0.18s",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const field: React.CSSProperties = { marginBottom: 18 };

  // ── PARES AGÊNCIA: Influencer × Operadora (linhas dinâmicas) ──
  const addParAgencia = () =>
    setParesAgencia(prev => [...prev, { influencerId: "", operadoraSlug: "" }]);
  const removeParAgencia = (idx: number) =>
    setParesAgencia(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ influencerId: "", operadoraSlug: "" }]);
  const updateParAgencia = (idx: number, field: "influencerId" | "operadoraSlug", val: string) =>
    setParesAgencia(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));

  // ── MULTI-SELECT COMPONENT ──
  const MultiSelect = ({
    label, items, selected, onToggle, cor = BRAND.roxoVivo, obrigatorio = false,
  }: {
    label: string;
    items: { value: string; label: string }[];
    selected: string[];
    onToggle: (v: string) => void;
    cor?: string;
    obrigatorio?: boolean;
  }) => (
    <div style={field}>
      <label style={labelStyle}>
        {label}
        {obrigatorio && <span style={{ color: BRAND.vermelho, marginLeft: 4 }}>*</span>}
        <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6 }}>(multi-seleção)</span>
      </label>
      <div style={{
        border:     `1px solid ${t.cardBorder}`,
        borderRadius: 8,
        padding:    10,
        display:    "flex",
        flexWrap:   "wrap",
        gap:        8,
        maxHeight:  160,
        overflowY:  "auto",
        background: t.bg,
      }}>
        {items.map(op => {
          const sel = selected.includes(op.value);
          return (
            <button
              key={op.value}
              onClick={() => onToggle(op.value)}
              style={{
                border:      `1px solid ${sel ? cor : t.cardBorder}`,
                background:  sel ? cor + "22" : "transparent",
                color:       sel ? cor : t.text,
                borderRadius: 20,
                padding:     "5px 12px",
                cursor:      "pointer",
                fontFamily:  FONT.body,
                fontSize:    12,
                fontWeight:  sel ? 700 : 400,
                transition:  "all 0.15s",
                display:     "flex",
                alignItems:  "center",
                gap:         sel ? 5 : 0,
              }}
            >
              {op.label}
              {sel && <X size={10} style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 4 }}>
          {selected.length} selecionado{selected.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );

  const bloqueado = escopoBloqueado(role);

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>

        {/* Botão fechar */}
        <button
          onClick={onClose}
          style={{
            position:   "absolute",
            top:        16,
            right:      16,
            background: "none",
            border:     "none",
            cursor:     "pointer",
            color:      t.textMuted,
            display:    "flex",
            padding:    4,
          }}
        >
          <X size={18} />
        </button>

        {/* Título do modal */}
        <h2 style={{
          fontFamily:    FONT_TITLE,
          fontSize:      18,
          fontWeight:    800,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color:         t.text,
          margin:        "0 0 24px",
        }}>
          {editando ? "Editar Usuário" : "Novo Usuário"}
        </h2>

        <div style={field}>
          <label style={labelStyle}>Nome</label>
          <input
            style={inputStyle}
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome completo"
            onFocus={e  => { e.currentTarget.style.borderColor = BRAND.roxoVivo; }}
            onBlur={e   => { e.currentTarget.style.borderColor = t.cardBorder;   }}
          />
        </div>

        {!editando && (
          <div style={field}>
            <label style={labelStyle}>E-mail</label>
            <input
              style={inputStyle}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              type="email"
              onFocus={e  => { e.currentTarget.style.borderColor = BRAND.roxoVivo; }}
              onBlur={e   => { e.currentTarget.style.borderColor = t.cardBorder;   }}
            />
          </div>
        )}

        <div style={field}>
          <label style={labelStyle}>Perfil</label>
          <select
            style={selectStyle}
            value={role}
            onChange={e => setRole(e.target.value as Role)}
          >
            {[...ROLES].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {/* ── ESCOPO ── */}
        {bloqueado ? (
          <div style={field}>
            <label style={labelStyle}>Escopo de acesso</label>
            <div style={{
              background:  t.bg,
              border:      `1px solid ${t.cardBorder}`,
              borderRadius: 8,
              padding:     "10px 14px",
              fontFamily:  FONT.body,
              fontSize:    14,
              color:       t.textMuted,
              fontStyle:   "italic",
            }}>
              Todos os influencers e operadoras
            </div>
          </div>
        ) : role === "agencia" ? (
          <ParesAgenciaUI
            pares={paresAgencia}
            onAdd={addParAgencia}
            onRemove={removeParAgencia}
            onUpdate={updateParAgencia}
            influencers={influencers}
            operadoras={operadoras}
            labelStyle={labelStyle}
            selectStyle={selectStyle}
            field={field}
            t={t}
          />
        ) : role === "influencer" ? (
          <MultiSelect
            label="Operadoras atribuídas"
            obrigatorio
            cor={roleBadgeColor("influencer")}
            items={operadoras.map(o => ({ value: o.slug, label: o.nome }))}
            selected={scopeOperadoras}
            onToggle={v => toggleItem(scopeOperadoras, setScopeOperadoras, v)}
          />
        ) : (
          <>
            {(role !== "executivo" && role !== "operador") && (
              <MultiSelect
                label={`Influencers${role === "operador" ? "" : " (opcional)"}`}
                obrigatorio={false}
                cor={roleBadgeColor("operador")}
                items={influencers.map(i => ({ value: i.id, label: i.nome }))}
                selected={scopeInfluencers}
                onToggle={v => toggleItem(scopeInfluencers, setScopeInfluencers, v)}
              />
            )}
            <MultiSelect
              label={`Operadoras${role === "operador" ? "" : " (opcional)"}`}
              obrigatorio={role === "operador"}
              cor={roleBadgeColor("operador")}
              items={operadoras.map(o => ({ value: o.slug, label: o.nome }))}
              selected={scopeOperadoras}
              onToggle={v => toggleItem(scopeOperadoras, setScopeOperadoras, v)}
            />
          </>
        )}

        {/* Erro */}
        {erro && (
          <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            background:   `${BRAND.vermelho}18`,
            border:       `1px solid ${BRAND.vermelho}44`,
            borderRadius: 8,
            padding:      "10px 12px",
            marginBottom: 16,
          }}>
            <AlertCircle size={14} color={BRAND.vermelho} style={{ flexShrink: 0 }} />
            <span style={{ color: BRAND.vermelho, fontFamily: FONT.body, fontSize: 13 }}>{erro}</span>
          </div>
        )}

        {/* Botões de ação */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background:   "none",
            border:       `1px solid ${t.cardBorder}`,
            borderRadius: 8,
            padding:      "9px 18px",
            cursor:       "pointer",
            fontFamily:   FONT.body,
            fontSize:     13,
            color:        t.text,
          }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} style={{
            background:   salvando ? BRAND.cinza : BRAND.gradiente,
            color:        "#fff",
            border:       "none",
            borderRadius: 8,
            padding:      "9px 20px",
            cursor:       salvando ? "not-allowed" : "pointer",
            fontFamily:   FONT.body,
            fontSize:     13,
            fontWeight:   600,
            opacity:      salvando ? 0.7 : 1,
            transition:   "opacity 0.15s",
          }}>
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar usuário"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ABA PERMISSÕES ───────────────────────────────────────────────────────────

function AbaPermissoes({ t }: { t: ReturnType<typeof useApp>["theme"] }) {
  const [roleAtivo, setRoleAtivo] = useState<Role>("gestor");
  const [perms,     setPerms]     = useState<Record<string, Partial<RolePermission>>>({});
  const [salvando,  setSalvando]  = useState(false);
  const [salvoOk,   setSalvoOk]   = useState(false);

  useEffect(() => {
    supabase.from("role_permissions").select("*").eq("role", roleAtivo).then(({ data }) => {
      const mapa: Record<string, Partial<RolePermission>> = {};
      (data ?? []).forEach(r => { mapa[r.page_key] = r; });
      setPerms(mapa);
    });
  }, [roleAtivo]);

  const setPerm = (pageKey: string, campo: keyof RolePermission, valor: PermissaoValor) => {
    setPerms(prev => ({
      ...prev,
      [pageKey]: { ...prev[pageKey], role: roleAtivo, page_key: pageKey as PageKey, [campo]: valor },
    }));
  };

  const salvar = async () => {
    setSalvando(true); setSalvoOk(false);
    const rows = PAGES.map(p => ({
      role: roleAtivo, page_key: p.key,
      can_view:    perms[p.key]?.can_view    ?? null,
      can_criar:   p.hasCriar   ? (perms[p.key]?.can_criar   ?? null) : null,
      can_editar:  p.hasEditar  ? (perms[p.key]?.can_editar  ?? null) : null,
      can_excluir: p.hasExcluir ? (perms[p.key]?.can_excluir ?? null) : null,
    }));
    const { error } = await supabase.from("role_permissions").upsert(rows, {
      onConflict: "role,page_key", ignoreDuplicates: false,
    });
    setSalvando(false);
    if (error) { console.error("[GestaoUsuarios] Erro ao salvar permissões:", error); alert(`Erro ao salvar permissões: ${error.message}`); return; }
    setSalvoOk(true);
    setTimeout(() => setSalvoOk(false), 2500);
    supabase.from("role_permissions").select("*").eq("role", roleAtivo).then(({ data }) => {
      const mapa: Record<string, Partial<RolePermission>> = {};
      (data ?? []).forEach(r => { mapa[r.page_key] = r; });
      setPerms(mapa);
    });
  };

  const thStyle: React.CSSProperties = {
    fontFamily:    FONT.body,
    fontSize:      11,
    fontWeight:    700,
    color:         t.textMuted,
    textTransform: "uppercase",
    letterSpacing: "1px",
    padding:       "12px 14px",
    textAlign:     "center",
    background:    "rgba(74,32,130,0.10)",
  };
  const tdStyle: React.CSSProperties = {
    fontFamily: FONT.body,
    fontSize:   13,
    color:      t.text,
    padding:    "10px 14px",
    borderTop:  `1px solid ${t.cardBorder}`,
  };
  const secoes = [...new Set(PAGES.map(p => p.secao))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── ABAS DE PERFIL — pill style ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ROLES_PERMISSOES.map(r => {
          const ativo = roleAtivo === r;
          const cor   = roleBadgeColor(r);
          return (
            <button key={r} onClick={() => setRoleAtivo(r)} style={{
              border:      `1px solid ${ativo ? cor : t.cardBorder}`,
              background:  ativo ? cor + "22" : t.inputBg ?? "transparent",
              color:       ativo ? cor : t.textMuted,
              borderRadius: 20,
              padding:     "7px 16px",
              cursor:      "pointer",
              fontFamily:  FONT.body,
              fontSize:    13,
              fontWeight:  ativo ? 700 : 400,
              transition:  "all 0.18s",
            }}>
              {roleLabel(r)}
            </button>
          );
        })}
      </div>

      {/* ── TABELA DE PERMISSÕES ── */}
      <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${t.cardBorder}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Seção</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Página</th>
              <th style={thStyle}>Ver</th>
              <th style={thStyle}>Criar</th>
              <th style={thStyle}>Editar</th>
              <th style={thStyle}>Excluir</th>
            </tr>
          </thead>
          <tbody>
            {secoes.map(secao => {
              const pagesDaSec = PAGES.filter(p => p.secao === secao).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
              return pagesDaSec.map((page, idx) => (
                <tr
                  key={page.key}
                  style={{ background: idx % 2 !== 0 ? "rgba(74,32,130,0.06)" : "transparent" }}
                >
                  {idx === 0 && (
                    <td rowSpan={pagesDaSec.length} style={{
                      ...tdStyle,
                      fontWeight:    700,
                      fontSize:      11,
                      color:         t.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      verticalAlign: "middle",
                      borderRight:   `1px solid ${t.cardBorder}`,
                      borderLeft:    `3px solid ${BRAND.roxo}`,
                      background:    "rgba(74,32,130,0.10)",
                      paddingLeft:   12,
                    }}>
                      {secao}
                    </td>
                  )}
                  <td style={tdStyle}>{page.label}</td>
                  {(["can_view", "can_criar", "can_editar", "can_excluir"] as const).map(campo => {
                    const temAcao =
                      campo === "can_view"    ? true :
                      campo === "can_criar"   ? page.hasCriar :
                      campo === "can_editar"  ? page.hasEditar :
                      page.hasExcluir;

                    if (!temAcao) return (
                      <td key={campo} style={{ ...tdStyle, textAlign: "center", color: t.textMuted, opacity: 0.3 }}>—</td>
                    );

                    const val = (perms[page.key]?.[campo] as PermissaoValor) ?? null;
                    return (
                      <td key={campo} style={{ ...tdStyle, textAlign: "center" }}>
                        <select
                          value={val ?? ""}
                          onChange={e => setPerm(page.key, campo, (e.target.value as PermissaoValor) || null)}
                          style={{
                            background:   t.bg,
                            border:       `1px solid ${t.cardBorder}`,
                            borderRadius: 6,
                            padding:      "4px 8px",
                            color:        t.text,
                            fontFamily:   FONT.body,
                            fontSize:     12,
                            cursor:       "pointer",
                            minWidth:     100,
                          }}
                        >
                          <option value="">—</option>
                          {[...PERM_OPCOES].sort((a, b) => (a.label ?? "").localeCompare(b.label ?? "", "pt-BR")).map(o => (
                            <option key={o.value} value={o.value ?? ""}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {/* ── RODAPÉ — salvar ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {salvoOk && (
          <span style={{
            display:    "flex",
            alignItems: "center",
            gap:        6,
            color:      BRAND.verde,
            fontFamily: FONT.body,
            fontSize:   13,
          }}>
            <ShieldCheck size={14} />
            Permissões salvas com sucesso
          </span>
        )}
        <button onClick={salvar} disabled={salvando} style={{
          background:   salvando ? BRAND.cinza : BRAND.gradiente,
          color:        "#fff",
          border:       "none",
          borderRadius: 10,
          padding:      "10px 22px",
          cursor:       salvando ? "not-allowed" : "pointer",
          fontFamily:   FONT.body,
          fontSize:     13,
          fontWeight:   600,
          opacity:      salvando ? 0.7 : 1,
          transition:   "opacity 0.15s",
        }}>
          {salvando ? "Salvando..." : `Salvar permissões — ${roleLabel(roleAtivo)}`}
        </button>
      </div>
    </div>
  );
}
