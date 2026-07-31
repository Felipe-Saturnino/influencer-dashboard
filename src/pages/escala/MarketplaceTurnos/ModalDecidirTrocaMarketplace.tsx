import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import {
  aprovarTrocaMarketplace,
  mensagemErroOfertaMarketplace,
  recusarTrocaMarketplace,
} from "../../../lib/escalaMarketplace";
import type { LinhaOfertaMarketplace } from "../../../lib/escalaTurnosUiConstants";

type DecisaoTroca = "aprovar" | "recusar";

type Props = {
  oferta: LinhaOfertaMarketplace | null;
  decisao: DecisaoTroca;
  onClose: () => void;
  onConcluida: () => void;
};

export function ModalDecidirTrocaMarketplace({
  oferta,
  decisao,
  onClose,
  onConcluida,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [ofertaExpirada, setOfertaExpirada] = useState(false);

  useEffect(() => {
    setErro(null);
    setGravando(false);
    setOfertaExpirada(false);
  }, [oferta?.id, decisao]);

  if (!oferta) return null;

  const aprovando = decisao === "aprovar";
  const titulo = aprovando ? "Aprovar troca" : "Recusar proposta";
  const acao = aprovando ? "Aprovar troca" : "Recusar proposta";

  async function confirmar() {
    setErro(null);
    setGravando(true);
    const res = aprovando
      ? await aprovarTrocaMarketplace(oferta!.id)
      : await recusarTrocaMarketplace(oferta!.id);
    setGravando(false);
    if ("error" in res) {
      setErro(mensagemErroOfertaMarketplace(res.error));
      if (res.error === "oferta_expirada") {
        setOfertaExpirada(true);
        onConcluida();
      }
      return;
    }
    onConcluida();
    onClose();
  }

  return (
    <ModalBase maxWidth={480} onClose={onClose} zIndex={1140}>
      <ModalHeader title={titulo} onClose={onClose} />
      <div style={{ padding: "4px 4px 0", color: t.text, fontFamily: FONT.body }}>
        <div
          style={{
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 14,
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          <div><strong>Seu dia:</strong> {oferta.dataOfertaIso} — {oferta.turnoOferta}</div>
          <div>
            <strong>Proposta de {oferta.comprador ?? "prestador"}:</strong>{" "}
            {oferta.dataInteresseIso ?? "—"} — {oferta.turnoInteresse ?? "—"}
          </div>
        </div>

        <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
          {aprovando
            ? "Ao aprovar, os dois dias serão trocados oficialmente nas escalas."
            : "Ao recusar, os dias serão liberados e a oferta voltará ao quadro de Ofertas de Troca."}
        </p>

        {erro ? (
          <p role="alert" aria-live="polite" style={{ margin: "0 0 12px", color: "#e84025", fontSize: 13 }}>
            {erro}
          </p>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.text,
              fontFamily: FONT.body,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={gravando || ofertaExpirada}
            onClick={() => void confirmar()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${aprovando ? brand.accent : "#e84025"}`,
              background: aprovando ? brand.accent : "#e84025",
              color: "#fff",
              fontFamily: FONT.body,
              fontWeight: 700,
              cursor: gravando ? "not-allowed" : "pointer",
              opacity: gravando ? 0.7 : 1,
            }}
          >
            {gravando ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" />
                Salvando…
              </span>
            ) : (
              acao
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
