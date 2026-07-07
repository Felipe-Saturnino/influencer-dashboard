import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CorpoHtmlPortalRh } from "../../../components/conteudo/CorpoHtmlPortalRh";
import { PortalAcademyAssetLink } from "./PortalAcademyAssetLink";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalAcademy } from "../../../lib/academyPortalUi";
import { FONT, FONT_TITLE } from "../../../constants/theme";

export function ModalLerConteudo({
  open,
  titulo,
  introducao,
  corpo,
  anexoStoragePath,
  anexoNome,
  exigeCiencia = false,
  jaCiente = false,
  onClose,
  onLidoECiente,
}: {
  open: boolean;
  titulo: string;
  introducao: string | null | undefined;
  corpo: string;
  anexoStoragePath: string | null | undefined;
  anexoNome: string | null | undefined;
  exigeCiencia?: boolean;
  jaCiente?: boolean;
  onClose: () => void;
  onLidoECiente?: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  if (!open) return null;

  return (
    <ModalBase maxWidth={720} onClose={onClose} zIndex={1100}>
      <ModalHeader title="Ler manual" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "min(75dvh, 640px)", overflowY: "auto" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{titulo}</div>
        {introducao?.trim() ? (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: t.textMuted,
                marginBottom: 8,
                fontFamily: FONT.body,
              }}
            >
              Introdução
            </div>
            <p style={{ fontSize: 13, color: t.text, lineHeight: 1.55, margin: 0, fontFamily: FONT.body, whiteSpace: "pre-wrap" }}>
              {introducao.trim()}
            </p>
          </div>
        ) : null}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: t.textMuted,
              marginBottom: 8,
              fontFamily: FONT.body,
            }}
          >
            Descrição
          </div>
          <div style={{ fontSize: 14, color: t.text, lineHeight: 1.55, fontFamily: FONT_TITLE }}>
            <CorpoHtmlPortalRh html={corpo} color={t.text} />
          </div>
        </div>
        {anexoStoragePath ? (
          <p style={{ margin: 0, fontSize: 13, fontFamily: FONT.body }}>
            <PortalAcademyAssetLink
              storagePath={anexoStoragePath}
              label={anexoNome?.trim() ? `Ver anexo (${anexoNome.trim()})` : "Ver anexo"}
              color={t.text}
            />
          </p>
        ) : null}
      </div>
      {!exigeCiencia || jaCiente || !onLidoECiente ? null : (
        <button
          type="button"
          onClick={onLidoECiente}
          style={{
            marginTop: 16,
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: ctaGradientPortalAcademy(brand),
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: FONT.body,
            width: "100%",
          }}
        >
          Lido e Ciente
        </button>
      )}
    </ModalBase>
  );
}
