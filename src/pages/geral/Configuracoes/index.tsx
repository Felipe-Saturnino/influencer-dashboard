import { useState } from "react";
import { Eye, EyeOff, Lock, Check, Sun, Moon, AlertCircle, CheckCircle2 } from "lucide-react";
import { GiPalette, GiPadlock } from "react-icons/gi";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:      "#4a2082",
  roxoVivo:  "#7c3aed",
  azul:      "#1e36f8",
  vermelho:  "#e84025",
  verde:     "#22c55e",
  gradiente: "linear-gradient(135deg, #4a2082, #1e36f8)",
};

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function passwordStrength(pwd: string) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  return s;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Configuracoes() {
  const { theme: t, user, isDark, setIsDark } = useApp();
  const isOperador = user?.role === "operador";
  const perm = usePermission("configuracoes");

  const [curPass,  setCurPass]  = useState("");
  const [newPass,  setNewPass]  = useState("");
  const [confPass, setConfPass] = useState("");
  const [passErr,  setPassErr]  = useState("");
  const [passOk,   setPassOk]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const strength      = passwordStrength(newPass);
  const strengthColor =
    strength <= 1 ? BRAND.vermelho :
    strength <= 2 ? "#f59e0b" :
    BRAND.verde;
  const strengthLabel =
    strength <= 1 ? "Fraca" :
    strength <= 2 ? "Média" : "Forte";

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar as Configurações.
      </div>
    );
  }

  const reqs = [
    { ok: newPass.length >= 8,                             label: "Mínimo 8 caracteres"             },
    { ok: /[a-z]/.test(newPass) && /[A-Z]/.test(newPass), label: "Maiúsculas e minúsculas"          },
    { ok: /\d/.test(newPass),                              label: "Pelo menos um número"             },
    { ok: /[^a-zA-Z0-9]/.test(newPass),                   label: "Pelo menos um caractere especial" },
  ];

  async function handleChangePassword() {
    setPassErr(""); setPassOk(false);
    if (!curPass)             return setPassErr("Informe sua senha atual.");
    if (newPass.length < 8)  return setPassErr("A nova senha deve ter pelo menos 8 caracteres.");
    if (newPass !== confPass) return setPassErr("As senhas não coincidem.");
    if (curPass === newPass)  return setPassErr("A nova senha deve ser diferente da atual.");

    setSaving(true);
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

  // ── ESTILOS COMPARTILHADOS ──
  const card: React.CSSProperties = {
    background:   t.cardBg,
    border:       `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding:      28,
    marginBottom: 20,
    boxShadow:    "0 4px 20px rgba(0,0,0,0.18)",
  };

  const inputStyle: React.CSSProperties = {
    width:        "100%",
    boxSizing:    "border-box",
    background:   t.inputBg,
    border:       `1px solid ${t.inputBorder ?? t.cardBorder}`,
    borderRadius: 10,
    color:        t.inputText ?? t.text,
    fontSize:     14,
    padding:      "12px 44px 12px 14px",
    outline:      "none",
    fontFamily:   FONT.body,
    transition:   "border-color 0.18s",
  };

  const labelStyle: React.CSSProperties = {
    display:       "block",
    fontSize:      11,
    fontWeight:    700,
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    color:         t.textMuted,
    marginBottom:  6,
    fontFamily:    FONT.body,
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 4px" }}>

      {/* ── APARÊNCIA ── */}
      <div style={card}>

        {/* Header — padrão SectionTitle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: BRAND.roxo, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <GiPalette size={14} color="#fff" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Aparência
          </h2>
        </div>
        <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 20px 40px" }}>
          {isOperador ? "Operadores usam sempre o modo escuro com a identidade da operadora." : "Escolha como a interface será exibida."}
        </p>

        {/* Cards de tema — oculto para operador (travado em Dark) */}
        {!isOperador && (
        <div style={{ display: "flex", gap: 12 }}>
          {([false, true] as const).map(dark => {
            const ativo = isDark === dark;
            return (
              <button
                key={String(dark)}
                onClick={() => setIsDark(dark)}
                style={{
                  flex:          1,
                  padding:       "20px 12px",
                  borderRadius:  14,
                  cursor:        "pointer",
                  border:        `2px solid ${ativo ? BRAND.roxoVivo : t.cardBorder}`,
                  background:    ativo ? `${BRAND.roxoVivo}18` : t.inputBg ?? t.bg,
                  display:       "flex",
                  flexDirection: "column",
                  alignItems:    "center",
                  gap:           10,
                  transition:    "all 0.2s",
                }}
              >
                {/* Preview do tema */}
                <div style={{
                  width:          64,
                  height:         40,
                  borderRadius:   8,
                  background:     dark ? "#1a1a2e" : "#f0f0f8",
                  border:         `1px solid ${dark ? "#3a3a5c" : "#d0d0e0"}`,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                }}>
                  {dark
                    ? <Moon  size={18} color="#f59e0b" />
                    : <Sun   size={18} color="#f59e0b" />
                  }
                </div>

                <span style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT.body }}>
                  {dark ? "Modo Escuro" : "Modo Claro"}
                </span>

                {/* Badge ativo */}
                {ativo && (
                  <span style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          4,
                    fontSize:     10,
                    background:   BRAND.roxoVivo,
                    color:        "#fff",
                    padding:      "3px 10px",
                    borderRadius: 20,
                    fontWeight:   700,
                    fontFamily:   FONT.body,
                  }}>
                    <Check size={9} /> Ativo
                  </span>
                )}
              </button>
            );
          })}
        </div>
        )}
      </div>

      {/* ── ALTERAR SENHA ── */}
      <div style={card}>

        {/* Header — padrão SectionTitle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: BRAND.roxo, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <GiPadlock size={14} color="#fff" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Alterar Senha
          </h2>
        </div>
        <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 20px 40px" }}>
          Para sua segurança, use uma senha forte.
        </p>

        {/* Feedback de sucesso */}
        {passOk && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${BRAND.verde}18`, border: `1px solid ${BRAND.verde}44`, color: BRAND.verde, borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 16, fontFamily: FONT.body }}>
            <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
            Senha alterada com sucesso!
          </div>
        )}

        {/* Feedback de erro */}
        {passErr && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, color: BRAND.vermelho, borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 16, fontFamily: FONT.body }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {passErr}
          </div>
        )}

        {/* Campo: Senha atual */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Senha Atual</label>
          <div style={{ position: "relative" }}>
            <input
              type={showCur ? "text" : "password"}
              value={curPass}
              placeholder="••••••••"
              onChange={e => { setCurPass(e.target.value); setPassErr(""); setPassOk(false); }}
              style={inputStyle}
              onFocus={e  => { e.currentTarget.style.borderColor = BRAND.roxoVivo; }}
              onBlur={e   => { e.currentTarget.style.borderColor = t.inputBorder ?? t.cardBorder; }}
            />
            <button onClick={() => setShowCur(!showCur)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex" }}>
              {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Campo: Nova senha */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nova Senha</label>
          <div style={{ position: "relative" }}>
            <input
              type={showNew ? "text" : "password"}
              value={newPass}
              placeholder="••••••••"
              onChange={e => { setNewPass(e.target.value); setPassErr(""); setPassOk(false); }}
              style={inputStyle}
              onFocus={e  => { e.currentTarget.style.borderColor = BRAND.roxoVivo; }}
              onBlur={e   => { e.currentTarget.style.borderColor = t.inputBorder ?? t.cardBorder; }}
            />
            <button onClick={() => setShowNew(!showNew)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex" }}>
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Medidor de força */}
          {newPass.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= strength ? strengthColor : t.cardBorder, transition: "background 0.3s" }} />
                ))}
              </div>
              <p style={{ fontSize: 11, color: strengthColor, margin: "0 0 8px", fontFamily: FONT.body }}>
                Força: {strengthLabel}
              </p>
              {reqs.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: r.ok ? BRAND.verde : t.textMuted, fontFamily: FONT.body, marginBottom: 3 }}>
                  {r.ok
                    ? <Check size={10} color={BRAND.verde} />
                    : <span style={{ fontSize: 9, opacity: 0.5 }}>○</span>
                  }
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campo: Confirmar senha */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Confirmar Nova Senha</label>
          <div style={{ position: "relative" }}>
            <input
              type={showConf ? "text" : "password"}
              value={confPass}
              placeholder="••••••••"
              onChange={e => { setConfPass(e.target.value); setPassErr(""); setPassOk(false); }}
              style={{
                ...inputStyle,
                borderColor: confPass.length > 0
                  ? confPass === newPass ? BRAND.verde : BRAND.vermelho
                  : t.inputBorder ?? t.cardBorder,
              }}
              onFocus={e  => { if (!confPass.length) e.currentTarget.style.borderColor = BRAND.roxoVivo; }}
              onBlur={e   => { if (!confPass.length) e.currentTarget.style.borderColor = t.inputBorder ?? t.cardBorder; }}
            />
            <button onClick={() => setShowConf(!showConf)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex" }}>
              {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confPass.length > 0 && confPass !== newPass && (
            <p style={{ fontSize: 11, color: BRAND.vermelho, margin: "4px 0 0", fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={10} /> As senhas não coincidem
            </p>
          )}
          {confPass.length > 0 && confPass === newPass && newPass.length >= 8 && (
            <p style={{ fontSize: 11, color: BRAND.verde, margin: "4px 0 0", fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={10} /> Senhas coincidem
            </p>
          )}
        </div>

        {/* Botão principal — gradiente padrão + ícone Lucide */}
        <button
          onClick={handleChangePassword}
          disabled={saving}
          style={{
            width:         "100%",
            border:        "none",
            borderRadius:  10,
            padding:       "14px",
            fontSize:      13,
            fontWeight:    700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            cursor:        saving ? "not-allowed" : "pointer",
            opacity:       saving ? 0.7 : 1,
            background:    saving ? BRAND.roxo : BRAND.gradiente,
            color:         "white",
            fontFamily:    FONT_TITLE,
            display:       "flex",
            alignItems:    "center",
            justifyContent:"center",
            gap:           8,
            transition:    "opacity 0.15s",
          }}
        >
          <Lock size={14} />
          {saving ? "Salvando..." : "Salvar Nova Senha"}
        </button>
      </div>
    </div>
  );
}
