import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import {
  Role, PageKey, PermissaoValor, RolePermission,
  UsuarioCompleto, UserScope, ScopeType,
} from "../../../types";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const ROLES: { value: Role; label: string }[] = [
  { value: "admin",      label: "Administrador" },
  { value: "gestor",     label: "Gestor" },
  { value: "executivo",  label: "Executivo" },
  { value: "influencer", label: "Influencer" },
  { value: "operador",   label: "Operador" },
  { value: "agencia",    label: "Agência" },           // ✅ adicionado
];

const OPERADORAS = [
  { value: "blaze",        label: "Blaze" },
  { value: "bet_nacional", label: "Bet Nacional" },
  { value: "casa_apostas", label: "Casa de Apostas" },
];

const PAGES: { key: PageKey; label: string; secao: string; hasCriar: boolean; hasEditar: boolean; hasExcluir: boolean }[] = [
  { key: "agenda",          label: "Agenda",          secao: "Lives",      hasCriar: true,  hasEditar: true,  hasExcluir: true  },
  { key: "resultados",      label: "Resultados",      secao: "Lives",      hasCriar: false, hasEditar: true,  hasExcluir: false },
  { key: "feedback",        label: "Feedback",        secao: "Lives",      hasCriar: false, hasEditar: true,  hasExcluir: false },
  { key: "dash_overview",   label: "Overview",        secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_conversao",  label: "Conversão",       secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_financeiro", label: "Financeiro",      secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "influencers",     label: "Influencers",     secao: "Operações",  hasCriar: true,  hasEditar: true,  hasExcluir: false },
  { key: "financeiro",      label: "Financeiro",      secao: "Operações",  hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "gestao_links",    label: "Gestão de Links", secao: "Operações",  hasCriar: false, hasEditar: true,  hasExcluir: false },
  { key: "configuracoes",   label: "Configurações",   secao: "Geral",      hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "ajuda",           label: "Ajuda",           secao: "Geral",      hasCriar: false, hasEditar: false, hasExcluir: false },
];

