import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import {
  Role, PageKey, PermissaoValor, RolePermission,
  UsuarioCompleto, UserScope, Operadora,
} from "../../../types";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const ROLES: { value: Role; label: string }[] = [
  { value: "admin",      label: "Administrador" },
  { value: "gestor",     label: "Gestor" },
  { value: "executivo",  label: "Executivo" },
  { value: "influencer", label: "Influencer" },
  { value: "operador",   label: "Operador" },
  { value: "agencia",    label: "Agência" },
];

const PAGES: { key: PageKey; label: string; secao: string; hasCriar: boolean; hasEditar: boolean; hasExcluir: boolean }[] = [
  { key: "agenda",             label: "Agenda",             secao: "Lives",      hasCriar: true,  hasEditar: true,  hasExcluir: true  },
  { key: "resultados",         label: "Resultados",         secao: "Lives",      hasCriar: false, hasEditar: true,  hasExcluir: false },
  { key: "feedback",           label: "Feedback",           secao: "Lives",      hasCriar: false, hasEditar: true,  hasExcluir: true  },
  { key: "dash_overview",           label: "Overview",           secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_overview_influencer", label: "Overview Influencer", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_conversao",          label: "Conversão",          secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_financeiro",    label: "Financeiro",         secao: "Dashboards",  hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "influencers",        label: "Influencers",        secao: "Operações",  hasCriar: true,  hasEditar: true,  hasExcluir: false },
  { key: "scout",              label: "Scout",              secao: "Operações",  hasCriar: true,  hasEditar: true,  hasExcluir: true },
  { key: "financeiro",         label: "Financeiro",          secao: "Operações",  hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "gestao_links",       label: "Gestão de Links",     secao: "Operações",  hasCriar: false, hasEditar: true,  hasExcluir: false },
  { key: "gestao_usuarios",    label: "Gestão de Usuários", secao: "Plataforma", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "gestao_operadoras",  label: "Gestão de Operadoras", secao: "Plataforma", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "status_tecnico",     label: "Status Técnico",     secao: "Plataforma", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "configuracoes",      label: "Configurações",      secao: "Geral",      hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "ajuda",              label: "Ajuda",              secao: "Geral",      hasCriar: false, hasEditar: false, hasExcluir: false },
];

const ROLES_PERMISSOES: Role[] = ["admin", "gestor", "executivo", "influencer", "operador", "agencia"];

const PERM_OPCOES: { value: PermissaoValor; label: string }[] = [
  { value: "sim",      label: "Sim" },
  { value: "nao",      label: "Não" },
  { value: "proprios", label: "Próprios" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function roleLabel(role: Role) {
  return ROLES.find(r => r.value === role)?.label ?? role;
}

function roleBadgeColor(role: Role): string {
  const map: Record<Role, string> = {
    admin:      "#7c3aed",
    gestor:     "#2563eb",
    executivo:  "#0891b2",
    influencer: "#059669",
    operador:   "#d97706",
    agencia:    "#db2777",
  };
  return map[role] ?? "#6b7280";
}

function escopoBloqueado(role: Role) {
  return role === "admin" || role === "gestor";
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function GestaoUsuarios() {
  const { theme: t } = useApp();
  const perm = usePermission("gestao_usuarios");
  const [aba, setAba] = useState<"usuarios" | "permissoes">("usuarios");

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Gestão de Usuários.
      </div>
    );
  }

  const card: React.CSSProperties = {
    background: t.cardBg, borderRadius: 16, padding: 28,
    border: `1px solid ${t.cardBorder}`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: FONT.title, fontSize: 28, color: t.text, margin: 0 }}>
          🛡️ Gestão de Usuários
        </h1>
        <p style={{ color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
          Gerencie usuários, acessos e permissões da plataforma.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, borderBottom: `2px solid ${t.cardBorder}`, paddingBottom: 0 }}>
        {(["usuarios", "permissoes"] as const).map(a => (
          <button key={a} onClick={() => setAba(a)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: FONT.body, fontSize: 14, fontWeight: 600,
            color: aba === a ? "#7c3aed" : t.textMuted,
            paddingBottom: 12, paddingInline: 16,
            borderBottom: aba === a ? "2px solid #7c3aed" : "2px solid transparent",
            marginBottom: -2, transition: "all 0.2s",
          }}>
            {a === "usuarios" ? "👤 Usuários" : "🔐 Permissões"}
          </button>
        ))}
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
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioCompleto | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [modalDesativar, setModalDesativar] = useState<UsuarioCompleto | null>(null);

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

  const abrirNovo = () => { setEditando(null); setModalOpen(true); };
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
    // Remove duplicados e junta
    return [...new Set(partes)].join(", ");
  };

  const thMuted: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 11, fontWeight: 700,
    color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px",
    padding: "10px 14px", textAlign: "left",
  };
  const td: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 13, color: t.text,
    padding: "12px 14px", borderTop: `1px solid ${t.cardBorder}`,
  };

  const usuariosFiltrados = busca.trim()
    ? usuarios.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(busca.toLowerCase()) ||
          (u.email ?? "").toLowerCase().includes(busca.toLowerCase())
      )
    : usuarios;

  const usuariosPorStatus = usuariosFiltrados.filter((u: UsuarioCompleto) => {
    const ativo = u.ativo !== false;
    if (filtroStatus === "todos") return true;
    if (filtroStatus === "ativos") return ativo;
    return !ativo;
  });

  const desativarOuReativar = async (u: UsuarioCompleto) => {
    const novoAtivo = u.ativo === false;
    const { error } = await supabase.from("profiles").update({ ativo: novoAtivo }).eq("id", u.id);
    if (!error) {
      setModalDesativar(null);
      carregar();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 16px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.bg,
            color: t.text,
            fontSize: 14,
            fontFamily: FONT.body,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["todos", "ativos", "desativados"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltroStatus(f)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: `1px solid ${filtroStatus === f ? "#7c3aed" : t.cardBorder}`,
                  background: filtroStatus === f ? "rgba(124,58,237,0.15)" : "transparent",
                  color: filtroStatus === f ? "#7c3aed" : t.textMuted,
                  fontSize: 13,
                  fontWeight: filtroStatus === f ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                {f === "todos" ? "Todos" : f === "ativos" ? "Ativos" : "Desativados"}
              </button>
            ))}
          </div>
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>
            {usuariosPorStatus.length} usuário{usuariosPorStatus.length !== 1 ? "s" : ""}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={abrirNovo} style={{
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          color: "#fff", border: "none", borderRadius: 10,
          padding: "9px 18px", cursor: "pointer",
          fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
        }}>
          + Novo Usuário
        </button>
      </div>
      </div>

      {loading ? (
        <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Carregando...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {usuariosPorStatus.map((u: UsuarioCompleto) => {
            const escopoTexto = formatarEscopo(u.scopes ?? [], operadoras);
            const ativo = u.ativo !== false;
            return (
              <div
                key={u.id}
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 14,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  opacity: ativo ? 1 : 0.85,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <strong style={{ fontFamily: FONT.body, fontSize: 15, color: t.text }}>{u.name}</strong>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{u.email}</div>
                  </div>
                  <span style={{
                    background: ativo ? "#dcfce7" : "#f3f4f6",
                    color: ativo ? "#166534" : "#6b7280",
                    borderRadius: 6,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: FONT.body,
                  }}>
                    {ativo ? "Ativo" : "Desativado"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{
                    background: roleBadgeColor(u.role as Role) + "22",
                    color: roleBadgeColor(u.role as Role),
                    borderRadius: 6, padding: "3px 10px",
                    fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                  }}>
                    {roleLabel(u.role as Role)}
                  </span>
                  {escopoTexto && (
                    <span style={{ fontSize: 12, color: t.textMuted }}>{escopoTexto}</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button onClick={() => abrirEditar(u)} style={{
                    background: "none", border: `1px solid ${t.cardBorder}`,
                    borderRadius: 7, padding: "6px 14px", cursor: "pointer",
                    fontFamily: FONT.body, fontSize: 12, color: t.text,
                  }}>
                    Editar
                  </button>
                  {ativo ? (
                    <button onClick={() => setModalDesativar(u)} style={{
                      background: "none", border: "1px solid #ef4444",
                      borderRadius: 7, padding: "6px 14px", cursor: "pointer",
                      fontFamily: FONT.body, fontSize: 12, color: "#ef4444",
                    }}>
                      Desativar
                    </button>
                  ) : (
                    <button onClick={() => desativarOuReativar(u)} style={{
                      background: "#22c55e22", border: "1px solid #22c55e",
                      borderRadius: 7, padding: "6px 14px", cursor: "pointer",
                      fontFamily: FONT.body, fontSize: 12, color: "#22c55e", fontWeight: 600,
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

      {modalDesativar && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setModalDesativar(null)}
        >
          <div
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: 24, maxWidth: 400, width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: FONT.body, fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 8 }}>Desativar usuário</div>
            <p style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted, marginBottom: 20 }}>
              O usuário <strong>{modalDesativar.name}</strong> perderá acesso imediato à plataforma. Deseja continuar?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setModalDesativar(null)} style={{
                padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.cardBorder}`,
                background: "transparent", color: t.text, fontSize: 13, cursor: "pointer", fontFamily: FONT.body,
              }}>
                Cancelar
              </button>
              <button onClick={() => desativarOuReativar(modalDesativar)} style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
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

// ─── MODAL DE USUÁRIO ─────────────────────────────────────────────────────────

interface ModalUsuarioProps {
  t: ReturnType<typeof useApp>["theme"];
  editando: UsuarioCompleto | null;
  operadoras: Operadora[];
  onClose: () => void;
  onSalvo: () => void;
}

function ModalUsuario({ t, editando, operadoras, onClose, onSalvo }: ModalUsuarioProps) {
  const [nome, setNome] = useState(editando?.name ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [role, setRole] = useState<Role>(editando?.role ?? "gestor");

  // Escopos independentes
  const [scopeInfluencers, setScopeInfluencers] = useState<string[]>([]);  // UUIDs
  const [scopeOperadoras, setScopeOperadoras] = useState<string[]>([]);    // slugs
  const [scopePares, setScopePares] = useState<string[]>([]);              // "uuid:slug" só para agencia

  const [influencers, setInfluencers] = useState<{ id: string; nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    supabase
      .from("influencer_perfil")
      .select("id, nome_artistico")
      .eq("status", "ativo")
      .order("nome_artistico")
      .then(({ data }) => {
        setInfluencers((data ?? []).map(d => ({ id: d.id, nome: d.nome_artistico })));
      });
  }, []);

  // Pré-preenche ao editar
  useEffect(() => {
    const scopes = editando?.scopes ?? [];
    setScopeInfluencers(scopes.filter(s => s.scope_type === "influencer").map(s => s.scope_ref));
    setScopeOperadoras(scopes.filter(s => s.scope_type === "operadora").map(s => s.scope_ref));
    setScopePares(scopes.filter(s => s.scope_type === "agencia_par").map(s => s.scope_ref));
  }, [editando]);

  // Reset ao trocar role
  useEffect(() => {
    setScopeInfluencers([]);
    setScopeOperadoras([]);
    setScopePares([]);
  }, [role]);

  const toggleItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    val: string
  ) => setList(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const salvar = async () => {
    setErro("");
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    if (!editando && !email.trim()) { setErro("E-mail é obrigatório."); return; }

    // Validações por role
    if (role === "influencer" && scopeOperadoras.length === 0) {
      setErro("Selecione pelo menos uma operadora para o influencer."); return;
    }
    if (role === "operador" && scopeOperadoras.length === 0) {
      setErro("Selecione pelo menos uma operadora para o operador."); return;
    }
    if (role === "agencia" && scopePares.length === 0) {
      setErro("Selecione pelo menos um par influencer+operadora para a agência."); return;
    }

    setSalvando(true);
    try {
      let uid = editando?.id ?? "";

      if (editando) {
        await supabase.from("profiles").update({ name: nome, role }).eq("id", uid);
      } else {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email, email_confirm: true, user_metadata: { name: nome },
        });
        if (authErr || !authData?.user) throw new Error(authErr?.message ?? "Erro ao criar usuário");
        uid = authData.user.id;
        await supabase.from("profiles").insert({ id: uid, name: nome, email, role });
      }

      // Reset e reinsert de escopos
      await supabase.from("user_scopes").delete().eq("user_id", uid);

      if (!escopoBloqueado(role)) {
        const novasLinhas: { user_id: string; scope_type: string; scope_ref: string }[] = [];

        if (role === "agencia") {
          scopePares.forEach(par => novasLinhas.push({ user_id: uid, scope_type: "agencia_par", scope_ref: par }));
        } else {
          // influencer, operador, executivo
          scopeInfluencers.forEach(ref => novasLinhas.push({ user_id: uid, scope_type: "influencer", scope_ref: ref }));
          scopeOperadoras.forEach(ref => novasLinhas.push({ user_id: uid, scope_type: "operadora", scope_ref: ref }));
        }

        if (novasLinhas.length > 0) {
          await supabase.from("user_scopes").insert(novasLinhas);
        }

        // Sincroniza influencer_operadoras se role=influencer
        if (role === "influencer") {
          // Cria registro em influencer_perfil para futura edição pelos agentes
          await supabase.from("influencer_perfil").upsert(
            {
              id: uid,
              nome_artistico: nome,
              nome_completo: nome,
              status: "ativo",
              cache_hora: 0,
            },
            { onConflict: "id", ignoreDuplicates: false }
          );
          if (scopeOperadoras.length > 0) {
            for (const slug of scopeOperadoras) {
              await supabase.from("influencer_operadoras").upsert(
                { influencer_id: uid, operadora_slug: slug, ativo: true },
                { onConflict: "influencer_id,operadora_slug", ignoreDuplicates: true }
              );
            }
          }
        }
      }

      // Se editando e role mudou para influencer, garantir que influencer_perfil existe
      if (editando && role === "influencer") {
        const { data: existe } = await supabase.from("influencer_perfil").select("id").eq("id", uid).single();
        if (!existe) {
          await supabase.from("influencer_perfil").insert({
            id: uid,
            nome_artistico: nome,
            nome_completo: nome,
            status: "ativo",
            cache_hora: 0,
          });
        }
      }

      onSalvo();
      onClose();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  // Estilos
  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 999, padding: 24,
  };
  const modal: React.CSSProperties = {
    background: t.cardBg, borderRadius: 16, padding: 32,
    width: "100%", maxWidth: 560, border: `1px solid ${t.cardBorder}`,
    maxHeight: "90vh", overflowY: "auto",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: FONT.body, fontSize: 12,
    fontWeight: 600, color: t.textMuted, marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "0.8px",
  };
  const input: React.CSSProperties = {
    width: "100%", background: t.bg, border: `1px solid ${t.cardBorder}`,
    borderRadius: 8, padding: "10px 12px", color: t.text,
    fontFamily: FONT.body, fontSize: 14, boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = { ...input, cursor: "pointer" };
  const field: React.CSSProperties = { marginBottom: 18 };

  // Componente reutilizável de multi-seleção
  const MultiSelect = ({
    label, items, selected, onToggle, cor = "#7c3aed", obrigatorio = false,
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
        {obrigatorio && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
        <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6 }}>(multi-seleção)</span>
      </label>
      <div style={{
        border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: 10,
        display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 160, overflowY: "auto",
      }}>
        {items.map(op => {
          const sel = selected.includes(op.value);
          return (
            <button key={op.value} onClick={() => onToggle(op.value)} style={{
              border: `1px solid ${sel ? cor : t.cardBorder}`,
              background: sel ? cor + "22" : "transparent",
              color: sel ? cor : t.text,
              borderRadius: 6, padding: "5px 12px", cursor: "pointer",
              fontFamily: FONT.body, fontSize: 12, fontWeight: sel ? 600 : 400,
            }}>
              {op.label}
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
        <h2 style={{ fontFamily: FONT.title, fontSize: 20, color: t.text, margin: "0 0 24px" }}>
          {editando ? "Editar Usuário" : "Novo Usuário"}
        </h2>

        <div style={field}>
          <label style={labelStyle}>Nome</label>
          <input style={input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
        </div>

        {!editando && (
          <div style={field}>
            <label style={labelStyle}>E-mail</label>
            <input style={input} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
          </div>
        )}

        <div style={field}>
          <label style={labelStyle}>Perfil</label>
          <select style={selectStyle} value={role} onChange={e => setRole(e.target.value as Role)}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {/* ── ESCOPO ── */}
        {bloqueado ? (
          <div style={field}>
            <label style={labelStyle}>Escopo de acesso</label>
            <div style={{
              background: t.bg, border: `1px solid ${t.cardBorder}`, borderRadius: 8,
              padding: "10px 14px", fontFamily: FONT.body, fontSize: 14,
              color: t.textMuted, fontStyle: "italic",
            }}>
              Todos os influencers e operadoras
            </div>
          </div>
        ) : role === "agencia" ? (
          // Agência: pares influencer × operadora
          <MultiSelect
            label="Pares Influencer + Operadora"
            obrigatorio
            cor="#db2777"
            items={influencers.flatMap(inf =>
              operadoras.map(op => ({
                value: `${inf.id}:${op.slug}`,
                label: `${inf.nome} × ${op.nome}`,
              }))
            )}
            selected={scopePares}
            onToggle={v => toggleItem(scopePares, setScopePares, v)}
          />
        ) : role === "influencer" ? (
          // Influencer: só operadoras (ele mesmo é fixo como scope de influencer)
          <MultiSelect
            label="Operadoras atribuídas"
            obrigatorio
            cor="#059669"
            items={operadoras.map(o => ({ value: o.slug, label: o.nome }))}
            selected={scopeOperadoras}
            onToggle={v => toggleItem(scopeOperadoras, setScopeOperadoras, v)}
          />
        ) : (
          // operador, executivo: campos independentes
          <>
            <MultiSelect
              label={`Influencers${role === "operador" ? "" : " (opcional)"}`}
              obrigatorio={false}
              cor="#7c3aed"
              items={influencers.map(i => ({ value: i.id, label: i.nome }))}
              selected={scopeInfluencers}
              onToggle={v => toggleItem(scopeInfluencers, setScopeInfluencers, v)}
            />
            <MultiSelect
              label={`Operadoras${role === "operador" ? "" : " (opcional)"}`}
              obrigatorio={role === "operador"}
              cor="#d97706"
              items={operadoras.map(o => ({ value: o.slug, label: o.nome }))}
              selected={scopeOperadoras}
              onToggle={v => toggleItem(scopeOperadoras, setScopeOperadoras, v)}
            />
          </>
        )}

        {erro && (
          <p style={{ color: "#ef4444", fontFamily: FONT.body, fontSize: 13, marginBottom: 16 }}>{erro}</p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${t.cardBorder}`,
            borderRadius: 8, padding: "9px 18px", cursor: "pointer",
            fontFamily: FONT.body, fontSize: 13, color: t.text,
          }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 20px", cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body, fontSize: 13, fontWeight: 600, opacity: salvando ? 0.7 : 1,
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
  const [perms, setPerms] = useState<Record<string, Partial<RolePermission>>>({});
  const [salvando, setSalvando] = useState(false);
  const [salvoOk, setSalvoOk] = useState(false);

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
    setSalvando(true);
    setSalvoOk(false);
    const rows = PAGES.map(p => ({
      role: roleAtivo, page_key: p.key,
      can_view:    perms[p.key]?.can_view    ?? null,
      can_criar:   p.hasCriar   ? (perms[p.key]?.can_criar   ?? null) : null,
      can_editar:  p.hasEditar  ? (perms[p.key]?.can_editar  ?? null) : null,
      can_excluir: p.hasExcluir ? (perms[p.key]?.can_excluir ?? null) : null,
    }));
    const { error } = await supabase.from("role_permissions").upsert(rows, {
      onConflict: "role,page_key",
      ignoreDuplicates: false,
    });
    setSalvando(false);
    if (error) {
      console.error("[GestaoUsuarios] Erro ao salvar permissões:", error);
      alert(`Erro ao salvar permissões: ${error.message}`);
      return;
    }
    setSalvoOk(true);
    setTimeout(() => setSalvoOk(false), 2500);
    // Recarrega dados para garantir consistência
    supabase.from("role_permissions").select("*").eq("role", roleAtivo).then(({ data }) => {
      const mapa: Record<string, Partial<RolePermission>> = {};
      (data ?? []).forEach(r => { mapa[r.page_key] = r; });
      setPerms(mapa);
    });
  };

  const thStyle: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 11, fontWeight: 700,
    color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px",
    padding: "10px 12px", textAlign: "center",
  };
  const tdStyle: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 13, color: t.text,
    padding: "10px 12px", borderTop: `1px solid ${t.cardBorder}`,
  };
  const secoes = [...new Set(PAGES.map(p => p.secao))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ROLES_PERMISSOES.map(r => (
          <button key={r} onClick={() => setRoleAtivo(r)} style={{
            border: `1px solid ${roleAtivo === r ? roleBadgeColor(r) : t.cardBorder}`,
            background: roleAtivo === r ? roleBadgeColor(r) + "22" : "transparent",
            color: roleAtivo === r ? roleBadgeColor(r) : t.textMuted,
            borderRadius: 8, padding: "7px 16px", cursor: "pointer",
            fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
          }}>
            {roleLabel(r)}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
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
              const pagesDaSec = PAGES.filter(p => p.secao === secao);
              return pagesDaSec.map((page, idx) => (
                <tr key={page.key}>
                  {idx === 0 && (
                    <td rowSpan={pagesDaSec.length} style={{
                      ...tdStyle, fontWeight: 700, fontSize: 11,
                      color: t.textMuted, textTransform: "uppercase",
                      letterSpacing: "1px", verticalAlign: "middle",
                      borderRight: `1px solid ${t.cardBorder}`,
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
                            background: t.bg, border: `1px solid ${t.cardBorder}`,
                            borderRadius: 6, padding: "4px 8px", color: t.text,
                            fontFamily: FONT.body, fontSize: 12, cursor: "pointer", minWidth: 100,
                          }}
                        >
                          <option value="">—</option>
                          {PERM_OPCOES.map(o => (
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

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {salvoOk && <span style={{ color: "#22c55e", fontFamily: FONT.body, fontSize: 13 }}>✓ Permissões salvas com sucesso</span>}
        <button onClick={salvar} disabled={salvando} style={{
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 22px", cursor: salvando ? "not-allowed" : "pointer",
          fontFamily: FONT.body, fontSize: 13, fontWeight: 600, opacity: salvando ? 0.7 : 1,
        }}>
          {salvando ? "Salvando..." : `Salvar permissões — ${roleLabel(roleAtivo)}`}
        </button>
      </div>
    </div>
  );
}
