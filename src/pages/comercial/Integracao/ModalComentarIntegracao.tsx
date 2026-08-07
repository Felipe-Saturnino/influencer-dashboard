import { useEffect, useId, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { IntegracaoRow } from "./types";

export function ModalComentarIntegracao({
  row,
  onClose,
  onSave,
  canEditar,
}: {
  row: IntegracaoRow;
  onClose: () => void;
  onSave: (comentario: string) => Promise<string | null>;
  canEditar: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const formId = useId();
  const [comentario, setComentario] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.getElementById(`${formId}-comentario`)?.focus();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [formId]);

  async function salvar() {
    if (!canEditar) return;
    const trim = comentario.trim();
    if (!trim) {
      setErr("Informe o comentário.");
      return;
    }
    setSalvando(true);
    setErr(null);
    const msg = await onSave(trim);
    setSalvando(false);
    if (msg) {
      setErr(msg);
      return;
    }
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={480} zIndex={1000}>
      <ModalHeader title={`Comentar — ${row.operador_nome}`} onClose={onClose} />
      {err ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
        >
          {err}
        </div>
      ) : null}
      <label
        htmlFor={`${formId}-comentario`}
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: t.text,
          marginBottom: 6,
          fontFamily: FONT.body,
        }}
      >
        Comentário
        <CampoObrigatorioMark />
      </label>
      <textarea
        id={`${formId}-comentario`}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={5}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          color: t.text,
          fontSize: 13,
          fontFamily: FONT.body,
          resize: "vertical",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 20,
        }}
      >
        
        <button
          type="button"
          disabled={salvando || !canEditar}
          onClick={() => void salvar()}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: salvando || !canEditar ? "not-allowed" : "pointer",
            opacity: salvando || !canEditar ? 0.7 : 1,
          }}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </ModalBase>
  );
}
