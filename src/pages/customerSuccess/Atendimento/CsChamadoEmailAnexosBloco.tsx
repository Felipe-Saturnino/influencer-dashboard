import { useState, type CSSProperties } from "react";
import { Download, Eye, Loader2, Paperclip } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { abrirAnexoCsChamadoEmail, baixarAnexoCsChamadoEmail } from "../../../lib/csAtendimentoEmailFiles";
import type { CsChamadoEmailAnexo } from "../../../types/csAtendimento";

function linkAcaoStyle(disabled: boolean): CSSProperties {
  return {
    background: "none",
    border: "none",
    padding: 0,
    color: "var(--brand-primary, #7c3aed)",
    textDecoration: "underline",
    cursor: disabled ? "wait" : "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: FONT.body,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };
}

function AcaoAnexo({
  tipo,
  anexo,
}: {
  tipo: "ver" | "baixar";
  anexo: CsChamadoEmailAnexo;
}) {
  const [loading, setLoading] = useState(false);
  const nome = anexo.nome?.trim() || "anexo";
  const label = tipo === "ver" ? "Ver" : "Baixar";
  const ariaLabel = tipo === "ver" ? `Ver anexo ${nome}` : `Baixar anexo ${nome}`;

  return (
    <button
      type="button"
      disabled={loading}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => {
        void (async () => {
          setLoading(true);
          try {
            if (tipo === "ver") await abrirAnexoCsChamadoEmail(anexo);
            else await baixarAnexoCsChamadoEmail(anexo);
          } finally {
            setLoading(false);
          }
        })();
      }}
      style={linkAcaoStyle(loading)}
    >
      {loading ? (
        <Loader2 size={13} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
      ) : tipo === "ver" ? (
        <Eye size={13} aria-hidden />
      ) : (
        <Download size={13} aria-hidden />
      )}
      {label}
    </button>
  );
}

export function CsChamadoEmailAnexosBloco({ anexos, t }: { anexos: CsChamadoEmailAnexo[] | null | undefined; t: Theme }) {
  const lista = (anexos ?? []).filter((a) => a.nome?.trim() || a.url?.trim() || a.storage_path?.trim());

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: t.textMuted,
          textTransform: "uppercase",
          marginBottom: 4,
          fontFamily: FONT.body,
        }}
      >
        Anexo
      </div>
      {lista.length === 0 ? (
        <div style={{ fontSize: 14, color: t.text, fontFamily: FONT.body }}>—</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.map((anexo) => {
            const nome = anexo.nome?.trim() || "Anexo";
            return (
              <li
                key={anexo.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: t.text,
                    fontFamily: FONT.body,
                    minWidth: 0,
                    flex: "1 1 160px",
                  }}
                >
                  <Paperclip size={14} color={t.textMuted} aria-hidden />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={nome}
                  >
                    {nome}
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  <AcaoAnexo tipo="ver" anexo={anexo} />
                  <AcaoAnexo tipo="baixar" anexo={anexo} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
