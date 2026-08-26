import { useCallback, useEffect, useRef, useState, type VideoHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { FONT } from "../constants/theme";
import {
  ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_FORMATO_IOS,
  ACADEMY_PERFORMANCE_HUB_VIDEO_RETENCAO_DIAS,
  urlAssinadaVideoPerformanceHub,
  videoPerformanceHubFormatoSuportadoIos,
  videoPerformanceHubPodeAssistir,
} from "../lib/academyPerformanceHubVideoFiles";
import {
  abrirAssetAssinadoComFallback,
  abrirAssetAssinadoEmNovaAba,
  ERRO_ABRIR_ASSET_URL,
} from "../lib/abrirAssetAssinadoEmNovaAba";
import { isIOSDevice } from "../lib/platformDetect";
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

const ERRO_CARREGAMENTO_LENTO =
  "O vídeo está demorando para carregar. Verifique a conexão ou toque em Abrir vídeo abaixo.";

const TIMEOUT_CARREGAMENTO_MS = 45_000;

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
  const videoRef = useRef<HTMLVideoElement>(null);

  const abrirInline = useCallback(async () => {
    if (isIOSDevice() && !videoPerformanceHubFormatoSuportadoIos(videoUrl)) {
      setErro(ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_FORMATO_IOS);
      return;
    }

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
      if (isIOSDevice() && !videoPerformanceHubFormatoSuportadoIos(videoUrl)) {
        setErro(ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_FORMATO_IOS);
        return;
      }

      const obterUrl = () => urlAssinadaVideoPerformanceHub(videoUrl);

      /** iPhone/iPad: mesma aba → player nativo do Safari (mais confiável que `<video>` em modal). */
      if (isIOSDevice()) {
        const resultado = await abrirAssetAssinadoComFallback(obterUrl);
        if (resultado === "ok") return;
        setErro(ERRO_ABRIR_ASSET_URL);
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

  useEffect(() => {
    if (!urlInline) return;
    const el = videoRef.current;
    if (!el) return;
    el.load();
  }, [urlInline]);

  useEffect(() => {
    if (!urlInline || !carregandoVideo) return;
    const timer = window.setTimeout(() => {
      setCarregandoVideo(false);
      setErroPlayer(ERRO_CARREGAMENTO_LENTO);
    }, TIMEOUT_CARREGAMENTO_MS);
    return () => window.clearTimeout(timer);
  }, [urlInline, carregandoVideo]);

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

  const modalPlayer =
    urlInline && typeof document !== "undefined" ? (
      <ModalBase maxWidth={720} onClose={fecharPlayer} zIndex={1100}>
        <ModalHeader title="Vídeo da avaliação" onClose={fecharPlayer} />
        {erroPlayer ? (
          <div
            role="alert"
            aria-live="polite"
            style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, padding: "8px 0 12px" }}
          >
            {erroPlayer}
          </div>
        ) : null}
        <div style={{ position: "relative", minHeight: 160 }}>
          {carregandoVideo && !erroPlayer ? (
            <div
              aria-live="polite"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                fontSize: 13,
                fontFamily: FONT.body,
              }}
            >
              Carregando vídeo…
            </div>
          ) : null}
          {!erroPlayer || erroPlayer === ERRO_CARREGAMENTO_LENTO ? (
            <video
              ref={videoRef}
              key={urlInline}
              src={urlInline}
              controls
              playsInline
              {...({ "webkit-playsinline": "true" } as VideoHTMLAttributes<HTMLVideoElement>)}
              preload="auto"
              aria-label="Vídeo da avaliação Performance Coach"
              style={{
                width: "100%",
                maxHeight: "70dvh",
                minHeight: 160,
                borderRadius: 10,
                background: "#000",
                display: "block",
              }}
              onLoadedData={() => setCarregandoVideo(false)}
              onCanPlay={() => setCarregandoVideo(false)}
              onError={() => void onErroPlayer()}
            />
          ) : null}
        </div>
        {urlInline ? (
          <p style={{ margin: "12px 0 0", fontSize: 12, color: t.textMuted, fontFamily: FONT.body, textAlign: "center" }}>
            Se o player não iniciar,{" "}
            <a
              href={urlInline}
              style={{ color: brand.primary, fontWeight: 600 }}
              onClick={(e) => {
                e.preventDefault();
                window.location.assign(urlInline);
              }}
            >
              abrir vídeo em tela cheia
            </a>
            .
          </p>
        ) : null}
      </ModalBase>
    ) : null;

  return (
    <>
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <button
          type="button"
          onClick={() => void abrir()}
          disabled={abrindo}
          aria-label={abrindo ? "Abrindo vídeo…" : "Assistir vídeo da avaliação"}
          title={abrindo ? "Abrindo…" : "Assistir"}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            color: brand.primary,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT.body,
            cursor: abrindo ? "wait" : "pointer",
            textDecoration: "underline",
          }}
        >
          {abrindo ? "Abrindo…" : "Assistir"}
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

      {modalPlayer ? createPortal(modalPlayer, document.body) : null}
    </>
  );
}
