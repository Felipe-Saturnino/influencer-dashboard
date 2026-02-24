import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://dzyuqibobeujzedomlsc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eXVxaWJvYmV1anplZG9tbHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjA3NzEsImV4cCI6MjA4NzQzNjc3MX0.2wpTD_5_FmdPpihTDs-ELvVwQXxAQuYcKcT0vsgYJk4"
);

const FONT = {
  title:      "'Barlow Condensed', 'Impact', 'Arial Black', sans-serif",
  bodyMedium: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  bodyRoman:  "'Inter', 'Helvetica Neue', Arial, sans-serif",
};

const C = {
  blue:       "#1e36f8",
  red:        "#e94025",
  purple:     "#4a3082",
  black:      "#000000",
  darkBorder: "#1a1a2e",
  textPrimary:"#ffffff",
  textMuted:  "#e5dce1",
  gradStart:  "#0a0a0f",
  gradEnd:    "#2d1b4e",
};

const MENU_SECTIONS_ADMIN = [
  {
    section: "Dashboards",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "📊" },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda", label: "Agenda de Lives", icon: "🎥" },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "influencers", label: "Influencers", icon: "👥" },
      { key: "relatorios",  label: "Relatórios",  icon: "📈" },
    ],
  },
];

const MENU_SECTIONS_INFLUENCER = [
  {
    section: "Dashboards",
    items: [
      { key: "dashboard", label: "Meu Dashboard", icon: "📊" },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda", label: "Agenda de Lives", icon: "🎥" },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "vendas", label: "Vendas & Comissões", icon: "💰" },
      { key: "perfil", label: "Meu Perfil",         icon: "👤" },
    ],
  },
];

