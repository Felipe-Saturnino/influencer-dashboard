import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { PlatLogo } from "../../../components/PlatLogo";
import type { Live } from "../../../types";

function fmtDataLive(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtHorarioLive(horario: string | null | undefined): string {
  const t = String(horario ?? "").trim();
  if (!t) return "—";
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function hrefCanal(link: string | null | undefined): string {
  const t = String(link ?? "").trim();
  if (!t) return "";
  return t.startsWith("http") ? t : `https://${t}`;
}

type Props = {
  live: Live;
  onClose: () => void;
};

/** Agenda — perfil com Ver sem Editar: detalhe da live (sem formulário). */
export default function ModalLiveSomenteVer({ live, onClose }: Props) {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const panelRef = useRef<HTMLDivElement>(null);
  const linkHref = hrefCanal(live.link);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [live.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-live-ver-title"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 20,
          padding: "clamp(16px, 4vw, 28px)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90dvh",
          overflowY: "auto",
          outline: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <h2
            id="modal-live-ver-title"
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              color: brand.primary,
              fontFamily: FONT_TITLE,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Live agendada
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            title="Fechar modal"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: t.textMuted,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              padding: 4,
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p
          style={{
            margin: "0 0 18px",
            fontSize: 13,
            fontWeight: 600,
            color: t.text,
            fontFamily: FONT.body,
          }}
        >
          {live.influencer_name?.trim() || "—"}
        </p>

        <div style={{ fontSize: 13, color: t.text, fontFamily: FONT.body, lineHeight: 1.65 }}>
          <p style={{ margin: "0 0 12px" }}>
            Data: {fmtDataLive(live.data)} - Horário {fmtHorarioLive(live.horario)}
          </p>
          <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {linkHref ? (
              <>
                <a
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Assista na ${live.plataforma} (abre em nova aba)`}
                  style={{ color: "var(--brand-primary, #7c3aed)", fontWeight: 600, textDecoration: "underline" }}
                >
                  Assista
                </a>
                <span> na plataforma </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <PlatLogo plataforma={live.plataforma} size={14} isDark={isDark ?? false} />
                  {live.plataforma}
                </span>
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
