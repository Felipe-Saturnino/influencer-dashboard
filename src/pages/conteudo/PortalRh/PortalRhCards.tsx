import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CorpoHtmlPortalRh } from "../../../components/conteudo/CorpoHtmlPortalRh";
import { urlAssinadaPortalRhAsset } from "../../../lib/portalRhPostagemFiles";
import { linhaMetaAutorPortalRh, type PortalRhAutorInfo } from "../../../lib/portalRhAutorMeta";
import { PortalRhAssetLink } from "./PortalRhAssetLink";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalRh } from "../../../lib/portalRhUi";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";

/** Preview no card — legível para infográficos (antes 96×96 com crop). */
const COMUNICADO_IMG_PREVIEW_PX = 220;
/** Lightbox: usa quase a viewport (sem teto 720px). */
const COMUNICADO_IMG_LIGHTBOX_MAX_W = 1280;

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

function tagNovoStyle(): CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: 6,
    background: "#a78bfa33",
    color: "#a78bfa",
  };
}

function ctaOutline(t: ReturnType<typeof useApp>["theme"]): CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 35%, transparent)",
    background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)",
    color: t.text,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: FONT.body,
  };
}

function btnCtaPrimario(brand: ReturnType<typeof useDashboardBrand>): CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: ctaGradientPortalRh(brand),
    color: "#fff",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: FONT.body,
  };
}

export type RhPortalCategoriaCard = {
  id: string;
  slug: string;
  label: string;
  accent_hex: string;
};

export function ComunicadoCard({
  titulo,
  corpo,
  categoria,
  imagemStoragePath,
  anexoStoragePath,
  anexoNome,
  autorInfo,
  dataPublicacao,
  isNovo,
  onMarcarLido,
  podeVerLidos,
  onVerLidos,
  cardShadow,
  reacoes,
}: {
  titulo: string;
  corpo: string;
  categoria: RhPortalCategoriaCard | null | undefined;
  imagemStoragePath: string | null | undefined;
  anexoStoragePath: string | null | undefined;
  anexoNome: string | null | undefined;
  autorInfo: PortalRhAutorInfo | undefined;
  dataPublicacao: string | null | undefined;
  isNovo: boolean;
  onMarcarLido: () => void;
  /** Editar = Sim — lista quem registrou leitura. */
  podeVerLidos?: boolean;
  onVerLidos?: () => void;
  cardShadow: string;
  reacoes?: ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const accent = categoria?.accent_hex ?? "#7c3aed";
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imagemAmpliada, setImagemAmpliada] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!imagemStoragePath?.trim()) {
      setImgUrl(null);
      return;
    }
    void urlAssinadaPortalRhAsset(imagemStoragePath).then((url) => {
      if (!cancelled) setImgUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [imagemStoragePath]);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        borderLeft: isNovo ? `3px solid ${accent}` : undefined,
        background: t.cardBg,
        boxShadow: cardShadow,
        fontFamily: FONT.body,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
            {categoria ? <span style={tagStyle(accent)}>{categoria.label}</span> : null}
            {isNovo ? <span style={tagNovoStyle()}>Novo</span> : null}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{titulo}</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 8, lineHeight: 1.45 }}>
            <CorpoHtmlPortalRh html={corpo} color={t.textMuted} />
          </div>
          {anexoStoragePath ? (
            <p style={{ margin: "10px 0 0", fontSize: 13, fontFamily: FONT.body }}>
              <PortalRhAssetLink
                storagePath={anexoStoragePath}
                label={anexoNome?.trim() ? `Ver arquivo (${anexoNome.trim()})` : "Ver arquivo"}
                color={t.text}
              />
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 14 }}>
            {isNovo ? (
              <button
                type="button"
                onClick={onMarcarLido}
                aria-label={`Marcar como lido: ${titulo}`}
                style={btnCtaPrimario(brand)}
              >
                Lido
              </button>
            ) : null}
            {podeVerLidos && onVerLidos ? (
              <button
                type="button"
                onClick={onVerLidos}
                aria-label={`Ver quem leu: ${titulo}`}
                title={tooltipAcao("Ver Lidos")}
                style={ctaOutline(t)}
              >
                Ver Lidos
              </button>
            ) : null}
            <span style={{ fontSize: 12, color: t.textMuted }}>{linhaMetaAutorPortalRh(autorInfo, dataPublicacao)}</span>
          </div>
          {reacoes ? <div style={{ marginTop: 12 }}>{reacoes}</div> : null}
        </div>
        {imgUrl ? (
          <button
            type="button"
            onClick={() => setImagemAmpliada(true)}
            aria-label={tooltipAcao("Ampliar imagem")}
            title={tooltipAcao("Ampliar imagem")}
            style={{
              padding: 8,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              background: t.inputBg,
              cursor: "zoom-in",
              flex: `0 1 ${COMUNICADO_IMG_PREVIEW_PX}px`,
              width: COMUNICADO_IMG_PREVIEW_PX,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <img
              src={imgUrl}
              alt=""
              aria-hidden
              style={{
                width: "100%",
                height: COMUNICADO_IMG_PREVIEW_PX - 16,
                objectFit: "contain",
                display: "block",
              }}
            />
          </button>
        ) : null}
      </div>

      {imagemAmpliada && imgUrl ? (
        <ModalBase
          onClose={() => setImagemAmpliada(false)}
          maxWidth={COMUNICADO_IMG_LIGHTBOX_MAX_W}
          zIndex={1100}
        >
          <ModalHeader title={titulo} onClose={() => setImagemAmpliada(false)} />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: t.inputBg,
              borderRadius: 12,
              padding: 8,
              minHeight: 200,
            }}
          >
            <img
              src={imgUrl}
              alt={titulo}
              style={{
                width: "auto",
                maxWidth: "100%",
                height: "auto",
                maxHeight: "calc(90dvh - 96px)",
                objectFit: "contain",
                borderRadius: 8,
                display: "block",
              }}
            />
          </div>
        </ModalBase>
      ) : null}
    </div>
  );
}

