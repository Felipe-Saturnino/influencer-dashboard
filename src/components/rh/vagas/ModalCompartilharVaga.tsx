import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { ModalBase, ModalHeader } from "../../OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";

/** Página pública de Carreiras (site Spin) — link de divulgação de vagas externas. */
export const RH_VAGAS_CARREIRAS_URL = "https://spingaming.com.br/carreiras/";

type Props = {
  vagaTitulo: string;
  onClose: () => void;
};

export function ModalCompartilharVaga({ vagaTitulo, onClose }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [copiado, setCopiado] = useState(false);
  const [erroCopia, setErroCopia] = useState<string | null>(null);

  useEffect(() => {
    if (!copiado) return;
    const id = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(id);
  }, [copiado]);

  const copiar = async () => {
    setErroCopia(null);
    try {
      await navigator.clipboard.writeText(RH_VAGAS_CARREIRAS_URL);
      setCopiado(true);
    } catch (e: unknown) {
      console.error("[Vagas] Erro ao copiar link Carreiras:", e);
      setErroCopia("Não foi possível copiar o link. Selecione o endereço e copie manualmente.");
    }
  };

  const linkStripBg = t.isDark ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)" : brand.primaryTransparentBg;
  const linkStripBorder = brand.primaryTransparentBorder;

  return (
    <ModalBase maxWidth={520} onClose={onClose}>
      <ModalHeader title="Compartilhar" onClose={onClose} />

      {vagaTitulo.trim() ? (
        <p style={{ margin: "0 0 14px", fontSize: 14, color: t.textMuted, lineHeight: 1.5, fontFamily: FONT.body }}>
          Vaga: <strong style={{ color: t.text }}>{vagaTitulo.trim()}</strong>
        </p>
      ) : null}

      <p style={{ margin: "0 0 10px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
        Link da página de Carreiras no site da Spin:
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 10, marginBottom: 18 }}>
        <div
          style={{
            flex: "1 1 240px",
            minWidth: 0,
            padding: "12px 14px",
            borderRadius: 12,
            border: linkStripBorder,
            background: linkStripBg,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            color: t.text,
            wordBreak: "break-all",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "center",
          }}
        >
          {RH_VAGAS_CARREIRAS_URL}
        </div>
        <button
          type="button"
          onClick={() => void copiar()}
          aria-label={copiado ? "Link copiado" : "Copiar link"}
          title={copiado ? "Link copiado" : "Copiar link"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            borderRadius: 12,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            color: t.text,
            fontWeight: 600,
            fontSize: 13,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          {copiado ? <Check size={18} color="#22c55e" aria-hidden /> : <Copy size={18} aria-hidden />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>

      {erroCopia ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
        >
          {erroCopia}
        </div>
      ) : null}

      <div
        style={{
          padding: "14px 16px",
          borderRadius: 12,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          marginBottom: 20,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
          As vagas estão disponíveis no site da Spin. Para o recebimento do bônus, o candidato deve preencher o
          formulário e, no campo <strong>«Como chegou até nós?»</strong>, selecionar{" "}
          <strong>Indicação</strong>. Em <strong>«Quem indicou?»</strong>, deve informar o nome do Prestador.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          padding: "10px 18px",
          borderRadius: 10,
          border: "none",
          background: getCtaCriarGradient(brand),
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          fontFamily: FONT.body,
          cursor: "pointer",
        }}
      >
        Fechar
      </button>
    </ModalBase>
  );
}
