import { useState, type CSSProperties } from "react";
import { Download, Eye, Loader2, Paperclip } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { abrirAnexoCsChamadoEmail, baixarAnexoCsChamadoEmail } from "../../../lib/csAtendimentoEmailFiles";
import type { CsChamadoEmailAnexo } from "../../../types/csAtendimento";

function AcaoAnexo({
  tipo,
  anexo,
}: {
  tipo: "ver" | "baixar";
  anexo: CsChamadoEmailAnexo;
}) {
  const [loading, setLoading] = useState(false);
  const nome = anexo.nome?.trim() || "anexo";
  const label = tipo === "ver" ? tooltipAcao(`Ver anexo ${nome}`) : tooltipAcao(`Baixar anexo ${nome}`);

  return (
    <BtnIconeAcaoLinha
      label={label}
      disabled={loading}
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
    >
      {loading ? (
        <Loader2 size={14} className="app-lucide-spin" aria-hidden />
      ) : tipo === "ver" ? (
        <Eye size={14} aria-hidden />
      ) : (
        <Download size={14} aria-hidden />
      )}
    </BtnIconeAcaoLinha>
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
        <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>—</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {lista.map((anexo) => {
            const nome = anexo.nome?.trim() || "anexo";
            return (
              <li
                key={anexo.id ?? `${nome}-${anexo.storage_path ?? ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: t.text,
                }}
              >
                <Paperclip size={14} aria-hidden style={{ flexShrink: 0, color: t.textMuted } as CSSProperties} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {nome}
                </span>
                <AcaoAnexo tipo="ver" anexo={anexo} />
                <AcaoAnexo tipo="baixar" anexo={anexo} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
