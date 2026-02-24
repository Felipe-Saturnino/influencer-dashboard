import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://dzyuqibobeujzedomlsc.supabase.co",
  "sb_publishable_08RNU1GoS-8Zmg3E5VnLTg_VGJljRpa"
);

const MENUS: Record<string, { key: string; label: string; icon: string }[]> = {
  admin: [
    { key: "dashboard",     label: "Dashboard",     icon: "📊" },
    { key: "influencers",   label: "Influencers",   icon: "👥" },
    { key: "relatorios",    label: "Relatórios",    icon: "📈" },
    { key: "configuracoes", label: "Configurações", icon: "⚙️" },
  ],
  influencer: [
    { key: "dashboard", label: "Meu Dashboard",      icon: "📊" },
    { key: "vendas",    label: "Vendas & Comissões",  icon: "💰" },
    { key: "agenda",    label: "Agenda de Lives",     icon: "🎥" },
    { key: "perfil",    label: "Meu Perfil",          icon: "👤" },
  ],
};

function LoginScreen({ onLogin }: { onLogin: (u: any) => void }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  function validate() {
    if (!email.trim()) return "Informe seu e-mail.";
    if (!/\S+@\S+\.\S+/.test(email)) return "E-mail inválido.";
    if (!password) return "Informe sua senha.";
    return null;
  }

  async function handleSubmit() {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (authError) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, role, email")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      setError("Perfil não encontrado. Contate o administrador.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    onLogin({ email: profile.email, role: profile.role, name: profile.name });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: "#1f2937",
    border: "1px solid #374151", borderRadius: "12px", color: "white",
    fontSize: "14px", padding: "12px 16px", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", background: "#4f46e5", borderRadius: "16px", fontSize: "24px", marginBottom: "16px", boxShadow: "0 8px 32px rgba(79,70,229,0.4)" }}>⚡</div>
          <div style={{ color: "white", fontSize: "22px", fontWeight: 700 }}>LiveDash</div>
          <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "4px" }}>Faça login para acessar a plataforma</div>
        </div>

        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "20px", padding: "32px", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", color: "#d1d5db", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>E-mail</label>
            <input type="email" value={email} placeholder="seu@email.com"
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={inputStyle} />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", color: "#d1d5db", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Senha</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} value={password} placeholder="••••••••"
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ ...inputStyle, paddingRight: "48px" }} />
              <button onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#6b7280" }}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "12px", padding: "12px 16px", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", background: "#4f46e5", color: "white", border: "none", borderRadius: "12px", padding: "13px", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading ? "⏳ Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppLayout({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activePage, setActivePage] = useState("dashboard");
  const menu = MENUS[user.role];
  const currentItem = menu.find((m: any) => m.key === activePage);

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside style={{ width: "232px", minHeight: "100vh", background: "#111827", display: "flex", flexDirection: "column", padding: "24px 16px", flexShrink: 0 }}>
        <div style={{ marginBottom: "32px", paddingLeft: "8px" }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: "17px" }}>⚡ LiveDash</div>
          <div style={{ color: "#4b5563", fontSize: "11px", marginTop: "2px" }}>
            {user.role === "admin" ? "Painel Administrativo" : "Painel do Influencer"}
          </div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {menu.map((item: any) => {
            const active = activePage === item.key;
            return (
              <button key={item.key} onClick={() => setActivePage(item.key)}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500, textAlign: "left", background: active ? "#4f46e5" : "transparent", color: active ? "white" : "#6b7280" }}>
                <span style={{ fontSize: "15px" }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: "1px solid #1f2937", paddingTop: "16px", marginTop: "16px" }}>
          <div style={{ padding: "8px 12px", marginBottom: "4px" }}>
            <p style={{ color: "white", fontSize: "13px", fontWeight: 500, margin: 0 }}>{user.name}</p>
            <p style={{ color: "#4b5563", fontSize: "11px", margin: "2px 0 0" }}>{user.email}</p>
          </div>
          <button onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", borderRadius: "12px", border: "none", cursor: "pointer", background: "transparent", color: "#6b7280", fontSize: "13px", fontWeight: 500 }}>
            🚪 Sair
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f9fafb" }}>
        <header style={{ background: "white", borderBottom: "1px solid #e5e7eb", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#111827", fontWeight: 600, fontSize: "16px" }}>
            {currentItem?.icon} {currentItem?.label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f3f4f6", borderRadius: "12px", padding: "6px 12px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: 700 }}>
              {user.name[0]}
            </div>
            <span style={{ color: "#374151", fontSize: "13px" }}>{user.name}</span>
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚧</div>
            <p style={{ fontSize: "16px", fontWeight: 500, color: "#6b7280", margin: 0 }}>Seção em construção</p>
            <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "6px" }}>
              <strong style={{ color: "#818cf8" }}>{currentItem?.label}</strong> será montada aqui na próxima etapa.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from("profiles").select("name, role, email")
          .eq("id", session.user.id).single();
        if (profile) setUser(profile);
      }
      setChecking(false);
    });
  }, []);

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontFamily: "system-ui, sans-serif" }}>
      ⏳ Carregando...
    </div>
  );

  return user
    ? <AppLayout user={user} onLogout={() => setUser(null)} />
    : <LoginScreen onLogin={setUser} />;
}
