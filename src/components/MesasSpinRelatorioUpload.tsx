import { useCallback, useEffect, useState } from "react";
import { Upload, FileImage, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  parseRelatorioFromOcrText,
  runMesasSpinOcr,
  type IngestRelatorioPayload,
} from "../lib/mesasSpinRelatorioOcr";
import type { Theme } from "../constants/theme";
import { UPLOAD_PLS_DISPLAY_NAME } from "../lib/uploadPlsCommercial";

const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const BRAND_ROXO = "#4a2082";
const BRAND_AZUL = "#1e36f8";
const BRAND_ERR = "#e84025";
const BRAND_OK = "#22c55e";

function fmtResumo(p: IngestRelatorioPayload): string {
  return `${p.daily_summary.length} dia(s) · ${p.monthly_summary.length} mês(es) · ${p.por_tabela.length} mesa(s)`;
}

const DEFAULT_TITLE = "Importar relatório (OCR no navegador)";
const DEFAULT_DESC =
  "Print do BI (Daily / Monthly à direita / Per table). O texto é lido no browser (Tesseract); só o JSON segue para o Supabase. Primeira execução pode demorar.";

export function MesasSpinRelatorioUpload({
  t,
  disabled,
  onImported,
  embedded = false,
  variant = "default",
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  onBusyChange,
  onUserMessage,
}: {
  t: Theme;
  disabled?: boolean;
  onImported: () => void;
  embedded?: boolean;
  variant?: "default" | "statusTable";
  title?: string;
  description?: string;
  onBusyChange?: (busy: boolean) => void;
  onUserMessage?: (msg: { tipo: "ok" | "erro"; texto: string } | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [pct, setPct] = useState(0);
  const [preview, setPreview] = useState<IngestRelatorioPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;
      onUserMessage?.(null);
      setError(null);
      setDoneMsg(null);
      setPreview(null);
      setBusy(true);
      setStage("Preparando imagem…");
      setPct(0);
      try {
        if (!file.type.startsWith("image/")) {
          throw new Error("Envie uma imagem (PNG ou JPEG).");
        }
        const text = await runMesasSpinOcr(file, (s, p) => {
          setStage(s === "ocr" ? "OCR…" : "Preparando imagem…");
          if (s === "ocr") setPct(p);
        });
        if (!text || text.length < 80) {
          throw new Error("OCR retornou pouco texto — use imagem mais nítida ou maior resolução.");
        }
        const parsed = parseRelatorioFromOcrText(text);
        setPreview(parsed);
        if (
          parsed.daily_summary.length === 0 &&
          parsed.monthly_summary.length === 0 &&
          parsed.por_tabela.length === 0
        ) {
          setError(
            "Não encontrámos Daily summaries, Monthly (UAP/ARPU) ou Per table. Veja o texto OCR abaixo.",
          );
        }
      } catch (e) {
        const te = e instanceof Error ? e.message : String(e);
        setError(te);
        onUserMessage?.({ tipo: "erro", texto: `${UPLOAD_PLS_DISPLAY_NAME}: ${te}` });
      } finally {
        setBusy(false);
        setStage("");
      }
    },
    [disabled, onUserMessage],
  );

  async function enviarSupabase() {
    if (!preview || disabled) return;
    if (
      preview.daily_summary.length === 0 &&
      preview.monthly_summary.length === 0 &&
      preview.por_tabela.length === 0
    ) {
      setError("Nada para enviar.");
      return;
    }
    setBusy(true);
    setError(null);
    setDoneMsg(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ingest-relatorio-mesas-ocr", {
        body: {
          data_referencia_por_mesa: preview.data_referencia_por_mesa,
          daily_summary: preview.daily_summary,
          monthly_summary: preview.monthly_summary,
          por_tabela: preview.por_tabela,
        },
      });
      const res = data as { ok?: boolean; error?: string; inserted?: Record<string, number> } | null;

      if (fnErr) {
        if (res?.error) throw new Error(res.error);
        const msg = typeof fnErr.message === "string" ? fnErr.message : "Falha ao contactar a Edge Function.";
        if (/non-2xx/i.test(msg)) {
          throw new Error(
            "Função ingest-relatorio-mesas-ocr indisponível ou erro. Publique a função no Supabase. " + msg,
          );
        }
        if (/404|not found/i.test(msg)) {
          throw new Error("Edge Function ingest-relatorio-mesas-ocr não encontrada (404).");
        }
        if (/401|unauthorized/i.test(msg)) {
          throw new Error("Sessão expirada. Atualize a página e faça login novamente.");
        }
        throw new Error(msg);
      }
      if (!res?.ok) {
        throw new Error(res?.error ?? "Resposta inválida do servidor.");
      }
      const okText = `Importado: ${JSON.stringify(res.inserted ?? {})}`;
      setDoneMsg(okText);
      setPreview(null);
      onUserMessage?.({ tipo: "ok", texto: `${UPLOAD_PLS_DISPLAY_NAME}: ${okText}` });
      onImported();
    } catch (e) {
      const te = e instanceof Error ? e.message : String(e);
      setError(te);
      onUserMessage?.({ tipo: "erro", texto: `${UPLOAD_PLS_DISPLAY_NAME}: ${te}` });
    } finally {
      setBusy(false);
    }
  }

  const wrapStyle: React.CSSProperties =
    variant === "statusTable"
      ? { fontFamily: FONT, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", maxWidth: 360 }
      : embedded
        ? { fontFamily: FONT, padding: 0, margin: 0 }
        : {
            borderRadius: 18,
            border: `1px solid ${t.cardBorder}`,
            background: t.cardBg,
            padding: 20,
            marginBottom: 14,
            fontFamily: FONT,
          };

  const showTitleBlock = variant !== "statusTable" && !embedded && (title !== "" || description !== "");

  const btnTableStyle: React.CSSProperties =
    variant === "statusTable"
      ? {
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          borderRadius: 8,
          border: "none",
          background: disabled || busy ? "#6b7280" : `linear-gradient(135deg, ${BRAND_ROXO}, ${BRAND_AZUL})`,
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: FONT,
          cursor: disabled || busy ? "not-allowed" : "pointer",
        }
      : {
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          cursor: disabled || busy ? "not-allowed" : "pointer",
          opacity: disabled || busy ? 0.6 : 1,
          fontSize: 13,
          color: t.text,
        };

  return (
    <>
      <style>{`@keyframes ocrSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={wrapStyle}>
        {showTitleBlock && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <FileImage size={18} color={t.textMuted} />
              <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{title}</span>
            </div>
            {description ? (
              <p style={{ fontSize: 12, color: t.textMuted, margin: "0 0 12px", lineHeight: 1.45 }}>{description}</p>
            ) : null}
          </>
        )}

        <label style={btnTableStyle}>
          <Upload size={variant === "statusTable" ? 14 : 16} />
          <span>Escolher imagem…</span>
          <input
            type="file"
            accept="image/*"
            disabled={disabled || busy}
            style={{ display: "none" }}
            onChange={(ev) => {
              const f = ev.target.files?.[0] ?? null;
              ev.target.value = "";
              void onFile(f);
            }}
          />
        </label>

        {busy && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: t.textMuted }}>
            <Loader2 size={14} style={{ animation: "ocrSpin 0.9s linear infinite" }} />
            {stage === "OCR…" ? `OCR… ${pct}%` : stage || "Processando…"}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: BRAND_ERR }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {doneMsg && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: BRAND_OK }}>
            <CheckCircle2 size={16} />
            {doneMsg}
          </div>
        )}

        {preview && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: t.text, marginBottom: 8 }}>
              Pré-visualização: <strong>{fmtResumo(preview)}</strong>
              <span style={{ color: t.textMuted, marginLeft: 8 }}>
                · dia referência (por mesa) {preview.data_referencia_por_mesa}
              </span>
            </div>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void enviarSupabase()}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor: disabled || busy ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg, #4a2082, #1e36f8)",
                color: "#fff",
              }}
            >
              Confirmar importação para o Supabase
            </button>
            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 11, color: t.textMuted, cursor: "pointer" }}>
                Texto OCR (primeiros 2 000 caracteres)
              </summary>
              <pre
                style={{
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.2)",
                  fontSize: 10,
                  overflow: "auto",
                  maxHeight: 180,
                  color: t.textMuted,
                }}
              >
                {(preview.ocr_preview ?? "").slice(0, 2000)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </>
  );
}
