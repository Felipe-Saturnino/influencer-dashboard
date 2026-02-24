import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── SUPABASE ──
const supabase = createClient(
  "https://dzyuqibobeujzedomlsc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eXVxaWJvYmV1anplZG9tbHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjA3NzEsImV4cCI6MjA4NzQzNjc3MX0.2wpTD_5_FmdPpihTDs-ELvVwQXxAQuYcKcT0vsgYJk4"
);

// ── FONTES ──
const FONT = {
  title:      "'Barlow Condensed', 'Impact', 'Arial Black', sans-serif",
  bodyMedium: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  bodyRoman:  "'Inter', 'Helvetica Neue', Arial, sans-serif",
};

// ── DESIGN TOKENS ──
const C = {
  blue:       "#1e36f8",
  red:        "#e94025",
  cyan:       "#70cae4",
  purple:     "#4a3082",
  black:      "#000000",
  darkBg:     "#0a0a0f",
  darkCard:   "#0f0f1a",
  darkBorder: "#1a1a2e",
  textPrimary:"#ffffff",
  textMuted:  "#8888aa",
  gradStart:  "#0a0a0f",
  gradEnd:    "#2d1b4e",
};

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

// ── LOGIN ──
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

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${C.gradStart} 0%, ${C.gradEnd} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px", fontFamily: FONT.bodyRoman,
      position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: `radial-gradient(circle, ${C.purple}44, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "250px", height: "250px", borderRadius: "50%", background: `radial-gradient(circle, ${C.blue}33, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <img
            src="/Logo Spin Gaming White.png"
            alt="Spin Gaming"
            style={{ height: "72px", marginBottom: "16px", objectFit: "contain" }}
          />
          <div style={{ color: C.textMuted, fontSize: "13px", marginTop: "6px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: FONT.bodyMedium }}>
            Acquisition Hub
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(15, 15, 26, 0.85)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${C.darkBorder}`,
          borderRadius: "24px", padding: "36px",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6)"
        }}>
          {/* Email */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: C.textMuted, fontSize: "11px", fontWeight: 600, marginBottom: "8px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.bodyMedium }}>E-mail</label>
            <input type="email" value={email} placeholder="seu@email.com"
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.darkBorder}`, borderRadius: "12px", color: C.textPrimary, fontSize: "14px", padding: "14px 16px", outline: "none", fontFamily: FONT.bodyRoman }}
            />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: C.textMuted, fontSize: "11px", fontWeight: 600, marginBottom: "8px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.bodyMedium }}>Senha</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} value={password} placeholder="••••••••"
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.darkBorder}`, borderRadius: "12px", color: C.textPrimary, fontSize: "14px", padding: "14px 48px 14px 16px", outline: "none", fontFamily: FONT.bodyRoman }}
              />
              <button onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: C.textMuted }}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, color: "#ff6b6b", borderRadius: "12px", padding: "12px 16px", fontSize: "13px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", fontFamily: FONT.bodyRoman }}>
              ⚠️ {error}
            </div>
          )}

          {/* Botão */}
          <button onClick={handleSubmit} disabled={loading}
            style={{
              width: "100%", border: "none", borderRadius: "12px", padding: "15px",
              fontSize: "13px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
              color: "white", boxShadow: `0 4px 20px ${C.purple}55`,
              fontFamily: FONT.title
            }}>
            {loading ? "⏳ Entrando..." : "Entrar"}
          </button>

          <div style={{ borderTop: `1px solid ${C.darkBorder}`, marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
            <p style={{ color: "#333355", fontSize: "11px", letterSpacing: "0.5px", fontFamily: FONT.bodyRoman }}>Acesso restrito — use suas credenciais</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── APP LAYOUT ──
function AppLayout({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activePage, setActivePage] = useState("dashboard");
  const menu = MENUS[user.role];
  const currentItem = menu.find((m: any) => m.key === activePage);

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: FONT.bodyRoman }}>

      {/* Sidebar */}
      <aside style={{
        width: "240px", minHeight: "100vh", flexShrink: 0,
        background: `linear-gradient(180deg, ${C.gradEnd} 0%, ${C.gradStart} 100%)`,
        display: "flex", flexDirection: "column", padding: "28px 16px",
        borderRight: `1px solid ${C.darkBorder}`
      }}>
        <div style={{ marginBottom: "36px", paddingLeft: "8px" }}>
          <img src="/Logo Spin Gaming White.png" alt="Spin Gaming" style={{ height: "32px", objectFit: "contain", marginBottom: "6px" }} />
          <div style={{ color: C.textMuted, fontSize: "10px", marginTop: "4px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.bodyMedium }}>
            {user.role === "admin" ? "Painel Administrativo" : "Painel do Influencer"}
          </div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {menu.map((item: any) => {
            const active = activePage === item.key;
            return (
              <button key={item.key} onClick={() => setActivePage(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "11px 14px", borderRadius: "12px", border: "none",
                  cursor: "pointer", fontSize: "13px", fontWeight: 500, textAlign: "left",
                  background: active ? `linear-gradient(135deg, ${C.purple}cc, ${C.blue}cc)` : "transparent",
                  color: active ? "white" : C.textMuted,
                  boxShadow: active ? `0 4px 16px ${C.purple}44` : "none",
                  fontFamily: FONT.bodyMedium, letterSpacing: "0.5px"
                }}>
                <span style={{ fontSize: "15px" }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: `1px solid ${C.darkBorder}`, paddingTop: "16px", marginTop: "16px" }}>
          <div style={{ padding: "8px 14px", marginBottom: "4px" }}>
            <p style={{ color: C.textPrimary, fontSize: "13px", fontWeight: 600, margin: 0, fontFamily: FONT.bodyMedium }}>{user.name}</p>
            <p style={{ color: C.textMuted, fontSize: "11px", margin: "3px 0 0", fontFamily: FONT.bodyRoman }}>{user.email}</p>
          </div>
          <button onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "11px 14px", borderRadius: "12px", border: "none", cursor: "pointer", background: "transparent", color: C.textMuted, fontSize: "13px", fontFamily: FONT.bodyMedium }}>
            🚪 Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f4f4f8" }}>
        <header style={{ background: "white", borderBottom: "1px solid #e8e8f0", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: C.black, fontWeight: 800, fontSize: "15px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.title }}>
            {currentItem?.icon} {currentItem?.label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: C.black, fontFamily: FONT.bodyMedium }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: FONT.bodyRoman }}>{user.role}</p>
            </div>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: "14px", fontWeight: 700, fontFamily: FONT.bodyMedium
            }}>
              {user.name[0]}
            </div>
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "52px", marginBottom: "20px" }}>🚧</div>
            <p style={{ fontSize: "18px", fontWeight: 800, color: C.black, margin: 0, textTransform: "uppercase", letterSpacing: "1px", fontFamily: FONT.title }}>Em construção</p>
            <p style={{ fontSize: "13px", color: "#888", marginTop: "8px", fontFamily: FONT.bodyRoman }}>
              <strong style={{ color: C.purple }}>{currentItem?.label}</strong> será montada aqui na próxima etapa.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── ROOT ──
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Carregar fontes do Google
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);

    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
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
    <div style={{ minHeight: "100vh", background: C.gradStart, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontFamily: FONT.bodyRoman }}>
      ⏳ Carregando...
    </div>
  );

  return user
    ? <AppLayout user={user} onLogout={() => setUser(null)} />
    : <LoginScreen onLogin={setUser} />;
}
