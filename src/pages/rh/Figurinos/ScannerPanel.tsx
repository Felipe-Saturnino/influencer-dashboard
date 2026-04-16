import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";

type Props = {
  onDetect: (texto: string) => void;
  /** Evita múltiplos disparos seguidos para o mesmo código. */
  cooldownMs?: number;
};

export function ScannerPanel({ onDetect, cooldownMs = 1800 }: Props) {
  const { theme: t } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastRef = useRef<{ text: string; at: number } | null>(null);
  const [erroCam, setErroCam] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(true);

  const emitir = useCallback(
    (texto: string) => {
      const t0 = texto.trim();
      if (!t0) return;
      const now = Date.now();
      const last = lastRef.current;
      if (last && last.text === t0 && now - last.at < cooldownMs) return;
      lastRef.current = { text: t0, at: now };
      onDetect(t0);
    },
    [cooldownMs, onDetect],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    (async () => {
      try {
        setErroCam(null);
        const devices = await reader.listVideoInputDevices();
        if (cancelled) return;
        const back =
          devices.find((d) => /back|traseira|rear|environment/i.test(d.label)) ?? devices[devices.length - 1];
        const deviceId = back?.deviceId;
        await reader.decodeFromVideoDevice(deviceId ?? null, video, (res, err) => {
          if (cancelled) return;
          if (res) emitir(res.getText());
          else if (err && !(err instanceof NotFoundException)) setErroCam("Falha na leitura. Tente digitar o código.");
        });
      } catch {
        if (!cancelled) setErroCam("Não foi possível acessar a câmera. Use o campo manual abaixo.");
      } finally {
        if (!cancelled) setIniciando(false);
      }
    })();

    return () => {
      cancelled = true;
      reader.reset();
      readerRef.current = null;
    };
  }, [emitir]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          borderRadius: 14,
          overflow: "hidden",
          border: `1px solid ${t.cardBorder}`,
          background: t.isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.06)",
          aspectRatio: "4/3",
        }}
      >
        <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {iniciando ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.45)",
              gap: 8,
              color: "#fff",
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            <Loader2 size={18} className="app-lucide-spin" color="#fff" aria-hidden />
            Iniciando câmera…
          </div>
        ) : null}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "18% 12%",
            border: "2px solid rgba(34,197,94,0.85)",
            borderRadius: 10,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.12) inset",
            pointerEvents: "none",
          }}
        />
      </div>
      {erroCam ? (
        <div
          role="status"
          style={{
            fontSize: 12,
            color: "#f59e0b",
            fontFamily: FONT.body,
            textAlign: "center",
            maxWidth: 420,
          }}
        >
          {erroCam}
        </div>
      ) : null}
    </div>
  );
}
