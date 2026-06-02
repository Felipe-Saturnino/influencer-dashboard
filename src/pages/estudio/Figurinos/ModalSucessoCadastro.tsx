import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, ScanLine, XCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { baixarEtiquetaFigurinoPdf } from "../../../lib/rhFigurinoEtiquetaPdf";
import { supabase } from "../../../lib/supabase";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { Operadora } from "../../../types";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import type {
  RhFigurinoCondition,
  RhFigurinoEmprestimo,
  RhFigurinoPeca,
  RhFigurinoStatusHist,
  RhWithdrawalType,
} from "./types";
import {
  CATEGORIAS,
  TAMANHOS,
  TIPOS_MANUTENCAO,
  labelStatusHistorico,
  labelStatusPeca,
  labelTipoRetirada,
  type RhFigurinoTipoManutencao,
} from "./figurinosConstants";
import {
  actorLabel,
  ctaButtonContent,
  emprestimoFigurinoEhDoProprioLogin,
  fmtDataHora,
  fmtDataSóDia,
  labelEmprestadoParaTabela,
  labelOperadorasPeca,
  normNomeParaFiltroPrestadorFig,
  pecaSlugsOperadoras,
  labelCondicaoPeca,
} from "./figurinosPageHelpers";
import { BarcodeBlock } from "./BarcodeBlock";

export function ModalSucessoCadastro({
  peca,
  operadorasTexto,
  onClose,
}: {
  peca: RhFigurinoPeca;
  operadorasTexto: string;
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
          {peca.category} · {peca.size} · {operadorasTexto}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                await baixarEtiquetaFigurinoPdf(peca, operadorasTexto);
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
