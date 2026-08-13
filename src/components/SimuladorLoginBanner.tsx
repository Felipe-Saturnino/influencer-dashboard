import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { FONT } from "../constants/theme";

const AVISO_AMARELO = "#f59e0b";

export default function SimuladorLoginBanner() {
  const { simulacaoLogin, encerrarSimulacaoLogin, theme: t } = useApp();
  const [encerrando, setEncerrando] = useState(false);
  const [erro, setErro] = useState("");

  if (!simulacaoLogin) return null;

  async function encerrar() {
    if (encerrando) return;
    setErro("");
    setEncerrando(true);
    const falha = await encerrarSimulacaoLogin();
    setEncerrando(false);
    if (falha) setErro(falha);
  }

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
        <strong style={{ fontWeight: 700 }}>{simulacaoLogin.labelExibicao}</strong> (somente leitura). Sua conta
        não muda.{" "}
        <button
          type="button"
          onClick={() => void encerrar()}
          disabled={encerrando}
          aria-busy={encerrando}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: encerrando ? "default" : "pointer",
            color: "var(--brand-primary, #7c3aed)",
            fontWeight: 700,
            fontFamily: FONT.body,
            fontSize: 13,
            textDecoration: "underline",
          }}
        >
          {encerrando ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Loader2 className="app-lucide-spin" size={12} aria-hidden />
              Encerrando…
            </span>
          ) : (
            "Encerrar visualização"
          )}
        </button>
        .
      </span>
      {erro ? (
        <span role="alert" style={{ width: "100%", textAlign: "center", color: "#e84025", fontSize: 12 }}>
          {erro}
        </span>
      ) : null}
    </div>
  );
}
