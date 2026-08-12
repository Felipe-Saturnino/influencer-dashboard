import { useEffect, useState, type CSSProperties } from "react";
import { Lock, X } from "lucide-react";
import { ModalBase } from "../../../components/OperacoesModal";
import { CorpoHtmlPortalRh } from "../../../components/conteudo/CorpoHtmlPortalRh";
import { urlAssinadaPortalRhAsset } from "../../../lib/portalRhPostagemFiles";
import { linhaMetaAutorPortalRh, type PortalRhAutorInfo } from "../../../lib/portalRhAutorMeta";
import { PortalRhAssetLink } from "./PortalRhAssetLink";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalRh } from "../../../lib/portalRhUi";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";

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
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
        </div>
        {imgUrl ? (
          <button
            type="button"
            onClick={() => setImagemAmpliada(true)}
            aria-label={tooltipAcao("Ampliar imagem")}
            title={tooltipAcao("Ampliar imagem")}
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
            <img
              src={imgUrl}
              alt=""
              aria-hidden
              style={{
                width: 96,
                height: 96,
                objectFit: "cover",
                display: "block",
              }}
            />
          </button>
        ) : null}
      </div>

      {imagemAmpliada && imgUrl ? (
        <ModalBase onClose={() => setImagemAmpliada(false)} maxWidth={920} zIndex={1100}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setImagemAmpliada(false)}
              aria-label="Fechar imagem ampliada"
              title="Fechar imagem ampliada"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: t.textMuted,
                padding: 4,
              }}
            >
              <X size={22} aria-hidden />
            </button>
          </div>
          <img
            src={imgUrl}
            alt={titulo}
            style={{
              width: "100%",
              maxHeight: "min(80vh, 720px)",
              objectFit: "contain",
              borderRadius: 10,
              display: "block",
            }}
          />
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
  restrito,
  onAbrirAta,
  cardShadow,
}: {
  titulo: string;
  introducao: string | null | undefined;
  numero: number | null | undefined;
  autorInfo: PortalRhAutorInfo | undefined;
  dataPublicacao: string | null | undefined;
  restrito: boolean;
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
      {restrito ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
          <Lock size={14} aria-hidden />
          Acesso restrito a participantes
        </span>
      ) : null}
      <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{tituloExib}</div>
      {intro ? (
        <p style={{ fontSize: 13, color: t.textMuted, margin: "8px 0 0", lineHeight: 1.45 }}>{intro}</p>
      ) : null}
      <button
        type="button"
        onClick={onAbrirAta}
        disabled={restrito}
        style={{
          ...ctaOutline(t),
          marginTop: 14,
          opacity: restrito ? 0.5 : 1,
          cursor: restrito ? "not-allowed" : "pointer",
        }}
      >
        Ver Ata
      </button>
      <p style={{ fontSize: 12, color: t.textMuted, margin: "12px 0 0" }}>{linhaMetaAutorPortalRh(autorInfo, dataPublicacao)}</p>
    </div>
  );
}
