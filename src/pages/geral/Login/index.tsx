import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { User } from "../../../types";

interface Props {
  onLogin: (u: User) => void;
}

export default function Login({ onLogin }: Props) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit() {
    setError("");
    if (!email.trim())                return setError("Informe seu e-mail.");
    if (!/\S+@\S+\.\S+/.test(email)) return setError("E-mail inválido.");
    if (!password)                    return setError("Informe sua senha.");

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
    onLogin(profile as User);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, #0a0a0f 0%, #2d1b4e 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px", fontFamily: FONT.body, position: "relative", overflow: "hidden",
    }}>
      {/* Glows */}
      <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: `radial-gradient(circle, ${BASE_COLORS.purple}44, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "250px", height: "250px", borderRadius: "50%", background: `radial-gradient(circle, ${BASE_COLORS.blue}33, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img src="/Logo Spin Gaming White.png" alt="Spin Gaming" style={{ height: "140px", marginBottom: "6px", objectFit: "contain" }} />
          <div style={{ color: "#e5dce1", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: FONT.body }}>
            Acquisition Hub
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(15,15,26,0.85)", backdropFilter: "blur(20px)", border: "1px solid #1a1a2e", borderRadius: "24px", padding: "36px", boxShadow: "0 32px 64px rgba(0,0,0,0.6)" }}>

          {/* E-mail */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "#e5dce1", fontSize: "11px", fontWeight: 700, marginBottom: "8px", letterSpacing: "1.5px", textTransform: "uppercase" }}>E-mail</label>
            <input type="email" value={email} placeholder="seu@email.com"
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(229,220,225,0.15)", borderRadius: "12px", color: "#fff", fontSize: "14px", padding: "14px 16px", outline: "none", fontFamily: FONT.body }}
            />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "#e5dce1", fontSize: "11px", fontWeight: 700, marginBottom: "8px", letterSpacing: "1.5px", textTransform: "uppercase" }}>Senha</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} value={password} placeholder="••••••••"
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(229,220,225,0.15)", borderRadius: "12px", color: "#fff", fontSize: "14px", padding: "14px 48px 14px 16px", outline: "none", fontFamily: FONT.body }}
              />
              <button onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#e5dce1" }}>
                {showPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="12" rx="10" ry="6"/><circle cx="12" cy="12" r="2.5"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12c2.5-5 5.5-7 10-7s7.5 2 10 7"/><path d="M6 16.5l1.5-2"/><path d="M12 18v-2.5"/><path d="M18 16.5l-1.5-2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: `${BASE_COLORS.red}18`, border: `1px solid ${BASE_COLORS.red}44`, color: BASE_COLORS.red, borderRadius: "12px", padding: "12px 16px", fontSize: "13px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", border: "none", borderRadius: "12px", padding: "15px", fontSize: "18px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "white", fontFamily: FONT.title }}>
            {loading ? "⏳ Entrando..." : "Entrar"}
          </button>

          <div style={{ borderTop: "1px solid #1a1a2e", marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
            <p style={{ color: "#fff", fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 8px" }}>
              Acesso restrito — use suas credenciais
            </p>
            <p style={{ color: "#e5dce1", fontSize: "12px", margin: 0 }}>
              Caso precise de acesso{" "}
              <a href="mailto:felipe.saturnino@spingaming.com.br?subject=Solicitação de Acesso — Acquisition Hub"
                style={{ color: BASE_COLORS.blue, fontWeight: 600, textDecoration: "underline" }}>
                entre em contato
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
