import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  ModalBase,
  ModalHeader,
  MODAL_FORM_FOOTER_STYLE,
} from "../../../components/OperacoesModal";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { parseHorasAcordadas } from "../../../lib/influencerHorasCota";
import { supabase } from "../../../lib/supabase";
import type { Influencer } from "./influencerTypes";

export function ModalAtivarHoras({
  influencer,
  onClose,
  onSaved,
}: {
  influencer: Influencer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const inputRef = useRef<HTMLInputElement>(null);
  const [horasRaw, setHorasRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  async function handleAtivar() {
    setError("");
    const horas = parseHorasAcordadas(horasRaw);
    if (horas == null) {
      setError("Informe as horas acordadas. O valor deve ser maior que zero.");
      return;
    }
    setSaving(true);
    const agoraIso = new Date().toISOString();
    const { error: err } = await supabase.from("influencer_perfil").upsert(
      {
        id: influencer.id,
        status: "ativo",
        horas_acordadas: horas,
        horas_ciclo_iniciado_em: agoraIso,
        status_alterado_em: agoraIso,
      },
      { onConflict: "id" },
    );
    if (err) {
      console.error("ativar influencer horas:", err);
      setError("Não foi possível ativar o influencer. Se o problema persistir, entre em contato com o suporte.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
  }

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    outline: "none",
  };
  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1.1px",
    textTransform: "uppercase",
    color: t.textMuted,
    marginBottom: 5,
    fontFamily: FONT.body,
  };

  return (
    <ModalBase onClose={onClose} maxWidth={440} zIndex={1100}>
      <ModalHeader title="Ativar influencer" onClose={onClose} />
      <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.45 }}>
        Defina as horas acordadas desta cota. O valor não segue o ciclo de pagamento — a cota permanece até as horas
        validadas serem cumpridas.
      </p>
      {error ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}
      <label style={labelStyle} htmlFor="horas-acordadas-ativar">
        Horas Acordadas
        <CampoObrigatorioMark />
      </label>
      <input
        ref={inputRef}
        id="horas-acordadas-ativar"
        type="text"
        inputMode="decimal"
        value={horasRaw}
        onChange={(e) => setHorasRaw(e.target.value)}
        placeholder="Ex.: 10"
        aria-label="Horas Acordadas"
        disabled={saving}
        style={inputStyle}
      />
      <div style={MODAL_FORM_FOOTER_STYLE}>
        <button
          type="button"
          onClick={() => void handleAtivar()}
          disabled={saving}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.65 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="#fff" />
              Salvando…
            </>
          ) : (
            "Ativar"
          )}
        </button>
      </div>
    </ModalBase>
  );
}
