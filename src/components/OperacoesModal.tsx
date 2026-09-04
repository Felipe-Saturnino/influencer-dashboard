/* eslint-disable react-refresh/only-export-components -- ModalBase + hook useDialogTitleId partilhados. */
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { FONT } from "../constants/theme";
import { MODAL_ARQUIVAR_TITULO, textoModalArquivar } from "../lib/arquivarItemUi";
import { MODAL_EXCLUIR_TITULO, textoModalExcluir } from "../lib/excluirItemUi";
import { propsBotaoFecharModal } from "../lib/iconOnlyButtonA11y";

const DialogTitleIdContext = createContext<string>("");

/** Padding interno do painel `ModalBase` — usar em `ModalHeader` sticky para alinhar ao topo. */
export const MODAL_BASE_PADDING_PX = 28;

/** Shell flex: corpo rolável + rodapé fixo dentro de `ModalBase` (postagens, vagas, etc.). */
export const MODAL_FORM_SHELL_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  maxHeight: `calc(90dvh - ${MODAL_BASE_PADDING_PX * 2}px)`,
};

/** Área rolável do formulário — `paddingBottom` evita cortar o último campo no scroll. */
export const MODAL_FORM_SCROLL_BODY_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  paddingRight: 4,
  paddingBottom: 24,
};

export const MODAL_FORM_FOOTER_STYLE: CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
  marginTop: 20,
  flexWrap: "wrap",
  flexShrink: 0,
};

export function useDialogTitleId() {
  return useContext(DialogTitleIdContext);
}

export function ModalBase({
  children,
  maxWidth = 440,
  onClose,
  zIndex = 1000,
  closeOnBackdrop = true,
  panelOverflow = "auto",
}: {
  children: ReactNode;
  maxWidth?: number;
  onClose: () => void;
  zIndex?: number;
  /** Se false, só o X (ou ação explícita) fecha — clique no fundo não fecha. Default true. */
  closeOnBackdrop?: boolean;
  /** Overflow do painel. Use `hidden` com shell de formulário que já rola por dentro. Default `auto`. */
  panelOverflow?: "auto" | "hidden";
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = containerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, []);

  return (
    <div
      className="app-modal-overlay-pad"
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
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={containerRef}
        className="app-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: brand.blockBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: "20px",
          padding: MODAL_BASE_PADDING_PX,
          width: "100%",
          maxWidth,
          minWidth: 0,
          maxHeight: "90dvh",
          overflow: panelOverflow,
          display: panelOverflow === "hidden" ? "flex" : undefined,
          flexDirection: panelOverflow === "hidden" ? "column" : undefined,
        }}
      >
        <DialogTitleIdContext.Provider value={titleId}>{children}</DialogTitleIdContext.Provider>
      </div>
    </div>
  );
}

/**
 * Cabeçalho canónico de modal: título + X.
 * Sticky no scroll do painel; X na mesma cor/peso do título.
 * Fechar = X (sem botão Cancelar redundante no rodapé de criar/editar/ver).
 */
export function ModalHeader({
  title,
  onClose,
  trailing,
}: {
  title: string;
  onClose: () => void;
  /** Conteúdo à esquerda do X (ex.: atalho de tutorial no modal). */
  trailing?: ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const titleId = useDialogTitleId();
  const pad = MODAL_BASE_PADDING_PX;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: -pad,
        zIndex: 2,
        marginTop: -pad,
        marginLeft: -pad,
        marginRight: -pad,
        marginBottom: 20,
        paddingTop: pad,
        paddingLeft: pad,
        paddingRight: pad,
        paddingBottom: 16,
        background: brand.blockBg,
        borderBottom: `1px solid ${t.cardBorder}`,
        boxShadow: t.isDark ? "0 8px 16px rgba(0,0,0,0.35)" : "0 8px 16px rgba(0,0,0,0.06)",
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {trailing}
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
            color: t.text,
            flexShrink: 0,
          }}
          {...propsBotaoFecharModal()}
        >
          <X size={22} strokeWidth={2.75} aria-hidden />
        </button>
      </div>
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
  const loadingText = loadingLabel ?? (destructive ? "Excluindo…" : "Aguarde…");
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
          whiteSpace: "pre-line",
        }}
      >
        {texto}
      </p>
      {error ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            color: "#e84025",
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
              ? "#e84025"
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

/** Pop-up canónico: título «Excluir», corpo padronizado, Cancelar / Excluir. */
export function ModalConfirmExcluirPadrao({
  descricaoItem,
  onCancel,
  onConfirm,
  loading,
  zIndex = 1000,
  error,
}: {
  descricaoItem: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  zIndex?: number;
  error?: string | null;
}) {
  return (
    <ModalConfirmDelete
      title={MODAL_EXCLUIR_TITULO}
      texto={textoModalExcluir(descricaoItem)}
      confirmLabel="Excluir"
      onCancel={onCancel}
      onConfirm={onConfirm}
      loading={loading}
      zIndex={zIndex}
      error={error}
    />
  );
}

/** Pop-up canónico: título «Arquivar», corpo padronizado, Cancelar / Arquivar. */
export function ModalConfirmArquivarPadrao({
  descricaoItem,
  onCancel,
  onConfirm,
  loading,
  zIndex = 1000,
  error,
}: {
  descricaoItem: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  zIndex?: number;
  error?: string | null;
}) {
  return (
    <ModalConfirmDelete
      title={MODAL_ARQUIVAR_TITULO}
      texto={textoModalArquivar(descricaoItem)}
      confirmLabel="Arquivar"
      destructive={false}
      loadingLabel="Arquivando…"
      onCancel={onCancel}
      onConfirm={onConfirm}
      loading={loading}
      zIndex={zIndex}
      error={error}
    />
  );
}
