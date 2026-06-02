import { useMemo, useState } from "react"
import { useApp } from "../../../context/AppContext"
import { FONT } from "../../../constants/theme"
import { supabase } from "../../../lib/supabase"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { type RhFigurinoPeca } from "./types"
import { ctaButtonContent, fmtDataHora } from "./figurinosPageHelpers"
import { BlocoResumoPecaBasico } from "./BlocoResumoPecaBasico"

export function ModalDescartarPeca({
  peca,
  resumoOperadoras,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  resumoOperadoras: string;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const [motivo, setMotivo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const agoraIso = useMemo(() => new Date().toISOString(), []);

  const confirmar = async () => {
    setErr(null);
    if (!motivo.trim()) {
      setErr("Informe o motivo do descarte.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_descartar", {
      p_item_id: peca.id,
      p_motivo: motivo.trim(),
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao descartar peça:", error);
      setErr("Não foi possível descartar a peça. Se o problema persistir, contate o suporte.");
      return;
    }
    await onOk();
  };

  return (
    <ModalBase onClose={onClose} maxWidth={500}>
      <ModalHeader title="Descartar peça" onClose={onClose} />
      <BlocoResumoPecaBasico peca={peca} operadorasTexto={resumoOperadoras} t={t} />
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
        Motivo *
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
            resize: "vertical",
          }}
        />
      </label>
      <div
        style={{
          fontSize: 12,
          color: t.textMuted,
          marginBottom: 12,
          fontFamily: FONT.body,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px dashed ${t.cardBorder}`,
          background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      >
        Registrado por: <strong style={{ color: t.text }}>{actor}</strong>
        <br />
        Data/hora: <strong style={{ color: t.text }}>{fmtDataHora(agoraIso)}</strong>
      </div>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirmar()}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: "#ef4444",
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {ctaButtonContent(loading, "Confirmar descarte", "Salvando…")}
        </button>
      </div>
    </ModalBase>
  );
}
