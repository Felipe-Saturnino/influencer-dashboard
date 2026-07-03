import { useEffect, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { ModalBase } from "../../../components/OperacoesModal";
import { CorpoHtmlPortalRh } from "../../../components/conteudo/CorpoHtmlPortalRh";
import { truncPreviewHtml } from "../../../lib/academyPortalWorkflow";
import {
  isVideoPath,
  urlAssinadaAcademyPortalAsset,
} from "../../../lib/academyPortalPostagemFiles";
import {
  linhaMetaAutorPortalAcademy,
  type AcademyPortalAutorInfo,
} from "../../../lib/academyPortalAutorMeta";
import { PortalAcademyAssetLink } from "./PortalAcademyAssetLink";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalAcademy } from "../../../lib/academyPortalUi";
import { FONT, FONT_TITLE } from "../../../constants/theme";

const PREVIEW_LEN = 200;

function tagStyle(accent: string): CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: 6,
    background: `${accent}22`,
    color: accent,
  };
}

function btnCtaPrimario(brand: ReturnType<typeof useDashboardBrand>): CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: ctaGradientPortalAcademy(brand),
    color: "#fff",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: FONT.body,
  };
}

export type AcademyPortalCategoriaCard = {
  id: string;
  slug: string;
  label: string;
  accent_hex: string;
};

export function PostagemAcademyCard({
  titulo,
  corpo,
  introducao,
  categoria,
  jogoMesa,
  imagemStoragePath,
  anexoStoragePath,
  anexoNome,
  autorInfo,
  dataPublicacao,
  cardShadow,
  onVerCompleto,
  mostrarBotaoVer,
}: {
  titulo: string;
  corpo: string;
  introducao?: string | null;
  categoria: AcademyPortalCategoriaCard | null | undefined;
  jogoMesa?: string | null;
  imagemStoragePath: string | null | undefined;
  anexoStoragePath: string | null | undefined;
  anexoNome: string | null | undefined;
  autorInfo: AcademyPortalAutorInfo | undefined;
  dataPublicacao: string | null | undefined;
  cardShadow: string;
  onVerCompleto?: () => void;
  mostrarBotaoVer?: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const accent = categoria?.accent_hex ?? "#7c3aed";
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaAmpliada, setMediaAmpliada] = useState(false);
  const isVideo = isVideoPath(imagemStoragePath);

  useEffect(() => {
    let cancelled = false;
    if (!imagemStoragePath?.trim()) {
      setMediaUrl(null);
      return;
    }
    void urlAssinadaAcademyPortalAsset(imagemStoragePath).then((url) => {
      if (!cancelled) setMediaUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [imagemStoragePath]);

  const preview = mostrarBotaoVer && introducao?.trim()
    ? introducao.trim().slice(0, PREVIEW_LEN)
    : truncPreviewHtml(corpo, PREVIEW_LEN);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: t.cardBg,
        boxShadow: cardShadow,
        fontFamily: FONT.body,
      }}
    >
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
            {categoria ? <span style={tagStyle(accent)}>{categoria.label}</span> : null}
            {jogoMesa?.trim() ? <span style={tagStyle("#22c55e")}>{jogoMesa.trim()}</span> : null}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{titulo}</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 8, lineHeight: 1.45 }}>
            {mostrarBotaoVer && introducao?.trim() ? (
              <span>{preview}{introducao.length > PREVIEW_LEN ? "…" : ""}</span>
            ) : (
              <CorpoHtmlPortalRh html={preview} color={t.textMuted} />
            )}
          </div>
          {anexoStoragePath ? (
            <p style={{ margin: "10px 0 0", fontSize: 13, fontFamily: FONT.body }}>
              <PortalAcademyAssetLink
                storagePath={anexoStoragePath}
                label={anexoNome?.trim() ? `Ver anexo (${anexoNome.trim()})` : "Ver anexo"}
                color={t.text}
              />
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 14 }}>
            {mostrarBotaoVer && onVerCompleto ? (
              <button type="button" onClick={onVerCompleto} style={btnCtaPrimario(brand)}>
                Ver conteúdo
              </button>
            ) : null}
            <span style={{ fontSize: 12, color: t.textMuted }}>
              {linhaMetaAutorPortalAcademy(autorInfo, dataPublicacao)}
            </span>
          </div>
        </div>
        {mediaUrl ? (
          <button
            type="button"
            onClick={() => setMediaAmpliada(true)}
            aria-label={tooltipAcao("Ampliar mídia")}
            title={tooltipAcao("Ampliar mídia")}
            style={{
              padding: 0,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 10,
              background: "transparent",
              cursor: "zoom-in",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {isVideo ? (
              <video
                src={mediaUrl}
                aria-hidden
                style={{ width: 96, height: 96, objectFit: "cover", display: "block" }}
                muted
              />
            ) : (
              <img
                src={mediaUrl}
                alt=""
                aria-hidden
                style={{ width: 96, height: 96, objectFit: "cover", display: "block" }}
              />
            )}
          </button>
        ) : null}
      </div>

      {mediaAmpliada && mediaUrl ? (
        <ModalBase onClose={() => setMediaAmpliada(false)} maxWidth={920} zIndex={1100}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setMediaAmpliada(false)}
              aria-label="Fechar modal"
              title="Fechar modal"
              style={{ border: "none", background: "transparent", cursor: "pointer", color: t.textMuted, padding: 4 }}
            >
              <X size={22} aria-hidden />
            </button>
          </div>
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              style={{ width: "100%", maxHeight: "min(80dvh, 720px)", borderRadius: 10, display: "block" }}
            />
          ) : (
            <img
              src={mediaUrl}
              alt={titulo}
              style={{ width: "100%", maxHeight: "min(80dvh, 720px)", objectFit: "contain", borderRadius: 10, display: "block" }}
            />
          )}
        </ModalBase>
      ) : null}
    </div>
  );
}
