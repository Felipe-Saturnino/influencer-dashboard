import { useState } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { FONT_TITLE } from "../../../lib/dashboardConstants"
import { baixarEtiquetaFigurinoPdf } from "../../../lib/rhFigurinoEtiquetaPdf"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles"
import { type RhFigurinoPeca } from "./types"
import { ctaButtonContent } from "./figurinosPageHelpers"
import { BarcodeBlock } from "./BarcodeBlock"

export function ModalSucessoCadastro({
  peca,
  estudiosTexto,
  onClose,
}: {
  peca: RhFigurinoPeca;
  estudiosTexto: string;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [pdfLoading, setPdfLoading] = useState(false);

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Peça cadastrada" onClose={onClose} />
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            marginBottom: 14,
          }}
        >
          <BarcodeBlock value={peca.barcode} />
        </div>
        <p style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 800, color: brand.primary, margin: "8px 0" }}>{peca.code}</p>
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: t.text, margin: "4px 0 16px" }}>
          {peca.category} · {peca.size} · {estudiosTexto}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                await baixarEtiquetaFigurinoPdf(peca, estudiosTexto);
              } finally {
                setPdfLoading(false);
              }
            }}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: getCtaCriarGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: pdfLoading ? "not-allowed" : "pointer",
            }}
          >
            {ctaButtonContent(pdfLoading, "Baixar etiqueta (PDF)", "Gerando PDF…")}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.textMuted,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
