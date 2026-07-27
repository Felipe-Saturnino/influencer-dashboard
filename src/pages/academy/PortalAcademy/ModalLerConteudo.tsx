import { useEffect, useState } from "react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CorpoHtmlPortalRh } from "../../../components/conteudo/CorpoHtmlPortalRh";
import { PortalAcademyAnexosLista } from "./PortalAcademyAnexosLista";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalAcademy } from "../../../lib/academyPortalUi";
import {
  isVideoPath,
  urlAssinadaAcademyPortalAsset,
  type AcademyPortalAnexoRef,
} from "../../../lib/academyPortalPostagemFiles";
import { FONT, FONT_TITLE } from "../../../constants/theme";

function SecaoLabel({ children }: { children: string }) {
  const { theme: t } = useApp();
  return (
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
      {children}
    </div>
  );
}

function MidiaManualBloco({ paths, titulo }: { paths: string[]; titulo: string }) {
  const { theme: t } = useApp();
  const [urls, setUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!paths.length) {
      setUrls([]);
      return;
    }
    void Promise.all(paths.map((p) => urlAssinadaAcademyPortalAsset(p))).then((signed) => {
      if (!cancelled) setUrls(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (!paths.length) return null;

  return (
    <div>
      <SecaoLabel>Imagem e vídeo</SecaoLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {paths.map((path, i) => {
          const url = urls[i];
          if (!url) {
            return (
              <div key={path} style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                Carregando…
              </div>
            );
          }
          return isVideoPath(path) ? (
            <video
              key={path}
              src={url}
              controls
              style={{ width: "100%", maxHeight: 360, borderRadius: 10, display: "block", background: "#000" }}
            />
          ) : (
            <img
              key={path}
              src={url}
              alt={titulo}
              style={{
                width: "100%",
                maxHeight: 360,
                objectFit: "contain",
                borderRadius: 10,
                display: "block",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ModalLerConteudo({
  open,
  titulo,
  introducao,
  corpo,
  imagemStoragePaths = [],
  anexos,
  exigeCiencia = false,
  jaCiente = false,
  onClose,
  onLidoECiente,
}: {
  open: boolean;
  titulo: string;
  introducao: string | null | undefined;
  corpo: string;
  imagemStoragePaths?: string[];
  anexos: AcademyPortalAnexoRef[];
  exigeCiencia?: boolean;
  jaCiente?: boolean;
  onClose: () => void;
  onLidoECiente?: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  if (!open) return null;

  const temMidia = imagemStoragePaths.length > 0 || anexos.length > 0;

  return (
    <ModalBase maxWidth={720} onClose={onClose} zIndex={1100}>
      <ModalHeader title="Ler manual" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "min(75dvh, 640px)", overflowY: "auto" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{titulo}</div>
        {introducao?.trim() ? (
          <div>
            <SecaoLabel>Introdução</SecaoLabel>
            <p style={{ fontSize: 13, color: t.text, lineHeight: 1.55, margin: 0, fontFamily: FONT.body, whiteSpace: "pre-wrap" }}>
              {introducao.trim()}
            </p>
          </div>
        ) : null}
        <div>
          <SecaoLabel>Descrição</SecaoLabel>
          <div style={{ fontSize: 14, color: t.text, lineHeight: 1.55, fontFamily: FONT_TITLE }}>
            <CorpoHtmlPortalRh html={corpo} color={t.text} />
          </div>
        </div>
        {temMidia ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <MidiaManualBloco paths={imagemStoragePaths} titulo={titulo} />
            {anexos.length > 0 ? (
              <div>
                <SecaoLabel>Anexos</SecaoLabel>
                <PortalAcademyAnexosLista anexos={anexos} color={t.text} />
              </div>
            ) : null}
          </div>
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
