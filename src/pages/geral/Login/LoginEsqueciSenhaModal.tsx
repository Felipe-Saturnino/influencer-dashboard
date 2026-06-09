import { useEffect, useState, type CSSProperties } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import {
  LOGIN_ACCESS_CONTACT_LINK_COLOR,
  LOGIN_ACCESS_CONTACT_MAILTO,
} from "../../../lib/loginAccessContact";
import { solicitarRecuperarSenha } from "../../../lib/recuperarSenha";
import { useApp } from "../../../context/AppContext";

type ModalPhase = "form" | "not_found" | "inactive" | "success" | "email_error";

interface Props {
  open: boolean;
  onClose: () => void;
  initialEmail: string;
}

const inputStyle: CSSProperties = {
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
};

function LoginEntreEmContatoLink() {
  return (
    <a
      href={LOGIN_ACCESS_CONTACT_MAILTO}
      style={{ color: LOGIN_ACCESS_CONTACT_LINK_COLOR, fontWeight: 600, textDecoration: "underline" }}
    >
      entre em contato
    </a>
  );
}

export function LoginEsqueciSenhaModal({ open, onClose, initialEmail }: Props) {
  const { theme: t } = useApp();
  const [modalEmail, setModalEmail] = useState(initialEmail);
  const [phase, setPhase] = useState<ModalPhase>("form");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModalEmail(initialEmail);
    setPhase("form");
    setFormError("");
    setLoading(false);
  }, [open, initialEmail]);

  if (!open) return null;

  async function handleSubmit() {
    setFormError("");
    const trimmed = modalEmail.trim();
    if (!trimmed) {
      setFormError("Informe seu e-mail.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setFormError("E-mail inválido.");
      return;
    }

    setLoading(true);
    const result = await solicitarRecuperarSenha(trimmed);
    setLoading(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    switch (result.status) {
      case "success":
        setPhase("success");
        break;
      case "not_found":
        setPhase("not_found");
        break;
      case "inactive":
        setPhase("inactive");
        break;
      case "email_error":
        setPhase("email_error");
        break;
      default:
        setFormError(
          "Não foi possível concluir a redefinição. Se o problema persistir, entre em contato com o suporte."
        );
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={440}>
      <ModalHeader title="Reset de senha" onClose={onClose} />

      {phase === "form" && (
        <>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, lineHeight: 1.55, fontFamily: FONT.body }}>
            Informe o e-mail da sua conta. Se estiver cadastrado, redefiniremos sua senha para a senha
            temporária padrão e enviaremos um e-mail com os passos para acessar a plataforma.
          </p>

          <label
            htmlFor="login-reset-email"
            style={{
              display: "block",
              color: t.text,
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              fontFamily: FONT.body,
            }}
          >
            E-mail
          </label>
          <input
            id="login-reset-email"
            type="email"
            autoComplete="email"
            value={modalEmail}
            placeholder="seu@email.com"
            onChange={(e) => {
              setModalEmail(e.target.value);
              setFormError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
            style={{
              ...inputStyle,
              background: t.inputBg,
              border: `1px solid ${t.cardBorder}`,
              color: t.text,
              marginBottom: formError ? 12 : 20,
            }}
          />

          {formError && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                background: `${BASE_COLORS.red}18`,
                border: `1px solid ${BASE_COLORS.red}44`,
                color: BASE_COLORS.red,
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 13,
                marginBottom: 20,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontFamily: FONT.body,
              }}
            >
              <AlertCircle size={18} strokeWidth={2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            aria-busy={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff",
              fontFamily: FONT.title,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="app-lucide-spin" size={18} strokeWidth={2} color="#fff" aria-hidden />
                Enviando…
              </>
            ) : (
              "Redefinir senha"
            )}
          </button>
        </>
      )}

      {phase === "not_found" && (
        <div role="status" style={{ fontFamily: FONT.body }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: t.text, lineHeight: 1.55 }}>
            Este e-mail não pertence a um usuário cadastrado na plataforma.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
            Caso precise de acesso, <LoginEntreEmContatoLink />.
          </p>
        </div>
      )}

      {phase === "inactive" && (
        <div role="status" style={{ fontFamily: FONT.body }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: t.text, lineHeight: 1.55 }}>
            Este e-mail está vinculado a uma conta desativada.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
            Para solicitar a reativação ou um novo acesso, <LoginEntreEmContatoLink />.
          </p>
        </div>
      )}

      {phase === "success" && (
        <div role="status" style={{ fontFamily: FONT.body }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
            <CheckCircle2 size={20} color="#22c55e" strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55 }}>
              Senha redefinida. Enviamos um e-mail para <strong>{modalEmail.trim().toLowerCase()}</strong> com a
              senha temporária e o passo a passo para entrar na plataforma.
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
            Confira também a caixa de spam. No primeiro acesso, será necessário criar uma nova senha pessoal.
          </p>
        </div>
      )}

      {phase === "email_error" && (
        <div role="alert" aria-live="polite" style={{ fontFamily: FONT.body }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: t.text, lineHeight: 1.55 }}>
            A senha foi redefinida, mas não foi possível enviar o e-mail com as instruções.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
            <LoginEntreEmContatoLink /> com o suporte para receber os dados de acesso.
          </p>
        </div>
      )}

      {phase !== "form" && (
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 20,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: "12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: t.inputBg,
            color: t.text,
            fontFamily: FONT.body,
          }}
        >
          Fechar
        </button>
      )}
    </ModalBase>
  );
}