export function PoliticaCard({
  titulo,
  introducao,
  categoria,
  autorInfo,
  dataPublicacao,
  isNovo,
  onAbrirLeitura,
  cardShadow,
}: {
  titulo: string;
  introducao: string | null | undefined;
  categoria: RhPortalCategoriaCard | null | undefined;
  autorInfo: PortalRhAutorInfo | undefined;
  dataPublicacao: string | null | undefined;
  isNovo: boolean;
  onAbrirLeitura: () => void;
  cardShadow: string;
}) {
  const { theme: t } = useApp();
  const accent = categoria?.accent_hex ?? "#7c3aed";
  const intro = (introducao ?? "").trim();

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        borderLeft: isNovo ? `3px solid ${accent}` : undefined,
        background: t.cardBg,
        boxShadow: cardShadow,
        fontFamily: FONT.body,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
        {categoria ? <span style={tagStyle(accent)}>{categoria.label}</span> : null}
        {isNovo ? <span style={tagNovoStyle()}>Novo</span> : null}
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{titulo}</div>
      {intro ? (
        <p style={{ fontSize: 13, color: t.textMuted, margin: "8px 0 0", lineHeight: 1.45 }}>{intro}</p>
      ) : null}
      <button type="button" onClick={onAbrirLeitura} style={{ ...ctaOutline(t), marginTop: 14 }}>
        Ler Política/Normativa
      </button>
      <p style={{ fontSize: 12, color: t.textMuted, margin: "12px 0 0" }}>{linhaMetaAutorPortalRh(autorInfo, dataPublicacao)}</p>
    </div>
  );
}

export function RhTalkCard({
  titulo,
  introducao,
  numero,
  autorInfo,
  dataPublicacao,
  onAbrirAta,
  cardShadow,
}: {
  titulo: string;
  introducao: string | null | undefined;
  numero: number | null | undefined;
  autorInfo: PortalRhAutorInfo | undefined;
  dataPublicacao: string | null | undefined;
  onAbrirAta: () => void;
  cardShadow: string;
}) {
  const { theme: t } = useApp();
  const intro = (introducao ?? "").trim();
  const tituloExib = numero != null ? `RH Talk #${numero} — ${titulo}` : titulo;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        borderLeft: "3px solid #a78bfa",
        background: t.cardBg,
        boxShadow: cardShadow,
        fontFamily: FONT.body,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{tituloExib}</div>
      {intro ? (
        <p style={{ fontSize: 13, color: t.textMuted, margin: "8px 0 0", lineHeight: 1.45 }}>{intro}</p>
      ) : null}
      <button type="button" onClick={onAbrirAta} style={{ ...ctaOutline(t), marginTop: 14 }}>
        Ver Ata
      </button>
      <p style={{ fontSize: 12, color: t.textMuted, margin: "12px 0 0" }}>{linhaMetaAutorPortalRh(autorInfo, dataPublicacao)}</p>
    </div>
  );
}
