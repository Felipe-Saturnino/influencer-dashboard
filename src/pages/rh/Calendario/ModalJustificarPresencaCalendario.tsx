import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";

type Props = {
  open: boolean;
  onClose: () => void;
  t: Theme;
};

/** Placeholder até implementação do fluxo completo de justificativa. */
export function ModalJustificarPresencaCalendario({ open, onClose, t }: Props) {
  if (!open) return null;

  return (
    <ModalBase maxWidth={440} onClose={onClose} zIndex={1300}>
      <ModalHeader title="Justificar" onClose={onClose} />
      <p style={{ margin: 0, color: t.text, fontSize: 14, fontFamily: FONT.body, lineHeight: 1.55 }}>
        O fluxo de justificativa será disponibilizado em breve.
      </p>
      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontWeight: 700,
            fontFamily: FONT.body,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Fechar
        </button>
      </div>
    </ModalBase>
  );
}
