import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Camera, Loader2, ScanLine } from "lucide-react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"

const ScannerPanelLazy = lazy(() => import("./ScannerPanel").then((m) => ({ default: m.ScannerPanel })));

/** Intervalo máximo entre teclas para tratar como leitor USB (modo teclado). */
const WEDGE_GAP_MS = 200;

export function ModalScanner({
  onClose,
  onSubmitManual,
  onDetect,
}: {
  onClose: () => void;
  onSubmitManual: (t: string) => void | Promise<void>;
  onDetect: (t: string) => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [manual, setManual] = useState("");
  const [mostrarCamera, setMostrarCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wedgeBufferRef = useRef("");
  const wedgeLastAtRef = useRef(0);

  const enviar = useCallback(
    (txt: string) => {
      const v = txt.trim();
      if (!v) return;
      setManual("");
      wedgeBufferRef.current = "";
      void onSubmitManual(v);
    },
    [onSubmitManual],
  );

  useEffect(() => {
    const focusInput = () => {
      window.setTimeout(() => inputRef.current?.focus(), 100);
    };
    focusInput();
  }, []);

  /** Captura leituras do leitor USB quando o foco não está no campo (ex.: botão Fechar). */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;

      const input = inputRef.current;
      const fromScanField = e.target === input;

      if (e.key === "Enter") {
        if (fromScanField) return;
        const v = wedgeBufferRef.current.trim();
        if (!v) return;
        e.preventDefault();
        e.stopPropagation();
        enviar(v);
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      if (fromScanField) return;

      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - wedgeLastAtRef.current > WEDGE_GAP_MS) {
        wedgeBufferRef.current = "";
      }
      wedgeBufferRef.current += e.key;
      wedgeLastAtRef.current = now;
      setManual(wedgeBufferRef.current);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enviar]);

  const inputStyle = {
    flex: "1 1 200px",
    padding: "12px 14px",
    borderRadius: 10,
    border: `2px solid ${manual.trim() ? brand.accent : "rgba(34,197,94,0.55)"}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 15,
    fontVariantNumeric: "tabular-nums" as const,
    outline: "none",
  };

  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title="Bipar código" onClose={onClose} />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 10,
          background: t.isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.35)",
          marginBottom: 14,
        }}
      >
        <ScanLine size={18} color="#22c55e" aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 13, color: t.text, lineHeight: 1.5 }}>
          Aponte o leitor USB para a etiqueta e bipe. Leitores que funcionam como teclado preenchem o campo abaixo
          automaticamente — não é necessário câmera.
        </p>
      </div>

      <form
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}
        onSubmit={(e) => {
          e.preventDefault();
          enviar(manual);
        }}
      >
        <input
          ref={inputRef}
          value={manual}
          onChange={(e) => {
            wedgeBufferRef.current = e.target.value;
            setManual(e.target.value);
          }}
          placeholder="Aguardando leitura do leitor..."
          aria-label="Código de barras ou código da peça"
          autoComplete="off"
          inputMode="numeric"
          style={inputStyle}
        />
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Buscar
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMostrarCamera((v) => !v)}
        aria-expanded={mostrarCamera}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 14,
          padding: "8px 12px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: "transparent",
          color: t.textMuted,
          fontFamily: FONT.body,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Camera size={14} aria-hidden />
        {mostrarCamera ? "Ocultar câmera" : "Usar câmera (opcional)"}
      </button>

      {mostrarCamera ? (
        <Suspense
          fallback={
            <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
              <Loader2 size={20} className="app-lucide-spin" aria-hidden style={{ marginBottom: 8 }} />
              Carregando câmera…
            </div>
          }
        >
          <div style={{ marginTop: 12 }}>
            <ScannerPanelLazy onDetect={(txt) => void onDetect(txt)} />
          </div>
        </Suspense>
      ) : null}
    </ModalBase>
  );
}
