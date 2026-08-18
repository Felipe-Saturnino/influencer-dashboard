import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import {
  cancelarOfertaMarketplace,
  mensagemErroOfertaMarketplace,
} from "../../../lib/escalaMarketplace";
import {
  RH_CALENDARIO_ACAO_LABEL_FORMAL,
  type LinhaOfertaMarketplace,
} from "../../../lib/escalaTurnosUiConstants";
import type { RhCalendarioAcaoTipo } from "../../../lib/rhCalendarioAcaoHelpers";

type Props = {
  oferta: LinhaOfertaMarketplace | null;
  onClose: () => void;
  onCancelada: () => void;
};

export function ModalCancelarOfertaMarketplace({ oferta, onClose, onCancelada }: Props) {
  const { theme: t } = useApp();
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    setErro(null);
    setGravando(false);
  }, [oferta?.id]);

  if (!oferta) return null;

  const tipoLabel =
    RH_CALENDARIO_ACAO_LABEL_FORMAL[oferta.tipo as RhCalendarioAcaoTipo] ?? oferta.tipo;

  async function confirmar() {
    setGravando(true);
    setErro(null);
    const res = await cancelarOfertaMarketplace(oferta!.id);
    setGravando(false);
    if (!res.ok) {
      setErro(mensagemErroOfertaMarketplace(res.error));
      return;
    }
    onCancelada();
    onClose();
  }

  return (
    <ModalBase maxWidth={440} onClose={onClose} zIndex={1140}>
      <ModalHeader title="Cancelar oferta" onClose={onClose} />
      <div style={{ padding: "4px 4px 0", fontFamily: FONT.body, color: t.text }}>
        <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.55 }}>
          Deseja cancelar a oferta de {tipoLabel.toLowerCase()} do dia {oferta.dataOfertaIso} (
          {oferta.turnoOferta})?
        </p>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
          {oferta.status === "em_analise"
            ? "Cancelar encerra a oferta. A proposta do colega é descartada e a oferta não volta ao mural. A escala não muda."
            : "A oferta sai da lista de disponíveis e a sua escala não é alterada."}
        </p>

        {erro ? (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#e84025" }} role="alert" aria-live="polite">
            {erro}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            marginTop: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.text,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            Manter oferta
          </button>
          <button
            type="button"
            disabled={gravando}
            onClick={() => void confirmar()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "1px solid rgba(232,64,37,0.35)",
              background: "#e84025",
              color: "#fff",
              fontWeight: 700,
              cursor: gravando ? "not-allowed" : "pointer",
              fontFamily: FONT.body,
              opacity: gravando ? 0.7 : 1,
            }}
          >
            {gravando ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="#fff" />
                Salvando…
              </span>
            ) : (
              "Cancelar oferta"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