const ROLES_EDITAVEIS: Role[] = ["gestor", "executivo", "influencer", "operador", "agencia"]; // ✅ adicionado

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
    agencia:    "#db2777",                               // ✅ adicionado
  };
  return map[role] ?? "#6b7280";
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function GestaoUsuarios() {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<"usuarios" | "permissoes">("usuarios");

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

function AbaUsuarios({ t }: { t: ReturnType<typeof useApp>["theme"] }) {
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioCompleto | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at")
      .order("created_at", { ascending: true });

    const { data: authUsers } = await supabase.auth.admin
      ? { data: null } : { data: null };
    void authUsers;

    const { data: scopes } = await supabase
      .from("user_scopes")
      .select("*");

    const lista: UsuarioCompleto[] = (profiles ?? []).map(p => ({
      ...p,
      scopes: (scopes ?? []).filter(s => s.user_id === p.id),
    }));

    setUsuarios(lista);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setEditando(null); setModalOpen(true); };
  const abrirEditar = (u: UsuarioCompleto) => { setEditando(u); setModalOpen(true); };

  const thMuted: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 11, fontWeight: 700,
    color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px",
    padding: "10px 14px", textAlign: "left",
  };
  const td: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 13, color: t.text,
    padding: "12px 14px", borderTop: `1px solid ${t.cardBorder}`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>
          {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} cadastrado{usuarios.length !== 1 ? "s" : ""}
        </span>
        <button onClick={abrirNovo} style={{
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          color: "#fff", border: "none", borderRadius: 10,
          padding: "9px 18px", cursor: "pointer",
          fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
        }}>
          + Novo Usuário
        </button>
      </div>

      {loading ? (
        <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Carregando...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Nome", "E-mail", "Perfil", "Escopo", "Ações"].map(h => (
                  <th key={h} style={thMuted}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td style={td}><strong>{u.name}</strong></td>
                  <td style={{ ...td, color: t.textMuted }}>{u.email}</td>
                  <td style={td}>
                    <span style={{
                      background: roleBadgeColor(u.role as Role) + "22",
                      color: roleBadgeColor(u.role as Role),
                      borderRadius: 6, padding: "3px 10px",
                      fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                    }}>
                      {roleLabel(u.role as Role)}
                    </span>
                  </td>
                  <td style={{ ...td, color: t.textMuted, fontSize: 12 }}>
                    {u.scopes && u.scopes.length > 0
                      ? u.scopes.map(s => {
                          if (s.scope_type === "operadora") {
                            return OPERADORAS.find(o => o.value === s.scope_ref)?.label ?? s.scope_ref;
                          }
                          return s.scope_ref;
                        }).join(", ")
                      : <span style={{ color: t.textMuted, opacity: 0.5 }}>—</span>
                    }
                  </td>
                  <td style={td}>
                    <button onClick={() => abrirEditar(u)} style={{
                      background: "none", border: `1px solid ${t.cardBorder}`,
                      borderRadius: 7, padding: "5px 12px", cursor: "pointer",
                      fontFamily: FONT.body, fontSize: 12, color: t.text,
                    }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ModalUsuario
          t={t}
          editando={editando}
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
  onClose: () => void;
  onSalvo: () => void;
}

function ModalUsuario({ t, editando, onClose, onSalvo }: ModalUsuarioProps) {
  const [nome, setNome] = useState(editando?.name ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [role, setRole] = useState<Role>(editando?.role ?? "gestor");
  const [scopeType, setScopeType] = useState<ScopeType | "">("");
  const [scopeRefs, setScopeRefs] = useState<string[]>([]);
  const [influencers, setInfluencers] = useState<{ id: string; nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const precisaEscopo = role === "influencer" || role === "operador";
  const escopoOpcional = role === "gestor" || role === "executivo" || role === "agencia"; // ✅ agencia adicionado

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

  useEffect(() => {
    if (editando?.scopes && editando.scopes.length > 0) {
      setScopeType(editando.scopes[0].scope_type);
      setScopeRefs(editando.scopes.map(s => s.scope_ref));
    }
  }, [editando]);

  useEffect(() => {
    setScopeType("");
    setScopeRefs([]);
  }, [role]);

  const toggleScopeRef = (ref: string) => {
    setScopeRefs(prev =>
      prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]
    );
  };

  const salvar = async () => {
    setErro("");
    if (!nome.trim() || !email.trim()) { setErro("Nome e e-mail são obrigatórios."); return; }
    if (precisaEscopo && (!scopeType || scopeRefs.length === 0)) {
      setErro("Selecione o tipo e pelo menos um escopo para este perfil."); return;
    }

    setSalvando(true);
    try {
      if (editando) {
        await supabase.from("profiles").update({ name: nome, role }).eq("id", editando.id);
        await supabase.from("user_scopes").delete().eq("user_id", editando.id);
        if (scopeType && scopeRefs.length > 0) {
          await supabase.from("user_scopes").insert(
            scopeRefs.map(ref => ({ user_id: editando.id, scope_type: scopeType, scope_ref: ref }))
          );
        }
      } else {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { name: nome },
        });
        if (authErr || !authData?.user) throw new Error(authErr?.message ?? "Erro ao criar usuário");

        const uid = authData.user.id;
        await supabase.from("profiles").insert({ id: uid, name: nome, email, role });
        if (scopeType && scopeRefs.length > 0) {
          await supabase.from("user_scopes").insert(
            scopeRefs.map(ref => ({ user_id: uid, scope_type: scopeType, scope_ref: ref }))
          );
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

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 999, padding: 24,
  };
  const modal: React.CSSProperties = {
    background: t.cardBg, borderRadius: 16, padding: 32,
    width: "100%", maxWidth: 480, border: `1px solid ${t.cardBorder}`,
    maxHeight: "90vh", overflowY: "auto",
  };
  const label: React.CSSProperties = {
    display: "block", fontFamily: FONT.body, fontSize: 12,
    fontWeight: 600, color: t.textMuted, marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "0.8px",
  };
  const input: React.CSSProperties = {
    width: "100%", background: t.bg, border: `1px solid ${t.cardBorder}`,
    borderRadius: 8, padding: "10px 12px", color: t.text,
    fontFamily: FONT.body, fontSize: 14, boxSizing: "border-box",
  };
  const select: React.CSSProperties = { ...input, cursor: "pointer" };
  const field: React.CSSProperties = { marginBottom: 18 };

  const opcoesScopeRef = scopeType === "operadora"
    ? OPERADORAS
    : influencers.map(i => ({ value: i.id, label: i.nome }));

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <h2 style={{ fontFamily: FONT.title, fontSize: 20, color: t.text, margin: "0 0 24px" }}>
          {editando ? "Editar Usuário" : "Novo Usuário"}
        </h2>

        <div style={field}>
          <label style={label}>Nome</label>
          <input style={input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
        </div>

        {!editando && (
          <div style={field}>
            <label style={label}>E-mail</label>
            <input style={input} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
          </div>
        )}

        <div style={field}>
          <label style={label}>Perfil</label>
          <select style={select} value={role} onChange={e => setRole(e.target.value as Role)}>
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {(precisaEscopo || escopoOpcional) && (
          <>
            <div style={field}>
              <label style={label}>
                Tipo de Escopo {escopoOpcional && <span style={{ opacity: 0.5, fontWeight: 400 }}>(opcional)</span>}
              </label>
              <select style={select} value={scopeType} onChange={e => { setScopeType(e.target.value as ScopeType | ""); setScopeRefs([]); }}>
                <option value="">Sem restrição</option>
                {(role === "influencer"
                  ? [{ value: "influencer", label: "Influencer" }]
                  : role === "operador"
                  ? [{ value: "operadora", label: "Operadora" }]
                  : role === "agencia"                                    // ✅ agencia: só par
                  ? [{ value: "agencia_par", label: "Par Influencer + Operadora" }]
                  : [
                    { value: "influencer", label: "Influencer" },
                    { value: "operadora",  label: "Operadora" },
                  ]
                ).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {scopeType && (
              <div style={field}>
                <label style={label}>
                  {scopeType === "operadora" ? "Operadoras" :
                   scopeType === "agencia_par" ? "Pares Influencer + Operadora" :
                   "Influencers"}
                  <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 4 }}>(multi-seleção)</span>
                </label>
                <div style={{
                  border: `1px solid ${t.cardBorder}`, borderRadius: 8,
                  padding: 10, display: "flex", flexWrap: "wrap", gap: 8,
                }}>
                  {scopeType === "agencia_par"
                    // Pares: cada influencer × cada operadora
                    ? influencers.flatMap(inf =>
                        OPERADORAS.map(op => {
                          const pairVal = `${inf.id}:${op.value}`;
                          const sel = scopeRefs.includes(pairVal);
                          return (
                            <button key={pairVal} onClick={() => toggleScopeRef(pairVal)} style={{
                              border: `1px solid ${sel ? "#db2777" : t.cardBorder}`,
                              background: sel ? "#db277722" : "transparent",
                              color: sel ? "#db2777" : t.text,
                              borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                              fontFamily: FONT.body, fontSize: 12, fontWeight: sel ? 600 : 400,
                            }}>
                              {inf.nome} × {op.label}
                            </button>
                          );
                        })
                      )
                    : opcoesScopeRef.map(op => {
                        const sel = scopeRefs.includes(op.value);
                        return (
                          <button key={op.value} onClick={() => toggleScopeRef(op.value)} style={{
                            border: `1px solid ${sel ? "#7c3aed" : t.cardBorder}`,
                            background: sel ? "#7c3aed22" : "transparent",
                            color: sel ? "#7c3aed" : t.text,
                            borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                            fontFamily: FONT.body, fontSize: 13, fontWeight: sel ? 600 : 400,
                          }}>
                            {op.label}
                          </button>
                        );
                      })
                  }
                </div>
              </div>
            )}
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
          }}>
            Cancelar
          </button>
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
    supabase
      .from("role_permissions")
      .select("*")
      .eq("role", roleAtivo)
      .then(({ data }) => {
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
    const rows = PAGES.map(p => ({
      role: roleAtivo,
      page_key: p.key,
      can_view:    perms[p.key]?.can_view    ?? null,
      can_criar:   p.hasCriar   ? (perms[p.key]?.can_criar   ?? null) : null,
      can_editar:  p.hasEditar  ? (perms[p.key]?.can_editar  ?? null) : null,
      can_excluir: p.hasExcluir ? (perms[p.key]?.can_excluir ?? null) : null,
    }));

    await supabase
      .from("role_permissions")
      .upsert(rows, { onConflict: "role,page_key" });

    setSalvando(false);
    setSalvoOk(true);
    setTimeout(() => setSalvoOk(false), 2500);
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
        {ROLES_EDITAVEIS.map(r => (
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

                    if (!temAcao) {
                      return (
                        <td key={campo} style={{ ...tdStyle, textAlign: "center", color: t.textMuted, opacity: 0.3 }}>—</td>
                      );
                    }

                    const val = (perms[page.key]?.[campo] as PermissaoValor) ?? null;
                    return (
                      <td key={campo} style={{ ...tdStyle, textAlign: "center" }}>
                        <select
                          value={val ?? ""}
                          onChange={e => setPerm(page.key, campo, (e.target.value as PermissaoValor) || null)}
                          style={{
                            background: t.bg, border: `1px solid ${t.cardBorder}`,
                            borderRadius: 6, padding: "4px 8px", color: t.text,
                            fontFamily: FONT.body, fontSize: 12, cursor: "pointer",
                            minWidth: 100,
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
        {salvoOk && (
          <span style={{ color: "#22c55e", fontFamily: FONT.body, fontSize: 13 }}>
            ✓ Permissões salvas com sucesso
          </span>
        )}
        <button onClick={salvar} disabled={salvando} style={{
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 22px", cursor: salvando ? "not-allowed" : "pointer",
          fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
          opacity: salvando ? 0.7 : 1,
        }}>
          {salvando ? "Salvando..." : `Salvar permissões — ${roleLabel(roleAtivo)}`}
        </button>
      </div>
    </div>
  );
}
