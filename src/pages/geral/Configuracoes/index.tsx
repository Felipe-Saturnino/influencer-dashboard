import { useState, type CSSProperties } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  Palette,
  ShieldOff,
  Sun,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { SectionTitle } from "../../../components/SectionTitle";
import { usePermission } from "../../../hooks/usePermission";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

/** Tokens semânticos fixos (não whitelabel). */
const SEMANTIC = {
  verde: "#22c55e",
  vermelho: "#e94025",
} as const;

const CTA_GRADIENT =
  "linear-gradient(135deg, var(--brand-secondary, #4a2082), var(--brand-accent, #1e36f8))";

const PRIMARY_TINT_BG = "color-mix(in srgb, var(--brand-primary, #7c3aed) 18%, transparent)";

function passwordStrength(pwd: string) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  return s;
}

export default function Configuracoes() {
  const { theme: t, user, isDark, setIsDark } = useApp();
  const isOperador = user?.role === "operador";
  const perm = usePermission("configuracoes");

  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confPass, setConfPass] = useState("");
  const [passErr, setPassErr] = useState("");
  const [passOk, setPassOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const strength = passwordStrength(newPass);
  const strengthColor =
    strength <= 1 ? SEMANTIC.vermelho : strength <= 2 ? "var(--brand-extra3, #f59e0b)" : SEMANTIC.verde;
  const strengthLabel = strength <= 1 ? "Fraca" : strength <= 2 ? "Média" : "Forte";

  if (perm.canView === "nao") {
    return (
      <div
        className="app-page-shell"
        role="status"
        style={{
          maxWidth: 480,
          margin: "0 auto",
          paddingTop: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          textAlign: "center",
          fontFamily: FONT.body,
        }}
      >
        <ShieldOff size={32} color={t.textMuted} aria-hidden />
        <h1 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0 }}>Acesso restrito</h1>
        <p style={{ fontSize: 14, color: t.textMuted, margin: 0, lineHeight: 1.5 }}>
          Você não tem permissão para acessar esta página. Entre em contato com seu administrador.
        </p>
      </div>
    );
  }

  const reqs = [
    { ok: newPass.length >= 8, label: "Mínimo 8 caracteres" },
    { ok: /[a-z]/.test(newPass) && /[A-Z]/.test(newPass), label: "Maiúsculas e minúsculas" },
    { ok: /\d/.test(newPass), label: "Pelo menos um número" },
    { ok: /[^a-zA-Z0-9]/.test(newPass), label: "Pelo menos um caractere especial" },
  ];

  async function handleChangePassword() {
    setPassErr("");
    setPassOk(false);
    if (!curPass) return setPassErr("Informe sua senha atual.");
    if (newPass.length < 8) return setPassErr("A nova senha deve ter pelo menos 8 caracteres.");
    if (newPass !== confPass) return setPassErr("As senhas não coincidem.");
    if (curPass === newPass) return setPassErr("A nova senha deve ser diferente da atual.");

    setSaving(true);
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser?.email) {
      setPassErr("Sessão inválida.");
      setSaving(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: curPass,
    });
    if (signInError) {
      setPassErr("Senha atual incorreta.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
    setSaving(false);
    if (updateError) {
      setPassErr("Erro ao atualizar senha. Tente novamente.");
      return;
    }

    setPassOk(true);
    setCurPass("");
    setNewPass("");
    setConfPass("");
    setTimeout(() => setPassOk(false), 4000);
  }

  const card: CSSProperties = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 16,
    padding: 28,
    marginBottom: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: t.inputBg,
    border: `1px solid ${t.inputBorder ?? t.cardBorder}`,
    borderRadius: 10,
    color: t.inputText ?? t.text,
    fontSize: 14,
    padding: "12px 44px 12px 14px",
    outline: "none",
    fontFamily: FONT.body,
    transition: "border-color 0.18s",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  };

  const primaryBorder = "var(--brand-primary, #7c3aed)";

  return (
    <div className="app-page-shell" style={{ maxWidth: "640px", margin: "0 auto" }}>
      <div style={card}>
        <SectionTitle
          icon={<Palette size={14} color="#fff" strokeWidth={2} aria-hidden />}
          label="Aparência"
          subtitle={
            isOperador
              ? "Operadores usam sempre o modo escuro com a identidade da operadora."
              : "Escolha como a interface será exibida."
          }
          titleColor={t.text}
          subtitleColor={t.textMuted}
        />

        {!isOperador && (
          <div
            className="config-theme-radiogroup"
            role="radiogroup"
            aria-label="Tema da interface"
            style={{ display: "flex", gap: 12 }}
          >
            {([false, true] as const).map((dark) => {
              const ativo = isDark === dark;
              return (
                <button
                  key={String(dark)}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setIsDark(dark)}
                  style={{
                    flex: 1,
                    padding: "20px 12px",
                    borderRadius: 16,
                    cursor: "pointer",
                    border: `2px solid ${ativo ? primaryBorder : t.cardBorder}`,
                    background: ativo ? PRIMARY_TINT_BG : t.inputBg ?? t.bg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 40,
                      borderRadius: 8,
                      background: dark ? "#1a1a2e" : "#f0f0f8",
                      border: `1px solid ${dark ? "#3a3a5c" : "#d0d0e0"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {dark ? <Moon size={18} color="#f59e0b" aria-hidden /> : <Sun size={18} color="#f59e0b" aria-hidden />}
                  </div>

                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT.body }}>
                    {dark ? "Modo Escuro" : "Modo Claro"}
                  </span>

                  {ativo && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        background: "var(--brand-primary, #7c3aed)",
                        color: "#fff",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontWeight: 700,
                        fontFamily: FONT.body,
                      }}
                    >
                      <Check size={9} aria-hidden /> Ativo
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="config-password-card-scroll" style={card}>
        <SectionTitle
          icon={<Lock size={14} color="#fff" strokeWidth={2} aria-hidden />}
          label="Alterar Senha"
          subtitle="Para sua segurança, use uma senha forte."
          titleColor={t.text}
          subtitleColor={t.textMuted}
        />

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Senha Atual</label>
          <div style={{ position: "relative" }}>
            <input
              type={showCur ? "text" : "password"}
              autoComplete="current-password"
              value={curPass}
              placeholder="••••••••"
              onChange={(e) => {
                setCurPass(e.target.value);
                setPassErr("");
                setPassOk(false);
              }}
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = primaryBorder;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = t.inputBorder ?? t.cardBorder;
              }}
            />
            <button
              type="button"
              onClick={() => setShowCur(!showCur)}
              aria-label={showCur ? "Ocultar senha" : "Mostrar senha"}
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: t.textMuted,
                display: "flex",
                padding: 12,
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              {showCur ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nova Senha</label>
          <div style={{ position: "relative" }}>
            <input
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              value={newPass}
              placeholder="••••••••"
              onChange={(e) => {
                setNewPass(e.target.value);
                setPassErr("");
                setPassOk(false);
              }}
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = primaryBorder;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = t.inputBorder ?? t.cardBorder;
              }}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              aria-label={showNew ? "Ocultar senha" : "Mostrar senha"}
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: t.textMuted,
                display: "flex",
                padding: 12,
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              {showNew ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>

          {newPass.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div
                role="status"
                aria-label={`Força da senha: ${strengthLabel}`}
                style={{ display: "flex", gap: 4, marginBottom: 6 }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 4,
                      background: i <= strength ? strengthColor : t.cardBorder,
                      transition: "background 0.3s",
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: 11, color: strengthColor, margin: "0 0 8px", fontFamily: FONT.body }}>
                Força: {strengthLabel}
              </p>
              {reqs.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: r.ok ? SEMANTIC.verde : t.textMuted,
                    fontFamily: FONT.body,
                    marginBottom: 3,
                  }}
                >
                  {r.ok ? (
                    <Check size={10} color={SEMANTIC.verde} strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Circle size={10} strokeWidth={2} style={{ opacity: 0.35 }} aria-hidden />
                  )}
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Confirmar Nova Senha</label>
          <div style={{ position: "relative" }}>
            <input
              type={showConf ? "text" : "password"}
              autoComplete="new-password"
              value={confPass}
              placeholder="••••••••"
              onChange={(e) => {
                setConfPass(e.target.value);
                setPassErr("");
                setPassOk(false);
              }}
              style={{
                ...inputStyle,
                borderColor:
                  confPass.length > 0
                    ? confPass === newPass
                      ? SEMANTIC.verde
                      : SEMANTIC.vermelho
                    : t.inputBorder ?? t.cardBorder,
              }}
              onFocus={(e) => {
                if (!confPass.length) e.currentTarget.style.borderColor = primaryBorder;
              }}
              onBlur={(e) => {
                if (!confPass.length) e.currentTarget.style.borderColor = t.inputBorder ?? t.cardBorder;
              }}
            />
            <button
              type="button"
              onClick={() => setShowConf(!showConf)}
              aria-label={showConf ? "Ocultar senha" : "Mostrar senha"}
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: t.textMuted,
                display: "flex",
                padding: 12,
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              {showConf ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
          {confPass.length > 0 && confPass !== newPass && (
            <p
              style={{
                fontSize: 11,
                color: SEMANTIC.vermelho,
                margin: "4px 0 0",
                fontFamily: FONT.body,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <AlertCircle size={10} aria-hidden /> As senhas não coincidem
            </p>
          )}
          {confPass.length > 0 && confPass === newPass && newPass.length >= 8 && (
            <p
              style={{
                fontSize: 11,
                color: SEMANTIC.verde,
                margin: "4px 0 0",
                fontFamily: FONT.body,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Check size={10} aria-hidden /> Senhas coincidem
            </p>
          )}
        </div>

        {passOk && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: `${SEMANTIC.verde}18`,
              border: `1px solid ${SEMANTIC.verde}44`,
              color: SEMANTIC.verde,
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              marginBottom: 16,
              fontFamily: FONT.body,
            }}
          >
            <CheckCircle2 size={14} style={{ flexShrink: 0 }} aria-hidden />
            Senha alterada com sucesso!
          </div>
        )}

        {passErr && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: `${SEMANTIC.vermelho}18`,
              border: `1px solid ${SEMANTIC.vermelho}44`,
              color: SEMANTIC.vermelho,
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              marginBottom: 16,
              fontFamily: FONT.body,
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} aria-hidden />
            {passErr}
          </div>
        )}

        <button
          type="button"
          onClick={handleChangePassword}
          disabled={saving}
          aria-busy={saving}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 10,
            padding: "14px",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.65 : 1,
            background: CTA_GRADIENT,
            color: "white",
            fontFamily: FONT_TITLE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "opacity 0.15s",
          }}
        >
          {saving ? (
            <>
              <Loader2 className="app-lucide-spin" size={14} strokeWidth={2} color="#fff" aria-hidden />
              Salvando...
            </>
          ) : (
            <>
              <Lock size={14} aria-hidden />
              Salvar Nova Senha
            </>
          )}
        </button>
      </div>
    </div>
  );
}
