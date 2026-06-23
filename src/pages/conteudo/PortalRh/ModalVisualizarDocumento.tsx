import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalRh } from "../../../lib/portalRhUi";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { urlAssinadaPortalRhAsset } from "../../../lib/portalRhPostagemFiles";
import {
  labelClassificacaoDocumento,
  labelTipoDocumentoPortal,
  tagTipoDocumentoCor,
  type RhDocumentoClassificacao,
  type RhDocumentoTipo,
} from "../../../lib/portalRhDocumentoNormativo";

const RODAPE_CIENCIA_TEXTO =
  "Ciência obrigatória. Ao confirmar, você declara ter lido o documento oficial (PDF) e estar ciente das regras aplicáveis.";

export function ModalVisualizarDocumento({
  codigo,
  versao,
  titulo,
  tipoDocumento,
  classificacao,
  pdfPath,
  pdfNome,
  exigeCiencia,
  jaCiente,
  onClose,
  onCiente,
}: {
  codigo: string | null;
  versao: string | null;
  titulo: string;
  tipoDocumento: RhDocumentoTipo | null;
  classificacao: RhDocumentoClassificacao | null;
  pdfPath: string | null;
  pdfNome: string | null;
  exigeCiencia: boolean;
  jaCiente: boolean;
  onClose: () => void;
  onCiente: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingPdf(true);
    void (async () => {
      const url = await urlAssinadaPortalRhAsset(pdfPath);
      if (!cancelled) {
        setPdfUrl(url);
        setLoadingPdf(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfPath]);

  const tagCor = tagTipoDocumentoCor(tipoDocumento);
  const tituloModal = [codigo?.trim(), titulo.trim(), versao?.trim()].filter(Boolean).join(" - ") || titulo;

  return (
    <ModalBase onClose={onClose} maxWidth={960}>
      <div style={{ margin: "-28px" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.cardBorder}` }}>
          <ModalHeader title={tituloModal} onClose={onClose} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 10 }}>
            {tipoDocumento ? (
              <span
                style={{
                  display: "inline-flex",
                  padding: "3px 9px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  background: `${tagCor}22`,
                  color: tagCor,
                  border: `1px solid ${tagCor}44`,
                }}
              >
                {labelTipoDocumentoPortal(tipoDocumento)}
              </span>
            ) : null}
            {classificacao ? (
              <span
                style={{
                  display: "inline-flex",
                  padding: "3px 9px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  background: t.inputBg,
                  color: t.text,
                  border: `1px solid ${t.cardBorder}`,
                }}
              >
                {labelClassificacaoDocumento(classificacao)}
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ background: "#525659", display: "flex", flexDirection: "column", minHeight: 480 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              color: "#fff",
              fontSize: 12,
              borderBottom: "1px solid rgba(255,255,255,.12)",
            }}
          >
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pdfNome ?? "Documento PDF"}
            </span>
            {pdfUrl ? (
              <>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,.25)",
                  }}
                >
                  <ExternalLink size={13} aria-hidden />
                  Nova aba
                </a>
                <a
                  href={pdfUrl}
                  download={pdfNome ?? undefined}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,.25)",
                  }}
                >
                  <Download size={13} aria-hidden />
                  Baixar
                </a>
              </>
            ) : null}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "stretch", justifyContent: "center", padding: 12, minHeight: 420 }}>
            {loadingPdf ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", color: "#fff" }}>
                <Loader2 size={22} className="app-lucide-spin" aria-hidden />
                <span style={{ marginLeft: 8, fontSize: 13 }}>Carregando PDF…</span>
              </div>
            ) : pdfUrl ? (
              <iframe
                title={`Visualização de ${titulo}`}
                src={pdfUrl}
                style={{ width: "100%", minHeight: 420, border: "none", borderRadius: 4, background: "#fff" }}
              />
            ) : (
              <div style={{ color: "#fff", fontSize: 13, alignSelf: "center" }}>Não foi possível carregar o PDF.</div>
            )}
          </div>
        </div>

        {exigeCiencia ? (
          <div
            style={{
              padding: "14px 20px",
              borderTop: `1px solid ${t.cardBorder}`,
              background: "color-mix(in srgb, #f59e0b 8%, #fff)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <p style={{ fontSize: 12, color: t.text, margin: 0, flex: 1, minWidth: 240, fontFamily: FONT.body }}>
              {jaCiente ? (
                <strong style={{ color: "#22c55e" }}>Ciência registrada.</strong>
              ) : (
                RODAPE_CIENCIA_TEXTO
              )}
            </p>
            {!jaCiente ? (
              <button
                type="button"
                onClick={onCiente}
                style={{
                  background: ctaGradientPortalRh(brand),
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  flexShrink: 0,
                }}
              >
                Li e estou ciente
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ModalBase>
  );
}
