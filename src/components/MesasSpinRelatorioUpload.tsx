import { useCallback, useState } from "react";
import { Upload, FileImage, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  parseRelatorioFromOcrText,
  runMesasSpinOcr,
  type IngestRelatorioPayload,
  type OperadoraRef,
} from "../lib/mesasSpinRelatorioOcr";
import type { Theme } from "../constants/theme";

const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

function fmtResumo(p: IngestRelatorioPayload): string {
  return `${p.daily_summary.length} dia(s) · ${p.monthly_summary.length} mês(es) · ${p.por_tabela.length} mesa(s)`;
}

const DEFAULT_TITLE = "Importar relatório (OCR no navegador)";
const DEFAULT_DESC =
  "Carregue o print do BI. O texto é lido localmente (Tesseract.js); só o JSON extraído é enviado ao Supabase. A primeira execução pode demorar (descarga dos idiomas).";

export function MesasSpinRelatorioUpload({
  t,
  operadoras,
  disabled,
  onImported,
  embedded = false,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
}: {
  t: Theme;
  operadoras: OperadoraRef[];
  disabled?: boolean;
  onImported: () => void;
  embedded?: boolean;
  title?: string;
  description?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [pct, setPct] = useState(0);
  const [preview, setPreview] = useState<IngestRelatorioPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;
      setError(null);
      setDoneMsg(null);
      setPreview(null);
      setBusy(true);
      setStage("OCR…");
      setPct(0);
      try {
        if (!file.type.startsWith("image/")) {
          throw new Error("Envie uma imagem (PNG ou JPEG).");
        }
        const text = await runMesasSpinOcr(file, (s, p) => {
          setStage(s === "ocr" ? `OCR… ${p}%` : "Preparando imagem…");
          if (s === "ocr") setPct(p);
        });
        if (!text || text.length < 80) {
          throw new Error("OCR retornou pouco texto — tente uma imagem mais nítida.");
        }
        const parsed = parseRelatorioFromOcrText(text, operadoras);
        setPreview(parsed);
        if (
          parsed.daily_summary.length === 0 &&
          parsed.monthly_summary.length === 0 &&
          parsed.por_tabela.length === 0
        ) {
          setError(
            "Não encontrámos as secções “Daily summaries”, “Monthly summaries” ou “Per table”. Confira o texto reconhecido abaixo.",
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
        setStage("");
      }
    },
    [disabled, operadoras],
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
          data_relatorio: preview.data_relatorio,
          daily_summary: preview.daily_summary,
          monthly_summary: preview.monthly_summary,
          por_tabela: preview.por_tabela,
        },
      });
      const res = data as { ok?: boolean; error?: string; inserted?: Record<string, number> } | null;

      if (fnErr) {
        if (res?.error) {
          throw new Error(res.error);
        }
        const msg = typeof fnErr.message === "string" ? fnErr.message : "Falha ao contactar a Edge Function.";
        if (/non-2xx/i.test(msg)) {
          throw new Error(
            "A função ingest-relatorio-mesas-ocr não está disponível ou devolveu erro. " +
              "No Supabase → Edge Functions, confirme que existe uma função com este nome exato e que está publicada. " +
              "Se acabou de criar, volte a fazer Deploy. Corpo do erro: " +
              msg,
          );
        }
        if (/404|not found/i.test(msg)) {
          throw new Error(
            "Edge Function ingest-relatorio-mesas-ocr não encontrada (404). Crie/publique a função no projeto Supabase.",
          );
        }
        if (/401|unauthorized/i.test(msg)) {
          throw new Error("Sessão expirada ou não autorizado. Atualize a página e faça login novamente.");
        }
        throw new Error(msg);
      }
      if (!res?.ok) {
        throw new Error(res?.error ?? "Resposta inválida do servidor.");
      }
      setDoneMsg(`Importado: ${JSON.stringify(res.inserted ?? {})}`);
      setPreview(null);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const wrapStyle: React.CSSProperties = embedded
    ? { fontFamily: FONT, padding: 0, margin: 0 }
    : {
        borderRadius: 18,
        border: `1px solid ${t.cardBorder}`,
        background: t.cardBg,
        padding: 20,
        marginBottom: 14,
        fontFamily: FONT,
      };

  const showTitleBlock = !embedded && (title !== "" || description !== "");

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

        <label
          style={{
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
          }}
        >
          <Upload size={16} />
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
            {stage || "Processando…"} {pct > 0 && stage.includes("OCR") ? `${pct}%` : ""}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              fontSize: 12,
              color: BRAND_ERR,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {doneMsg && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: 12,
              color: BRAND_OK,
            }}
          >
            <CheckCircle2 size={16} />
            {doneMsg}
          </div>
        )}

        {preview && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: t.text, marginBottom: 8 }}>
              Pré-visualização: <strong>{fmtResumo(preview)}</strong>
              <span style={{ color: t.textMuted, marginLeft: 8 }}>· data_relatorio {preview.data_relatorio}</span>
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

const BRAND_ERR = "#e84025";
const BRAND_OK = "#22c55e";
