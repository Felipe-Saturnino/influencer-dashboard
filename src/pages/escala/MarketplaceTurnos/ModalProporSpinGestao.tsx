import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  MARKETPLACE_OFERTANTE_SPIN_LABEL,
  mensagemErroOfertaMarketplace,
  proporSpinGestaoMarketplace,
} from "../../../lib/escalaMarketplace";
import type { LinhaOfertaMarketplace } from "../../../lib/escalaTurnosUiConstants";

type Props = {
  oferta: LinhaOfertaMarketplace | null;
  onClose: () => void;
  onProposta: () => void;
};

export function ModalProporSpinGestao({ oferta, onClose, onProposta }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    setErro(null);
    setGravando(false);
  }, [oferta?.id]);

  if (!oferta) return null;

  const ofertaAtual = oferta;
  const ehFolga = ofertaAtual.tipo === "venda_folga";

  async function confirmar() {
    setGravando(true);
    const res = await proporSpinGestaoMarketplace(ofertaAtual.id);
    setGravando(false);
    if (!res.ok) {
      setErro(mensagemErroOfertaMarketplace(res.error));
      return;
    }
    onProposta();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title="Propor compra Spin" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", fontFamily: FONT.body, fontSize: 13, color: t.text }}>
        <p style={{ margin: "0 0 12px", lineHeight: 1.5 }}>
          A proposta será enviada em nome de <strong>{MARKETPLACE_OFERTANTE_SPIN_LABEL}</strong>.
          O ofertante precisa aprovar antes de a escala ser atualizada.
        </p>
        <ul style={{ margin: "0 0 16px", paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Ofertante: {ofertaAtual.ofertante}</li>
          <li>Dia: {ofertaAtual.dataOfertaIso}</li>
          <li>Turno: {ofertaAtual.turnoOferta}</li>
        </ul>
        {ehFolga ? (
          <p style={{ margin: "0 0 12px", color: t.textMuted, fontSize: 12 }}>
            Se aprovado, o prestador assume o turno (Compra) neste dia — contraparte Spin Gaming.
          </p>
        ) : (
          <p style={{ margin: "0 0 12px", color: t.textMuted, fontSize: 12 }}>
            Se aprovado, o prestador libera o turno (Venda) neste dia — contraparte Spin Gaming.
          </p>
        )}
        {erro ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 12 }}>
            {erro}
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={gravando}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: getCtaCriarGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: gravando ? "wait" : "pointer",
              fontFamily: FONT.body,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {gravando ? (
              <>
                <Loader2 size={14} className="app-lucide-spin" aria-hidden />
                Enviando…
              </>
            ) : (
              "Enviar proposta"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
