import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  abrirAssetAssinadoEmNovaAba,
  ERRO_ABRIR_ASSET_POPUP,
  ERRO_ABRIR_ASSET_URL,
} from "../../../lib/abrirAssetAssinadoEmNovaAba";
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
  const [erro, setErro] = useState<string | null>(null);

  if (!storagePath?.trim()) return null;

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          void (async () => {
            setErro(null);
            setLoading(true);
            try {
              const resultado = await abrirAssetAssinadoEmNovaAba(() => urlAssinadaPortalRhAsset(storagePath));
              if (resultado === "popup_bloqueado") setErro(ERRO_ABRIR_ASSET_POPUP);
              else if (resultado === "falha_url") setErro(ERRO_ABRIR_ASSET_URL);
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
      {erro ? (
        <span role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, maxWidth: 420 }}>
          {erro}
        </span>
      ) : null}
    </span>
  );
}
