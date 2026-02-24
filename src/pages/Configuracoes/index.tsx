import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { BASE_COLORS, FONT } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

function passwordStrength(pwd: string) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  return s;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="10" ry="6"/><circle cx="12" cy="12" r="2.5"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c2.5-5 5.5-7 10-7s7.5 2 10 7"/><path d="M6 16.5l1.5-2"/><path d="M12 18v-2.5"/><path d="M18 16.5l-1.5-2"/>
    </svg>
  );
}

export default function Configuracoes() {
  const { theme: t, isDark, setIsDark, lang, setLang } = useApp();

  // Password state
  const [curPass,  setCurPass]  = useState("");
  const [newPass,  setNewPass]  = useState("");
  const [confPass, setConfPass] = useState("");
  const [passErr,  setPassErr]  = useState("");
  const [passOk,   setPassOk]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const strength = passwordStrength(newPass);
  const strengthColor = ["#e94025","#e94025","#f5a623","#27ae60","#27ae60"][strength];
  const strengthLabel = strength <= 1 ? "Fraca" : strength <= 2 ? "Média" : "Forte";

  const reqs = [
    { ok: newPass.length >= 8,                              label: "Mínimo 8 caracteres" },
    { ok: /[a-z]/.test(newPass) && /[A-Z]/.test(newPass),  label: "Maiúsculas e minúsculas" },
    { ok: /\d/.test(newPass),                               label: "Pelo menos um número" },
    { ok: /[^a-zA-Z0-9]/.test(newPass),                    label: "Pelo menos um caractere especial" },
  ];

  async function handleChangePassword() {
    setPassErr(""); setPassOk(false);
    if (!curPass)             return setPassErr("Informe sua senha atual.");
    if (newPass.length < 8)  return setPassErr("A nova senha deve ter pelo menos 8 caracteres.");
    if (newPass !== confPass) return setPassErr("As senhas não coincidem.");
    if (curPass === newPass)  return setPassErr("A nova senha deve ser diferente da atual.");

    setSaving(true);
    // Reautentica para validar senha atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setPassErr("Sessão inválida."); setSaving(false); return; }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: curPass });
    if (signInError) { setPassErr("Senha atual incorreta."); setSaving(false); return; }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
    setSaving(false);
    if (updateError) { setPassErr("Erro ao atualizar senha. Tente novamente."); return; }

    setPassOk(true);
    setCurPass(""); setNewPass(""); setConfPass("");
    setTimeout(() => setPassOk(false), 4000);
  }

  // Styles helpers
  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "28px", marginBottom: "20px",
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: "13px", fontWeight: 700, letterSpacing: "1.5px",
    textTransform: "uppercase", color: BASE_COLORS.purple,
    fontFamily: FONT.body, margin: "0 0 6px",
  };
  const desc: React.CSSProperties = {
    fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: "0 0 20px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: "10px", color: t.inputText,
    fontSize: "14px", padding: "12px 44px 12px 14px",
    outline: "none", fontFamily: FONT.body,
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700,
    letterSpacing: "1.2px", textTransform: "uppercase",
    color: t.label, marginBottom: "6px", fontFamily: FONT.body,
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 4px" }}>

      {/* ── APARÊNCIA ── */}
      <div style={card}>
        <p style={sectionTitle}>🎨 Aparência</p>
        <p style={desc}>Escolha como a interface será exibida.</p>
        <div style={{ display: "flex", gap: "12px" }}>
          {([false, true] as const).map(dark => (
            <button key={String(dark)} onClick={() => setIsDark(dark)}
              style={{ flex: 1, padding: "16px 12px", borderRadius: "12px", cursor: "pointer", border: `2px solid ${isDark === dark ? BASE_COLORS.purple : t.cardBorder}`, background: isDark === dark ? `${BASE_COLORS.purple}18` : t.inputBg, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", transition: "all 0.2s" }}>
              <div style={{ width: "64px", height: "40px", borderRadius: "8px", background: dark ? "#1a1a2e" : "#f0f0f8", border: `1px solid ${dark ? "#3a3a5c" : "#d0d0e0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                {dark ? "🌙" : "☀️"}
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: t.text, fontFamily: FONT.body }}>
                {dark ? "Modo Escuro" : "Modo Claro"}
              </span>
              {isDark === dark && (
                <span style={{ fontSize: "10px", background: BASE_COLORS.purple, color: "#fff", padding: "2px 8px", borderRadius: "20px" }}>✓ Ativo</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── IDIOMA ── */}
      <div style={card}>
        <p style={sectionTitle}>🌐 Idioma</p>
        <p style={desc}>Selecione o idioma da plataforma.</p>
        <div style={{ display: "flex", gap: "12px" }}>
          {(["pt", "en"] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ flex: 1, padding: "14px 12px", borderRadius: "12px", cursor: "pointer", border: `2px solid ${lang === l ? BASE_COLORS.blue : t.cardBorder}`, background: lang === l ? `${BASE_COLORS.blue}18` : t.inputBg, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.2s" }}>
              <span style={{ fontSize: "22px" }}>{l === "pt" ? "🇧🇷" : "🇺🇸"}</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: t.text, fontFamily: FONT.body }}>
                {l === "pt" ? "Português" : "English"}
              </span>
              {lang === l && <span style={{ fontSize: "10px", background: BASE_COLORS.blue, color: "#fff", padding: "2px 8px", borderRadius: "20px" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── ALTERAR SENHA ── */}
      <div style={card}>
        <p style={sectionTitle}>🔒 Alterar Senha</p>
        <p style={desc}>Para sua segurança, use uma senha forte.</p>

        {passOk && (
          <div style={{ background: "#27ae6018", border: "1px solid #27ae6044", color: "#27ae60", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", marginBottom: "16px" }}>
            ✓ Senha alterada com sucesso!
          </div>
        )}
        {passErr && (
          <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", marginBottom: "16px" }}>
            ⚠️ {passErr}
          </div>
        )}

        {/* Senha atual */}
        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Senha Atual</label>
          <div style={{ position: "relative" }}>
            <input type={showCur ? "text" : "password"} value={curPass} placeholder="••••••••"
              onChange={e => { setCurPass(e.target.value); setPassErr(""); setPassOk(false); }}
              style={inputStyle} />
            <button onClick={() => setShowCur(!showCur)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.textMuted }}>
              <EyeIcon open={showCur} />
            </button>
          </div>
        </div>

        {/* Nova senha */}
        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Nova Senha</label>
          <div style={{ position: "relative" }}>
            <input type={showNew ? "text" : "password"} value={newPass} placeholder="••••••••"
              onChange={e => { setNewPass(e.target.value); setPassErr(""); setPassOk(false); }}
              style={inputStyle} />
            <button onClick={() => setShowNew(!showNew)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.textMuted }}>
              <EyeIcon open={showNew} />
            </button>
          </div>
          {newPass.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: "4px", borderRadius: "4px", background: i <= strength ? strengthColor : t.divider, transition: "background 0.3s" }} />
                ))}
              </div>
              <p style={{ fontSize: "11px", color: strengthColor, margin: "0 0 8px", fontFamily: FONT.body }}>
                Força: {strengthLabel}
              </p>
              {reqs.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: r.ok ? "#27ae60" : t.textMuted, fontFamily: FONT.body, marginBottom: "3px" }}>
                  {r.ok ? "✓" : "○"} {r.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmar senha */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Confirmar Nova Senha</label>
          <div style={{ position: "relative" }}>
            <input type={showConf ? "text" : "password"} value={confPass} placeholder="••••••••"
              onChange={e => { setConfPass(e.target.value); setPassErr(""); setPassOk(false); }}
              style={{ ...inputStyle, borderColor: confPass.length > 0 ? (confPass === newPass ? "#27ae60" : "#e94025") : t.inputBorder }} />
            <button onClick={() => setShowConf(!showConf)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.textMuted }}>
              <EyeIcon open={showConf} />
            </button>
          </div>
          {confPass.length > 0 && confPass !== newPass && (
            <p style={{ fontSize: "11px", color: "#e94025", margin: "4px 0 0", fontFamily: FONT.body }}>⚠️ As senhas não coincidem</p>
          )}
          {confPass.length > 0 && confPass === newPass && newPass.length >= 8 && (
            <p style={{ fontSize: "11px", color: "#27ae60", margin: "4px 0 0", fontFamily: FONT.body }}>✓ Senhas coincidem</p>
          )}
        </div>

        <button onClick={handleChangePassword} disabled={saving}
          style={{ width: "100%", border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "white", fontFamily: FONT.title }}>
          {saving ? "⏳ Salvando..." : "🔒 Salvar Nova Senha"}
        </button>
      </div>
    </div>
  );
}
