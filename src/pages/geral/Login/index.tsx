import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { AUTH_PLATFORM_TAGLINE, AUTH_TAGLINE_STYLE } from "../../../constants/authScreen";
import { useApp } from "../../../context/AppContext";
import { User } from "../../../types";

interface Props {
  onLogin: (u: User) => void;
}

const CONTACT_LINK_COLOR = "var(--brand-icon, #70cae4)";

export default function Login({ onLogin }: Props) {
  const { theme: t } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!email.trim()) return setError("Informe seu e-mail.");
    if (!/\S+@\S+\.\S+/.test(email)) return setError("E-mail inválido.");
    if (!password) return setError("Informe sua senha.");

    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (authError) {
      const msg = authError.message?.toLowerCase() || "";
      if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
        setError("Falha de conexão. Verifique sua internet e tente novamente.");
      } else if (msg.includes("email not confirmed")) {
        setError("E-mail ainda não confirmado. Verifique sua caixa de entrada.");
      } else {
        setError("E-mail ou senha incorretos.");
      }
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, role, email, ativo, must_change_password")
      .eq("id", authData.user.id)
      .single();
    if (profileError || !profile) {
      setError("Perfil não encontrado. Contate o administrador.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (profile.ativo === false) {
      setError("Sua conta foi desativada. Entre em contato com o administrador.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    onLogin(profile as User);
  }

  return (
    <div
      className="app-auth-screen"
      style={{
        background: `linear-gradient(135deg, #0a0a0f 0%, #2d1b4e 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT.body,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className="auth-glow auth-glow--10s"
        style={{
          position: "absolute",
          top: "-80px",
          right: "-80px",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BASE_COLORS.purple}44, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        className="auth-glow auth-glow--14s"
        style={{
          position: "absolute",
          bottom: "-60px",
          left: "-60px",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BASE_COLORS.blue}33, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: "min(400px, 100%)", position: "relative", zIndex: 1 }}>
        <div className="app-auth-logo-block" style={{ textAlign: "center", marginBottom: "24px" }}>
          <img
            src="/Logo Spin Gaming White.png"
            alt="Spin Gaming"
            style={{
              height: "clamp(72px, 18vw, 120px)",
              marginBottom: "6px",
              objectFit: "contain",
            }}
          />
          <div
            style={{
              color: t.textMuted,
              fontFamily: FONT.body,
              ...AUTH_TAGLINE_STYLE,
            }}
          >
            {AUTH_PLATFORM_TAGLINE}
          </div>
        </div>

        <div
          style={{
            background: "rgba(15,15,26,0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid #1a1a2e",
            borderRadius: "24px",
            padding: "clamp(20px, 5vw, 36px)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                color: "#e5dce1",
                fontSize: "11px",
                fontWeight: 700,
                marginBottom: "8px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              E-mail
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              placeholder="seu@email.com"
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(229,220,225,0.15)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "14px",
                padding: "14px 16px",
                outline: "none",
                fontFamily: FONT.body,
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                color: "#e5dce1",
                fontSize: "11px",
                fontWeight: 700,
                marginBottom: "8px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                placeholder="••••••••"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(229,220,225,0.15)",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "14px",
                  padding: "14px 52px 14px 16px",
                  outline: "none",
                  fontFamily: FONT.body,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: t.textMuted,
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 44,
                  minHeight: 44,
                  boxSizing: "border-box",
                }}
              >
                {showPass ? <EyeOff size={18} strokeWidth={2} aria-hidden /> : <Eye size={18} strokeWidth={2} aria-hidden />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                background: `${BASE_COLORS.red}18`,
                border: `1px solid ${BASE_COLORS.red}44`,
                color: BASE_COLORS.red,
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "13px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={18} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            aria-busy={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "12px",
              padding: "15px",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "1.25px",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "white",
              fontFamily: FONT.title,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="app-lucide-spin" size={20} strokeWidth={2} color="#fff" aria-hidden />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>

          <div
            style={{
              borderTop: "1px solid rgba(229,220,225,0.1)",
              marginTop: "24px",
              paddingTop: "20px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                margin: "0 0 8px",
              }}
            >
              Acesso restrito — use suas credenciais
            </p>
            <p style={{ color: "#e5dce1", fontSize: "12px", margin: 0 }}>
              Caso precise de acesso{" "}
              <a
                href="mailto:felipe.saturnino@spingaming.com.br?subject=Solicitação de Acesso — Data Intelligence"
                style={{ color: CONTACT_LINK_COLOR, fontWeight: 600, textDecoration: "underline" }}
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
