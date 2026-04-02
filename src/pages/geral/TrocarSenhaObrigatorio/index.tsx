import { useState } from "react";
import { AlertCircle, Check, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { AUTH_PLATFORM_TAGLINE, AUTH_TAGLINE_STYLE } from "../../../constants/authScreen";

/**
 * Tela obrigatória para usuários que precisam trocar a senha no primeiro acesso.
 * Não permite pular — usuário acabou de logar com a senha temporária.
 */
export default function TrocarSenhaObrigatorio() {
  const { user, setUser, theme: t } = useApp();
  const [newPass, setNewPass] = useState("");
  const [confPass, setConfPass] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const strength = [
    newPass.length >= 8,
    /[a-z]/.test(newPass) && /[A-Z]/.test(newPass),
    /\d/.test(newPass),
    /[^a-zA-Z0-9]/.test(newPass),
  ].filter(Boolean).length;
  const strengthColor = ["#e94025", "#e94025", "#f5a623", "#27ae60"][strength];
  const strengthLabel = strength <= 1 ? "Fraca" : strength <= 2 ? "Média" : "Forte";

  const reqs = [
    { ok: newPass.length >= 8, label: "Mínimo 8 caracteres" },
    { ok: /[a-z]/.test(newPass) && /[A-Z]/.test(newPass), label: "Maiúsculas e minúsculas" },
    { ok: /\d/.test(newPass), label: "Pelo menos um número" },
    { ok: /[^a-zA-Z0-9]/.test(newPass), label: "Pelo menos um caractere especial" },
  ];

  async function handleTrocar() {
    setErr("");
    setOk(false);
    if (newPass.length < 8) return setErr("A senha deve ter no mínimo 8 caracteres.");
    if (newPass !== confPass) return setErr("As senhas não coincidem.");

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSaving(false);
    if (error) return setErr(error.message ?? "Erro ao atualizar senha.");

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user!.id);
    if (updErr) {
      setErr("Senha alterada, mas houve um erro ao atualizar o perfil. Faça logout e login novamente.");
      return;
    }

    setOk(true);
    setNewPass("");
    setConfPass("");
    const u = { ...user!, must_change_password: false };
    setUser(u);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(229,220,225,0.15)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 14,
    padding: "14px 52px 14px 16px",
    outline: "none",
    fontFamily: FONT.body,
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#e5dce1",
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  };

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
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BASE_COLORS.purple}44, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        className="auth-glow auth-glow--14s"
        style={{
          position: "absolute",
          bottom: "-50px",
          left: "-50px",
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BASE_COLORS.blue}33, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ width: "100%", maxWidth: "min(400px, 100%)", position: "relative", zIndex: 1 }}>
        <div className="app-auth-logo-block" style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/Logo Spin Gaming White.png"
            alt="Spin Gaming"
            style={{
              height: "clamp(72px, 18vw, 120px)",
              objectFit: "contain",
              marginBottom: 8,
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
            borderRadius: 24,
            padding: "clamp(20px, 5vw, 32px)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <Lock size={20} strokeWidth={2} aria-hidden />
              Troque sua senha
            </div>
            <p style={{ fontSize: 13, color: "#e5dce1", margin: 0 }}>
              Por segurança, você precisa definir uma nova senha no primeiro acesso.
            </p>
          </div>

          {ok && (
            <div
              role="status"
              aria-live="polite"
              style={{
                background: "#27ae6018",
                border: "1px solid #27ae6044",
                color: "#27ae60",
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Check size={18} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
              <span>Senha alterada! Redirecionando...</span>
            </div>
          )}
          {err && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                background: `${BASE_COLORS.red}18`,
                border: `1px solid ${BASE_COLORS.red}44`,
                color: BASE_COLORS.red,
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={18} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
              <span>{err}</span>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nova senha</label>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value);
                  setErr("");
                }}
                placeholder="••••••••"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? "Ocultar senha" : "Mostrar senha"}
                style={{
                  position: "absolute",
                  right: 6,
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
                {showNew ? <EyeOff size={18} strokeWidth={2} aria-hidden /> : <Eye size={18} strokeWidth={2} aria-hidden />}
              </button>
            </div>
            {newPass.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 4,
                        background: i <= strength ? strengthColor : "#333",
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: 11, color: strengthColor, margin: "0 0 8px" }}>
                  Força: {strengthLabel}
                </p>
                {reqs.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      color: r.ok ? "#27ae60" : "#888",
                      marginBottom: 3,
                    }}
                  >
                    {r.ok ? "✓" : "○"} {r.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Confirmar nova senha</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConf ? "text" : "password"}
                autoComplete="new-password"
                value={confPass}
                onChange={(e) => {
                  setConfPass(e.target.value);
                  setErr("");
                }}
                placeholder="••••••••"
                style={{
                  ...inputStyle,
                  borderColor:
                    confPass.length > 0
                      ? confPass === newPass
                        ? "#27ae60"
                        : "#e94025"
                      : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConf(!showConf)}
                aria-label={showConf ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                style={{
                  position: "absolute",
                  right: 6,
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
                {showConf ? <EyeOff size={18} strokeWidth={2} aria-hidden /> : <Eye size={18} strokeWidth={2} aria-hidden />}
              </button>
            </div>
            {confPass.length > 0 && confPass !== newPass && (
              <p style={{ fontSize: 11, color: "#e94025", margin: "4px 0 0" }}>
                As senhas não coincidem
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleTrocar}
            disabled={saving || newPass.length < 8 || newPass !== confPass}
            aria-busy={saving}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: 15,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "1.25px",
              textTransform: "uppercase",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "white",
              fontFamily: FONT.title,
            }}
          >
            {saving ? (
              <>
                <Loader2 className="app-lucide-spin" size={20} strokeWidth={2} aria-hidden />
                Salvando...
              </>
            ) : (
              <>
                <Lock size={18} strokeWidth={2} aria-hidden />
                Definir nova senha
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
