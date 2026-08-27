import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import {
  aprovarTrocaMarketplace,
  desistirOfertaMarketplace,
  mensagemErroOfertaMarketplace,
  recusarTrocaMarketplace,
} from "../../../lib/escalaMarketplace";
import type { LinhaOfertaMarketplace } from "../../../lib/escalaTurnosUiConstants";

export type DecisaoOfertaMarketplace = "aprovar" | "recusar" | "desistir";

type Props = {
  oferta: LinhaOfertaMarketplace | null;
  decisao: DecisaoOfertaMarketplace;
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

  const ehTroca = oferta.tipo === "oferta_troca";
  const propostaSpin = oferta.propostaSpinGestao === true;
  const aprovando = decisao === "aprovar";
  const desistindo = decisao === "desistir";

  const titulo = desistindo
    ? "Desistir da proposta"
    : aprovando
      ? ehTroca
        ? "Aprovar troca"
        : propostaSpin
          ? "Aprovar proposta Spin"
          : "Aprovar compra"
      : "Recusar proposta";
  const acao = titulo;

  const corpo = desistindo
    ? propostaSpin
      ? "Ao desistir, a proposta da Spin Gaming é retirada e a oferta volta ao mural. A escala não muda."
      : "Ao desistir, a oferta volta ao mural para outros colegas. A escala não muda."
    : aprovando
      ? ehTroca
        ? "Ao aprovar, os dois dias serão atualizados nas escalas (Compra - Turno e Venda). Sem aprovação de gestor."
        : propostaSpin
          ? oferta.tipo === "venda_folga"
            ? "Ao aprovar, você assume o turno (Compra) neste dia. A contraparte é Spin Gaming — sem outro prestador na escala."
            : "Ao aprovar, você libera o turno (Venda) neste dia. A contraparte é Spin Gaming — a vaga fica com a operação."
          : "Ao aprovar, a escala é atualizada: Compra - Turno para quem assume e Venda para quem sai. Sem aprovação de gestor."
      : "Ao recusar, a oferta volta ao mural. A escala não muda.";

  async function confirmar() {
    setErro(null);
    setGravando(true);
    const res = desistindo
      ? await desistirOfertaMarketplace(oferta!.id)
      : aprovando
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
          <div>
            <strong>{ehTroca ? "Seu dia:" : "Dia da oferta:"}</strong> {oferta.dataOfertaIso} —{" "}
            {oferta.turnoOferta}
          </div>
          {ehTroca || oferta.dataInteresseIso ? (
            <div>
              <strong>
                {desistindo ? "Sua proposta:" : `Proposta de ${oferta.comprador ?? "prestador"}:`}
              </strong>{" "}
              {oferta.dataInteresseIso ?? oferta.dataOfertaIso} — {oferta.turnoInteresse ?? oferta.turnoOferta}
            </div>
          ) : (
            <div>
              <strong>{desistindo ? "Ofertante:" : "Proposta de:"}</strong>{" "}
              {desistindo ? oferta.ofertante : (oferta.comprador ?? "prestador")}
            </div>
          )}
        </div>

        <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
          {corpo}
        </p>

        {erro ? (
          <p role="alert" aria-live="polite" style={{ margin: "0 0 12px", color: "#e84025", fontSize: 13 }}>
            {erro}
          </p>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
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
