import { Eye } from "lucide-react";
import { useApp } from "../context/AppContext";
import { FONT } from "../constants/theme";

const AVISO_AMARELO = "#f59e0b";

export default function SimuladorLoginBanner() {
  const { simulacaoLogin, encerrarSimulacaoLogin, theme: t } = useApp();

  if (!simulacaoLogin) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 16px",
        fontSize: 13,
        fontFamily: FONT.body,
        color: t.text,
        background: `color-mix(in srgb, ${AVISO_AMARELO} 14%, ${t.cardBg})`,
        borderBottom: `1px solid color-mix(in srgb, ${AVISO_AMARELO} 35%, ${t.cardBorder})`,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <Eye size={15} color={AVISO_AMARELO} aria-hidden />
      <span>
        Você está visualizando a plataforma como{" "}
        <strong style={{ fontWeight: 700 }}>{simulacaoLogin.labelExibicao}</strong> (somente leitura).{" "}
        <button
          type="button"
          onClick={() => void encerrarSimulacaoLogin()}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--brand-primary, #7c3aed)",
            fontWeight: 700,
            fontFamily: FONT.body,
            fontSize: 13,
            textDecoration: "underline",
          }}
        >
          Clique aqui para voltar ao seu perfil
        </button>
        .
      </span>
    </div>
  );
}
