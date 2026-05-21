import { useState } from "react";
import { Loader2 } from "lucide-react";
import { urlAssinadaPortalRhAsset } from "../../../lib/portalRhPostagemFiles";
import { FONT } from "../../../constants/theme";

/** Abre ficheiro do bucket em nova aba (visualização; sem atributo download). */
export function PortalRhAssetLink({
  storagePath,
  label,
  color,
}: {
  storagePath: string | null | undefined;
  label: string;
  color: string;
}) {
  const [loading, setLoading] = useState(false);

  if (!storagePath?.trim()) return null;

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        void (async () => {
          setLoading(true);
          try {
            const url = await urlAssinadaPortalRhAsset(storagePath);
            if (url) window.open(url, "_blank", "noopener,noreferrer");
          } finally {
            setLoading(false);
          }
        })();
      }}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        color: "var(--brand-primary, #7c3aed)",
        textDecoration: "underline",
        cursor: loading ? "wait" : "pointer",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONT.body,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {loading ? <Loader2 size={14} className="app-lucide-spin" aria-hidden /> : null}
      <span style={{ color }}>{label}</span>
    </button>
  );
}
