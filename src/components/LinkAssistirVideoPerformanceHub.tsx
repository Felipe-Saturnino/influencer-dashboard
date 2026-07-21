import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { FONT } from "../constants/theme";
import {
  urlAssinadaVideoPerformanceHub,
  videoPerformanceHubPodeAssistir,
} from "../lib/academyPerformanceHubVideoFiles";

type Props = {
  videoUrl: string | null | undefined;
  /** Estilo do link (default: marca). */
  className?: string;
};

/** Abre o vídeo com URL assinada do Storage (paths) ou URL http(s) legada. */
export function LinkAssistirVideoPerformanceHub({ videoUrl }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(false);

  if (!videoPerformanceHubPodeAssistir(videoUrl)) {
    return <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>—</span>;
  }

  async function abrir() {
    setErro(false);
    setLoading(true);
    try {
      const url = await urlAssinadaVideoPerformanceHub(videoUrl);
      if (!url) {
        setErro(true);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  return (
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
        <span role="alert" style={{ color: "#e84025", fontSize: 10, fontFamily: FONT.body }}>
          Não foi possível abrir o vídeo.
        </span>
      ) : null}
    </span>
  );
}
