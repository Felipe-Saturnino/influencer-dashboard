/* eslint-disable react-refresh/only-export-components -- ModalBase + hook useDialogTitleId partilhados. */
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { FONT } from "../constants/theme";

const DialogTitleIdContext = createContext<string>("");

export function useDialogTitleId() {
  return useContext(DialogTitleIdContext);
}

export function ModalBase({
  children,
  maxWidth = 440,
  onClose,
  zIndex = 1000,
}: {
  children: ReactNode;
  maxWidth?: number;
  onClose: () => void;
  zIndex?: number;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const first = containerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#00000090",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex,
        padding: "20px",
      }}
      onMouseDown={(e) => {
        /* `click` no backdrop após selecionar texto (mousedown no input + mouseup no overlay)
         * fechava o modal; `mousedown` só no fundo evita esse caso. */
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: brand.blockBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: "20px",
          padding: "28px",
          width: "100%",
          maxWidth,
          minWidth: 0,
          maxHeight: "90dvh",
          overflow: "auto",
        }}
      >
        <DialogTitleIdContext.Provider value={titleId}>{children}</DialogTitleIdContext.Provider>
      </div>
    </div>
  );
}

export function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const titleId = useDialogTitleId();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      }}
    >
      <h2
        id={titleId}
        style={{
          margin: 0,
          fontSize: "17px",
          fontWeight: 900,
          color: t.text,
          fontFamily: FONT.title,
        }}
      >
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: t.textMuted,
        }}
        aria-label="Fechar modal"
      >
        <X size={20} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

export function ModalConfirmDelete({
  texto,
  onCancel,
  onConfirm,
  loading,
  title = "Confirmar exclusão",
  confirmLabel = "Excluir",
  destructive = true,
  zIndex = 1000,
  error,
  loadingLabel,
}: {
  texto: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  /** Quando não for exclusão (ex.: descartar seleção no modal). */
  title?: string;
  confirmLabel?: string;
  destructive?: boolean;
  zIndex?: number;
  /** Mensagem inline (ex.: erro de API); não usar alert(). */
  error?: string | null;
  /** Texto do botão de confirmação enquanto loading (padrão: Excluindo… / Aguarde…). */
  loadingLabel?: string;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const loadingText =
    loadingLabel ??
    (destructive ? "Excluindo..." : "Aguarde...");
  function handleClose() {
    if (loading) return;
    onCancel();
  }
  return (
    <ModalBase onClose={handleClose} maxWidth={400} zIndex={zIndex}>
      <ModalHeader title={title} onClose={handleClose} />
      <p
        style={{
          fontSize: 14,
          color: t.text,
          fontFamily: FONT.body,
          lineHeight: 1.55,
          margin: "0 0 24px",
        }}
      >
        {texto}
      </p>
      {error ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            color: "#ef4444",
            fontSize: 12,
            fontFamily: FONT.body,
            marginTop: -12,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: destructive
              ? "#ef4444"
              : brand.useBrand
                ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                : "linear-gradient(135deg, #4a2082, #1e36f8)",
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? loadingText : confirmLabel}
        </button>
      </div>
    </ModalBase>
  );
}
