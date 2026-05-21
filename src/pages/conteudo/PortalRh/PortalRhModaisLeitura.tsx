import { CorpoHtmlPortalRh } from "../../../components/conteudo/CorpoHtmlPortalRh";
import { linhaMetaAutorPortalRh, type PortalRhAutorInfo } from "../../../lib/portalRhAutorMeta";
import { PortalRhAssetLink } from "./PortalRhAssetLink";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalRh } from "../../../lib/portalRhUi";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";

function ModalLinha({ label, children }: { label?: string; children: React.ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div style={{ marginBottom: 16 }}>
      {label ? (
        <div style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontFamily: FONT.body }}>
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function LinksMidiaAnexo({
  imagemPath,
  anexoPath,
  anexoNome,
}: {
  imagemPath: string | null | undefined;
  anexoPath: string | null | undefined;
  anexoNome: string | null | undefined;
}) {
  const { theme: t } = useApp();
  if (!imagemPath?.trim() && !anexoPath?.trim()) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT.body }}>
      {imagemPath?.trim() ? (
        <PortalRhAssetLink storagePath={imagemPath} label="Ver imagem" color={t.text} />
      ) : null}
      {anexoPath?.trim() ? (
        <PortalRhAssetLink
          storagePath={anexoPath}
          label={anexoNome?.trim() ? `Ver anexo (${anexoNome.trim()})` : "Ver anexo"}
          color={t.text}
        />
      ) : null}
    </div>
  );
}

export function ModalLerPolitica({
  titulo,
  introducao,
  corpo,
  imagemPath,
  anexoPath,
  anexoNome,
  autorInfo,
  dataPublicacao,
  aprovadorInfo,
  dataAprovacao,
  temAprovador,
  jaCiente,
  onClose,
  onLidoECiente,
}: {
  titulo: string;
  introducao: string | null | undefined;
  corpo: string | null | undefined;
  imagemPath: string | null | undefined;
  anexoPath: string | null | undefined;
  anexoNome: string | null | undefined;
  autorInfo: PortalRhAutorInfo | undefined;
  dataPublicacao: string | null | undefined;
  aprovadorInfo: PortalRhAutorInfo | undefined;
  dataAprovacao: string | null | undefined;
  temAprovador: boolean;
  jaCiente: boolean;
  onClose: () => void;
  onLidoECiente: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const intro = (introducao ?? "").trim();
  const html = (corpo ?? "").trim();

  return (
    <ModalBase onClose={onClose} maxWidth={600}>
      <ModalHeader title="Ler Política/Normativa" onClose={onClose} />
      <ModalLinha>
        <div style={{ fontSize: 18, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{titulo}</div>
      </ModalLinha>
      {intro ? (
        <ModalLinha label="Introdução">
          <p style={{ fontSize: 14, color: t.text, margin: 0, lineHeight: 1.5, fontFamily: FONT.body }}>{intro}</p>
        </ModalLinha>
      ) : null}
      {html ? (
        <ModalLinha label="Descrição">
          <CorpoHtmlPortalRh html={html} color={t.text} />
        </ModalLinha>
      ) : null}
      <ModalLinha label="Anexos">
        <LinksMidiaAnexo imagemPath={imagemPath} anexoPath={anexoPath} anexoNome={anexoNome} />
        {!imagemPath?.trim() && !anexoPath?.trim() ? (
          <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>—</span>
        ) : null}
      </ModalLinha>
      <ModalLinha>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0, fontFamily: FONT.body }}>
          Autor: {linhaMetaAutorPortalRh(autorInfo, dataPublicacao)}
        </p>
      </ModalLinha>
      {temAprovador ? (
        <ModalLinha>
          <p style={{ fontSize: 13, color: t.textMuted, margin: 0, fontFamily: FONT.body }}>
            Aprovador: {linhaMetaAutorPortalRh(aprovadorInfo, dataAprovacao)}
          </p>
        </ModalLinha>
      ) : null}
      {!jaCiente ? (
        <button
          type="button"
          onClick={onLidoECiente}
          style={{
            marginTop: 8,
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: ctaGradientPortalRh(brand),
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
      ) : null}
    </ModalBase>
  );
}

export function ModalVerAta({
  titulo,
  introducao,
  corpo,
  imagemPath,
  anexoPath,
  anexoNome,
  autorInfo,
  dataPublicacao,
  podeVer,
  onClose,
}: {
  titulo: string;
  introducao: string | null | undefined;
  corpo: string | null | undefined;
  imagemPath: string | null | undefined;
  anexoPath: string | null | undefined;
  anexoNome: string | null | undefined;
  autorInfo: PortalRhAutorInfo | undefined;
  dataPublicacao: string | null | undefined;
  podeVer: boolean;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const intro = (introducao ?? "").trim();
  const html = (corpo ?? "").trim();

  return (
    <ModalBase onClose={onClose} maxWidth={600}>
      <ModalHeader title="Ver Ata" onClose={onClose} />
      {!podeVer ? (
        <p style={{ fontSize: 14, color: t.textMuted, fontFamily: FONT.body }}>Acesso restrito a participantes desta reunião.</p>
      ) : (
        <>
          <ModalLinha>
            <div style={{ fontSize: 18, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{titulo}</div>
          </ModalLinha>
          {intro ? (
            <ModalLinha label="Introdução">
              <p style={{ fontSize: 14, color: t.text, margin: 0, lineHeight: 1.5, fontFamily: FONT.body }}>{intro}</p>
            </ModalLinha>
          ) : null}
          {html ? (
            <ModalLinha label="Descrição">
              <CorpoHtmlPortalRh html={html} color={t.text} />
            </ModalLinha>
          ) : null}
          <ModalLinha label="Anexos">
            <LinksMidiaAnexo imagemPath={imagemPath} anexoPath={anexoPath} anexoNome={anexoNome} />
            {!imagemPath?.trim() && !anexoPath?.trim() ? (
              <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>—</span>
            ) : null}
          </ModalLinha>
          <ModalLinha>
            <p style={{ fontSize: 13, color: t.textMuted, margin: 0, fontFamily: FONT.body }}>
              Autor: {linhaMetaAutorPortalRh(autorInfo, dataPublicacao)}
            </p>
          </ModalLinha>
        </>
      )}
    </ModalBase>
  );
}
