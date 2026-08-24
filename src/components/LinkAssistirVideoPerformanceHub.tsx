import { useCallback, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { FONT } from "../constants/theme";
import {
  ACADEMY_PERFORMANCE_HUB_VIDEO_RETENCAO_DIAS,
  urlAssinadaVideoPerformanceHub,
  videoPerformanceHubPodeAssistir,
} from "../lib/academyPerformanceHubVideoFiles";
import {
  abrirAssetAssinadoEmNovaAba,
  ERRO_ABRIR_ASSET_URL,
} from "../lib/abrirAssetAssinadoEmNovaAba";
import { prefereMidiaInlineNoDispositivo } from "../lib/platformDetect";
import { ModalBase, ModalHeader } from "./OperacoesModal";

type Props = {
  videoUrl: string | null | undefined;
  /** Quando preenchido, a retenção já apagou o arquivo do Storage. */
  videoRemovidoEm?: string | null;
  /** Estilo do link (default: marca). */
  className?: string;
};

const ERRO_REPRODUCAO_VIDEO =
  "Não foi possível reproduzir o vídeo. Verifique a conexão ou tente de novo em alguns instantes.";

/** Abre o vídeo com URL assinada do Storage (paths) ou URL http(s) legada. */
export function LinkAssistirVideoPerformanceHub({ videoUrl, videoRemovidoEm }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [abrindo, setAbrindo] = useState(false);
  const [carregandoVideo, setCarregandoVideo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [urlInline, setUrlInline] = useState<string | null>(null);
  const [erroPlayer, setErroPlayer] = useState<string | null>(null);
  const retryPlayerRef = useRef(false);

  const abrirInline = useCallback(async () => {
    retryPlayerRef.current = false;
    setErroPlayer(null);
    setCarregandoVideo(true);
    const url = await urlAssinadaVideoPerformanceHub(videoUrl);
    if (!url) {
      setErro(ERRO_ABRIR_ASSET_URL);
      setCarregandoVideo(false);
      return;
    }
    setUrlInline(url);
  }, [videoUrl]);

  async function abrir() {
    setErro(null);
    setAbrindo(true);
    try {
      const obterUrl = () => urlAssinadaVideoPerformanceHub(videoUrl);

      if (prefereMidiaInlineNoDispositivo()) {
        await abrirInline();
        return;
      }

      const resultado = await abrirAssetAssinadoEmNovaAba(obterUrl);
      if (resultado === "ok") return;

      if (resultado === "popup_bloqueado") {
        await abrirInline();
        return;
      }

      setErro(ERRO_ABRIR_ASSET_URL);
    } finally {
      setAbrindo(false);
    }
  }

  function fecharPlayer() {
    setUrlInline(null);
    setErroPlayer(null);
    setCarregandoVideo(false);
    retryPlayerRef.current = false;
  }

  async function onErroPlayer() {
    if (!retryPlayerRef.current) {
      retryPlayerRef.current = true;
      setCarregandoVideo(true);
      setErroPlayer(null);
      const url = await urlAssinadaVideoPerformanceHub(videoUrl);
      if (url) {
        setUrlInline(url);
        return;
      }
    }
    setCarregandoVideo(false);
    setErroPlayer(ERRO_REPRODUCAO_VIDEO);
  }

  if (!videoPerformanceHubPodeAssistir(videoUrl)) {
    if (videoRemovidoEm) {
      return (
        <span
          title={`Vídeo apagado ${ACADEMY_PERFORMANCE_HUB_VIDEO_RETENCAO_DIAS} dias após a conclusão da avaliação.`}
          style={{ color: t.textMuted, fontSize: 12, fontFamily: FONT.body }}
        >
          Vídeo removido
        </span>
      );
    }
    return <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>—</span>;
  }

  const loading = abrindo || (urlInline != null && carregandoVideo);

  return (
    <>
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <button
          type="button"
          onClick={() => void abrir()}
          disabled={loading}
          aria-label={loading ? "Abrindo vídeo…" : "Assistir vídeo da avaliação"}
          title={loading ? "Abrindo…" : "Assistir"}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            color: brand.primary,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT.body,
            cursor: loading ? "wait" : "pointer",
            textDecoration: "underline",
          }}
        >
          {loading ? "Abrindo…" : "Assistir"}
        </button>
        {erro ? (
          <span
            role="alert"
            aria-live="polite"
            style={{ color: "#e84025", fontSize: 10, fontFamily: FONT.body, maxWidth: 280, textAlign: "center" }}
          >
            {erro}
          </span>
        ) : null}
      </span>

      {urlInline ? (
        <ModalBase maxWidth={720} onClose={fecharPlayer} zIndex={1100}>
          <ModalHeader title="Vídeo da avaliação" onClose={fecharPlayer} />
          {erroPlayer ? (
            <div
              role="alert"
              aria-live="polite"
              style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, padding: "8px 0" }}
            >
              {erroPlayer}
            </div>
          ) : carregandoVideo ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Carregando vídeo…
            </div>
          ) : null}
          {!erroPlayer ? (
            <video
              key={urlInline}
              src={urlInline}
              controls
              playsInline
              preload="metadata"
              aria-label="Vídeo da avaliação Performance Coach"
              style={{
                width: "100%",
                maxHeight: "70dvh",
                borderRadius: 10,
                background: "#000",
                display: carregandoVideo ? "none" : "block",
              }}
              onLoadedData={() => setCarregandoVideo(false)}
              onCanPlay={() => setCarregandoVideo(false)}
              onError={() => void onErroPlayer()}
            />
          ) : null}
        </ModalBase>
      ) : null}
    </>
  );
}
