import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useApp } from "../../../context/AppContext"
import { FONT } from "../../../constants/theme"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { lazy, Suspense } from "react"

const ScannerPanelLazy = lazy(() => import("./ScannerPanel").then((m) => ({ default: m.ScannerPanel })));

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
  const [manual, setManual] = useState("");

  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title="Bipar código" onClose={onClose} />
      <Suspense
        fallback={
          <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
            <Loader2 size={20} className="app-lucide-spin" aria-hidden style={{ marginBottom: 8 }} />
            Carregando câmera...
          </div>
        }
      >
        <ScannerPanelLazy onDetect={(txt) => void onDetect(txt)} />
      </Suspense>
      <form
        style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmitManual(manual);
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Digite o código ou barcode"
          aria-label="Digite o código manualmente"
          style={{
            flex: "1 1 200px",
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
      </form>
    </ModalBase>
  );
}
