import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  aceitarOfertaSpinMarketplace,
  mensagemErroOfertaMarketplace,
  type MarketplaceMeuContexto,
  type MarketplaceMinhaGrade,
} from "../../../lib/escalaMarketplace";
import {
  RH_CALENDARIO_ACAO_LABEL_FORMAL,
  type LinhaOfertaMarketplace,
} from "../../../lib/escalaTurnosUiConstants";
import { turnoOperacionalValorGrade, valorCelulaEhFolgaOperacional } from "../../../lib/rhCalendarioAcaoHelpers";

type Props = {
  oferta: LinhaOfertaMarketplace | null;
  onClose: () => void;
  onAceita: () => void;
  contexto: MarketplaceMeuContexto | null;
  grade: MarketplaceMinhaGrade;
};

export function ModalAceitarOfertaSpin({
  oferta,
  onClose,
  onAceita,
  contexto,
  grade,
}: Props) {
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
  const ehCobertura = ofertaAtual.tipo === "oferta_spin_cobertura";
  const celula = (grade.valorPorIso.get(ofertaAtual.dataOfertaIso) ?? "").trim();
  const turnoCelula = celula ? turnoOperacionalValorGrade(celula) : null;

  function validar(): string | null {
    if (!contexto?.funcionarioId) {
      return "Não encontramos o seu cadastro de prestador de estúdio. Entre em contato com o suporte.";
    }
    if (ehCobertura) {
      if (!valorCelulaEhFolgaOperacional(celula)) {
        return "Você precisa estar de folga neste dia para aceitar esta cobertura.";
      }
    } else if (!turnoCelula) {
      return "Você precisa estar escalado neste dia para aceitar esta oferta.";
    } else if (turnoCelula !== ofertaAtual.turnoOferta) {
      return "O turno da oferta não coincide com o seu turno neste dia.";
    }
    return null;
  }

  async function confirmar() {
    const msg = validar();
    if (msg) {
      setErro(msg);
      return;
    }
    setGravando(true);
    const res = await aceitarOfertaSpinMarketplace(ofertaAtual.id);
    setGravando(false);
    if (!res.ok) {
      setErro(mensagemErroOfertaMarketplace(res.error));
      return;
    }
    onAceita();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title="Aceitar oferta Spin" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", fontFamily: FONT.body, fontSize: 13, color: t.text }}>
        <p style={{ margin: "0 0 12px", lineHeight: 1.5 }}>
          Ao confirmar, a escala é atualizada na hora — sem aprovação do ofertante. A contraparte
          operacional é <strong>Spin Gaming</strong>.
        </p>
        <ul style={{ margin: "0 0 16px", paddingLeft: 18, lineHeight: 1.6 }}>
          <li>
            Tipo:{" "}
            {RH_CALENDARIO_ACAO_LABEL_FORMAL[ofertaAtual.tipo as keyof typeof RH_CALENDARIO_ACAO_LABEL_FORMAL] ??
              ofertaAtual.tipo}
          </li>
          <li>Dia: {ofertaAtual.dataOfertaIso}</li>
          <li>Turno: {ofertaAtual.turnoOferta}</li>
          <li>Estúdio: {ofertaAtual.estudio ?? "—"}</li>
          <li>Ofertante: {ofertaAtual.ofertante}</li>
        </ul>
        {ehCobertura ? (
          <p style={{ margin: "0 0 12px", color: t.textMuted, fontSize: 12 }}>
            Você assumirá o turno (Compra - {ofertaAtual.turnoOferta}) neste dia.
          </p>
        ) : (
          <p style={{ margin: "0 0 12px", color: t.textMuted, fontSize: 12 }}>
            Você liberará o turno (Venda) neste dia.
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
                Confirmando…
              </>
            ) : (
              "Confirmar aceite"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
