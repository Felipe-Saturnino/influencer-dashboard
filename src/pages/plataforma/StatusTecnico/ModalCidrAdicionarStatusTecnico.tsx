import { useEffect, useRef, type RefObject } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { BRAND_SEMANTIC as BRAND, FONT, FONT_TITLE } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { MODAL_OVERLAY_BG, ctaGradientStatus } from "./statusTecnicoHelpers";

type DashBrand = { useBrand: boolean };

type Props = {
  open: boolean;
  t: Theme;
  brand: DashBrand;
  cidr: string;
  rotulo: string;
  erro: string | null;
  salvando: boolean;
  onCidrChange: (v: string) => void;
  onRotuloChange: (v: string) => void;
  onClose: () => void;
  onSalvar: () => void;
  /** Ref opcional — se omitida, o modal cria a própria e foca no open. */
  inputRef?: RefObject<HTMLInputElement | null>;
};

/**
 * Modal «Adicionar CIDR» — allowlist de redes para check-in de prestadores (Status Técnico).
 */
export function ModalCidrAdicionarStatusTecnico({
  open,
  t,
  brand,
  cidr,
  rotulo,
  erro,
  salvando,
  onCidrChange,
  onRotuloChange,
  onClose,
  onSalvar,
  inputRef: inputRefProp,
}: Props) {
  const inputRefLocal = useRef<HTMLInputElement>(null);
  const inputRef = inputRefProp ?? inputRefLocal;

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, [open, inputRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !salvando) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, salvando, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-tecnico-cidr-add-title"
      style={{
        position: "fixed",
        inset: 0,
        background: MODAL_OVERLAY_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2050,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !salvando) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 16,
          padding: 24,
          maxWidth: 440,
          width: "100%",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        <h2 id="status-tecnico-cidr-add-title" style={{ marginTop: 0, fontFamily: FONT_TITLE, fontSize: 17, color: t.text }}>
          Adicionar CIDR
        </h2>
        {erro ? (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              marginBottom: 12,
              background: "rgba(232,64,37,0.12)",
              border: "1px solid rgba(232,64,37,0.35)",
              color: "#e84025",
              fontSize: 13,
              fontFamily: FONT.body,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={14} color="#e84025" aria-hidden="true" />
            {erro}
          </div>
        ) : null}
        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="status-tecnico-cidr-input"
            style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT.body, marginBottom: 6 }}
          >
            Prefixo CIDR
            <CampoObrigatorioMark />
          </label>
          <input
            ref={inputRef}
            id="status-tecnico-cidr-input"
            type="text"
            value={cidr}
            onChange={(e) => onCidrChange(e.target.value)}
            placeholder="ex.: 187.102.187.36/30"
            autoComplete="off"
            aria-label="Prefixo CIDR"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 14,
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="status-tecnico-cidr-rotulo"
            style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT.body, marginBottom: 6 }}
          >
            Rótulo
          </label>
          <input
            id="status-tecnico-cidr-rotulo"
            type="text"
            value={rotulo}
            onChange={(e) => onRotuloChange(e.target.value)}
            placeholder="ex.: WAN Mundivox"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 14,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          
          <button
            type="button"
            disabled={salvando}
            onClick={() => void onSalvar()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: ctaGradientStatus(brand, salvando, BRAND.cinza),
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "9px 16px",
              cursor: salvando ? "not-allowed" : "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              opacity: salvando ? 0.85 : 1,
            }}
          >
            {salvando ? (
              <>
                <Loader2 size={14} color="#fff" className="app-lucide-spin" aria-hidden="true" />
                Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