const btnBase: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "10px",
  width: "100%", padding: "11px 14px", borderRadius: "12px", border: "none",
  cursor: "pointer", fontSize: "13px", fontWeight: 500, textAlign: "left",
  background: "transparent", color: C.textMuted, fontFamily: FONT.bodyMedium,
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────

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
      email: email.toLowerCase().trim(), password,
    });
    if (authError) { setError("E-mail ou senha incorretos."); setLoading(false); return; }
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("name, role, email").eq("id", authData.user.id).single();
    if (profileError || !profile) {
      setError("Perfil não encontrado. Contate o administrador.");
      await supabase.auth.signOut(); setLoading(false); return;
    }
    onLogin({ email: profile.email, role: profile.role, name: profile.name });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${C.gradStart} 0%, ${C.gradEnd} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px", fontFamily: FONT.bodyRoman, position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: `radial-gradient(circle, ${C.purple}44, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "250px", height: "250px", borderRadius: "50%", background: `radial-gradient(circle, ${C.blue}33, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img src="/Logo Spin Gaming White.png" alt="Spin Gaming"
            style={{ height: "140px", marginBottom: "6px", objectFit: "contain" }} />
          <div style={{ color: "#e5dce1", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: FONT.bodyMedium }}>
            Acquisition Hub
          </div>
        </div>

        <div style={{
          background: "rgba(15, 15, 26, 0.85)", backdropFilter: "blur(20px)",
          border: `1px solid ${C.darkBorder}`, borderRadius: "24px", padding: "36px",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6)"
        }}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "#e5dce1", fontSize: "11px", fontWeight: 700, marginBottom: "8px", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FONT.bodyMedium }}>E-mail</label>
            <input type="email" value={email} placeholder="seu@email.com"
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(229,220,225,0.15)", borderRadius: "12px", color: "#ffffff", fontSize: "14px", padding: "14px 16px", outline: "none", fontFamily: FONT.bodyRoman }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "#e5dce1", fontSize: "11px", fontWeight: 700, marginBottom: "8px", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FONT.bodyMedium }}>Senha</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} value={password} placeholder="••••••••"
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(229,220,225,0.15)", borderRadius: "12px", color: "#ffffff", fontSize: "14px", padding: "14px 48px 14px 16px", outline: "none", fontFamily: FONT.bodyRoman }}
              />
              <button onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#e5dce1" }}>
                {showPass ? (
                  // Olho aberto
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="12" rx="10" ry="6" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                ) : (
                  // Olho fechado
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12c2.5-5 5.5-7 10-7s7.5 2 10 7" />
                    <path d="M6 16.5l1.5-2" />
                    <path d="M12 18v-2.5" />
                    <path d="M18 16.5l-1.5-2" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, color: "#ff6b6b", borderRadius: "12px", padding: "12px 16px", fontSize: "13px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{
              width: "100%", border: "none", borderRadius: "12px", padding: "15px",
              fontSize: "18px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
              color: "white", boxShadow: `0 4px 20px ${C.purple}55`, fontFamily: FONT.title
            }}>
            {loading ? "⏳ Entrando..." : "Entrar"}
          </button>

          <div style={{ borderTop: `1px solid ${C.darkBorder}`, marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
            <p style={{ color: "#ffffff", fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FONT.bodyMedium, margin: "0 0 8px" }}>
              Acesso restrito — use suas credenciais
            </p>
            <p style={{ color: C.textMuted, fontSize: "12px", fontFamily: FONT.bodyRoman, margin: 0 }}>
              Caso precise de acesso{" "}
              <a
                href="mailto:felipe.saturnino@spingaming.com.br?subject=Solicitação de Acesso — Acquisition Hub"
                style={{ color: C.blue, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
              >
                entre em contato
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────

function AppLayout({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Dashboards: true, Lives: true, "Operações": true,
  });

  const sections = user.role === "admin" ? MENU_SECTIONS_ADMIN : MENU_SECTIONS_INFLUENCER;
  const allItems = sections.flatMap(s => s.items);
  const currentItem = allItems.find(i => i.key === activePage);

  function toggleSection(name: string) {
    setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: FONT.bodyRoman }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: "240px", height: "100vh", flexShrink: 0, position: "sticky", top: 0,
        background: `linear-gradient(180deg, ${C.gradEnd} 0%, ${C.gradStart} 100%)`,
        display: "flex", flexDirection: "column", padding: "24px 16px",
        borderRight: `1px solid ${C.darkBorder}`, boxSizing: "border-box",
      }}>
        {/* LOGO */}
        <div style={{ marginBottom: "28px", paddingLeft: "8px" }}>
          <img src="/Logo Spin Gaming White.png" alt="Spin Gaming"
            style={{ height: "80px", objectFit: "contain", display: "block" }} />
        </div>

        {/* NAV — scrollável */}
        <nav style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }}>
          {sections.map(sec => {
            const isOpen = openSections[sec.section];
            const hasActive = sec.items.some(i => i.key === activePage);
            return (
              <div key={sec.section}>
                <button
                  onClick={() => toggleSection(sec.section)}
                  style={{
                    ...btnBase,
                    justifyContent: "space-between", padding: "10px 14px",
                    color: hasActive ? "white" : "#8888aa",
                    fontWeight: 700, fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase",
                  }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      fontSize: "10px", display: "inline-block",
                      transition: "transform 0.25s",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      color: "#6b6b8a",
                    }}>▶</span>
                    <span style={{ fontFamily: FONT.bodyMedium }}>{sec.section}</span>
                  </span>
                </button>

                <div style={{
                  overflow: "hidden",
                  maxHeight: isOpen ? `${sec.items.length * 52}px` : "0px",
                  transition: "max-height 0.25s ease",
                  display: "flex", flexDirection: "column", gap: "2px",
                  paddingLeft: "8px",
                }}>
                  {sec.items.map(item => {
                    const active = activePage === item.key;
                    return (
                      <button key={item.key} onClick={() => setActivePage(item.key)}
                        style={{
                          ...btnBase,
                          background: active ? `linear-gradient(135deg, ${C.purple}cc, ${C.blue}cc)` : "transparent",
                          color: active ? "white" : C.textMuted,
                          boxShadow: active ? `0 4px 16px ${C.purple}44` : "none",
                        }}>
                        <span style={{ fontSize: "15px" }}>{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* RODAPÉ FIXO */}
        <div style={{ borderTop: "2px solid #3a3a5c", paddingTop: "14px", marginTop: "16px", flexShrink: 0 }}>
          <div style={{ padding: "4px 14px 10px" }}>
            <p style={{ color: C.textPrimary, fontSize: "13px", fontWeight: 600, margin: 0, fontFamily: FONT.bodyMedium }}>{user.name}</p>
            <p style={{ color: C.textMuted, fontSize: "11px", margin: "3px 0 0", fontFamily: FONT.bodyRoman }}>{user.email}</p>
          </div>
          <button onClick={() => setActivePage("configuracoes")} style={{ ...btnBase, padding: "7px 14px" }}>⚙️ Configurações</button>
          <button style={{ ...btnBase, padding: "7px 14px" }}>❓ Ajuda</button>
          <button onClick={handleLogout} style={{ ...btnBase, padding: "7px 14px" }}>🚪 Sair</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f4f4f8" }}>
        <header style={{ background: "white", borderBottom: "1px solid #e8e8f0", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: C.black, fontWeight: 800, fontSize: "15px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.title }}>
            {currentItem?.icon} {currentItem?.label ?? "⚙️ Configurações"}
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
              color: "white", fontSize: "14px", fontWeight: 700,
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
              <strong style={{ color: C.purple }}>{currentItem?.label ?? "Configurações"}</strong> será montada aqui na próxima etapa.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
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
