import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { FONT } from "../constants/theme";
import { getCtaCriarGradient } from "../lib/ctaCriarStyles";
import {
  REVISAO_CADASTRO_GATE_MODAL_CTA,
  REVISAO_CADASTRO_HOME_MENSAGEM,
  tituloAtualizacaoCadastralPendente,
} from "../lib/rhCadastroRevisao";
import { ModalBase, ModalHeader } from "./OperacoesModal";

export function RevisaoCadastralGateModal({
  primeiroNome,
  onClose,
  onIrParaDadosCadastro,
}: {
  primeiroNome: string;
  onClose: () => void;
  onIrParaDadosCadastro: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  return (
    <ModalBase maxWidth={480} onClose={onClose} zIndex={1100}>
      <ModalHeader title={tituloAtualizacaoCadastralPendente(primeiroNome)} onClose={onClose} />
      <p
        style={{
          margin: "0 0 20px",
          fontSize: 13,
          lineHeight: 1.55,
          color: t.text,
          fontFamily: FONT.body,
        }}
      >
        {REVISAO_CADASTRO_HOME_MENSAGEM}
      </p>
      <button
        type="button"
        onClick={onIrParaDadosCadastro}
        style={{
          width: "100%",
          padding: "10px 20px",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          fontFamily: FONT.body,
          fontSize: 13,
          fontWeight: 700,
          color: "#fff",
          background: getCtaCriarGradient(brand),
        }}
      >
        {REVISAO_CADASTRO_GATE_MODAL_CTA}
      </button>
    </ModalBase>
  );
}
