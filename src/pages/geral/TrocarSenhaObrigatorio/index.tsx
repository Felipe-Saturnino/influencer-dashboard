import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";

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
    padding: "14px 44px 14px 16px",
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
      }}
    >
      <div style={{ width: "100%", maxWidth: "min(400px, 100%)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/Logo Spin Gaming White.png"
            alt="Spin Gaming"
            style={{
              height: "clamp(72px, 22vw, 100px)",
              objectFit: "contain",
              marginBottom: 8,
            }}
          />
          <div
            style={{
              color: "#e5dce1",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            Acquisition Hub
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
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              🔒 Troque sua senha
            </div>
            <p style={{ fontSize: 13, color: "#e5dce1", margin: 0 }}>
              Por segurança, você precisa definir uma nova senha no primeiro acesso.
            </p>
          </div>

          {ok && (
            <div
              style={{
                background: "#27ae6018",
                border: "1px solid #27ae6044",
                color: "#27ae60",
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              ✓ Senha alterada! Redirecionando...
            </div>
          )}
          {err && (
            <div
              style={{
                background: `${BASE_COLORS.red}18`,
                border: `1px solid ${BASE_COLORS.red}44`,
                color: BASE_COLORS.red,
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              ⚠️ {err}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nova senha</label>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value);
                  setErr("");
                }}
                placeholder="••••••••"
                style={inputStyle}
              />
              <button
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#1a1a2e",
                }}
              >
                {showNew ? "🙈" : "👁"}
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
                onClick={() => setShowConf(!showConf)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#1a1a2e",
                }}
              >
                {showConf ? "🙈" : "👁"}
              </button>
            </div>
            {confPass.length > 0 && confPass !== newPass && (
              <p style={{ fontSize: 11, color: "#e94025", margin: "4px 0 0" }}>
                As senhas não coincidem
              </p>
            )}
          </div>

          <button
            onClick={handleTrocar}
            disabled={saving || newPass.length < 8 || newPass !== confPass}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: 15,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "white",
              fontFamily: FONT.title,
            }}
          >
            {saving ? "⏳ Salvando..." : "🔒 Definir nova senha"}
          </button>
        </div>
      </div>
    </div>
  );
}
