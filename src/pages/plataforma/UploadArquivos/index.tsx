import { useState, useCallback, useRef } from "react";
import { supabase, supabaseUrl } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { Upload, CheckCircle, XCircle, Loader, FileImage, X, AlertCircle } from "lucide-react";
import { TbReportAnalytics } from "react-icons/tb";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  verde:    "#22c55e",
  cinza:    "#6b7280",
} as const;

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

const EDGE_FN_URL = `${supabaseUrl}/functions/v1/processar-email-relatorio`;

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Status = "idle" | "processing" | "success" | "error";

interface FileItem {
  id: string;
  file: File;
  preview: string;
  status: Status;
  resultado?: { daily: number; monthly: number; por_tabela: number };
  erro?: string;
  data_relatorio?: string;
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function UploadArquivos() {
  const { theme: t } = useApp();
  const perm = usePermission("upload_arquivos");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [processando, setProcessando] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalSucesso  = files.filter(f => f.status === "success").length;
  const totalErro     = files.filter(f => f.status === "error").length;
  const totalPendente = files.filter(f => f.status === "idle").length;

  // ─── Adicionar arquivos ──────────────────────────────────────────────────
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(f => f.type.startsWith("image/"));
    if (!arr.length) return;
    const items: FileItem[] = arr.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "idle",
    }));
    setFiles(prev => [...prev, ...items]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f) URL.revokeObjectURL(f.preview);
      return prev.filter(x => x.id !== id);
    });
  };

  const limparTudo = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
  };

  // ─── Converter para base64 ────────────────────────────────────────────────
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).replace(/^data:image\/\w+;base64,/, ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ─── Processar um arquivo ─────────────────────────────────────────────────
  const processarArquivo = async (item: FileItem) => {
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "processing" } : f));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? "";
      const base64 = await toBase64(item.file);

      const res = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: item.file.name,
          from: "upload_manual",
          image_base64: base64,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Erro desconhecido na função");
      }

      setFiles(prev => prev.map(f => f.id === item.id ? {
        ...f,
        status: "success",
        resultado: json.inserted,
        data_relatorio: json.data_relatorio,
      } : f));

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "error", erro: msg } : f));
    }
  };

  // ─── Processar todos pendentes ────────────────────────────────────────────
  const processarTodos = async () => {
    const pendentes = files.filter(f => f.status === "idle");
    if (!pendentes.length) return;
    setProcessando(true);
    for (const item of pendentes) {
      await processarArquivo(item);
    }
    setProcessando(false);
  };

  // ─── Permissão ────────────────────────────────────────────────────────────
  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para acessar o Upload de Arquivos.
      </div>
    );
  }

  // ─── Estilos compartilhados ───────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: BRAND.roxo,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 3,
        }}>
          <TbReportAnalytics size={15} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Upload de Arquivos
          </h1>
          <p style={{ color: t.textMuted, fontFamily: FONT.body, fontSize: 13, margin: "5px 0 0" }}>
            Faça upload das imagens do relatório PLS Daily Commercial Report para processar os dados automaticamente.
          </p>
        </div>
      </div>

      {/* ─── Cards de resumo ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Pendentes",  valor: totalPendente, cor: BRAND.roxoVivo },
          { label: "Processados", valor: totalSucesso,  cor: "#059669"      },
          { label: "Com erro",   valor: totalErro,     cor: BRAND.vermelho  },
        ].map(c => (
          <div key={c.label} style={{ ...card, borderLeft: `3px solid ${c.cor}`, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.cor, fontFamily: FONT_TITLE, lineHeight: 1 }}>
              {c.valor}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Área de drop ────────────────────────────────────────────────────── */}
      <div
        style={{
          ...card,
          border: `2px dashed ${dragOver ? BRAND.roxoVivo : t.cardBorder}`,
          background: dragOver ? `${BRAND.roxoVivo}0a` : t.cardBg,
          borderRadius: 18, padding: "40px 24px",
          textAlign: "center", cursor: "pointer",
          transition: "all 0.2s ease",
          marginBottom: 20,
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${BRAND.roxoVivo}18`, border: `1px solid ${BRAND.roxoVivo}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <Upload size={22} color={BRAND.roxoVivo} />
        </div>
        <p style={{ fontFamily: FONT_TITLE, fontSize: 15, fontWeight: 800, color: t.text, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Arraste as imagens aqui
        </p>
        <p style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted, margin: 0 }}>
          ou clique para selecionar — PNG, JPG, qualquer formato de imagem
        </p>
      </div>

      {/* ─── Lista de arquivos ────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <div style={{ ...card, overflow: "hidden", marginBottom: 16 }}>

          {/* Header da lista */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${t.cardBorder}` }}>
            <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>
              {files.length} {files.length === 1 ? "arquivo" : "arquivos"} selecionado{files.length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={limparTudo}
                disabled={processando}
                style={{
                  background: "transparent", border: `1px solid ${t.cardBorder}`,
                  borderRadius: 10, padding: "7px 14px", cursor: processando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body, fontSize: 12, color: t.textMuted, opacity: processando ? 0.5 : 1,
                }}
              >
                Limpar tudo
              </button>
              <button
                onClick={processarTodos}
                disabled={processando || totalPendente === 0}
                style={{
                  background: processando || totalPendente === 0
                    ? t.cardBorder
                    : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
                  color: processando || totalPendente === 0 ? t.textMuted : "#fff",
                  border: "none", borderRadius: 10,
                  padding: "7px 18px", cursor: processando || totalPendente === 0 ? "not-allowed" : "pointer",
                  fontFamily: FONT.body, fontSize: 13, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 7,
                  transition: "all 0.2s",
                }}
              >
                {processando ? <><Loader size={13} style={{ animation: "spin 1s linear infinite" }} /> Processando...</> : <><Upload size={13} /> Processar {totalPendente > 0 ? `${totalPendente} pendente${totalPendente > 1 ? "s" : ""}` : "tudo"}</>}
              </button>
            </div>
          </div>

          {/* Itens */}
          {files.map((item, idx) => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px",
              borderBottom: idx < files.length - 1 ? `1px solid ${t.cardBorder}` : "none",
              background: idx % 2 === 1 ? "rgba(74,32,130,0.04)" : "transparent",
            }}>

              {/* Thumbnail */}
              <div style={{
                width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                border: `1px solid ${t.cardBorder}`, background: t.cardBorder,
              }}>
                <img src={item.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.file.name}
                </div>
                <div style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                  {(item.file.size / 1024).toFixed(0)} KB
                  {item.data_relatorio && (
                    <span style={{ marginLeft: 8, color: BRAND.roxoVivo }}>
                      · Data: {new Date(item.data_relatorio + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>

                {/* Resultado */}
                {item.status === "success" && item.resultado && (
                  <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                    {[
                      { label: "Daily",   val: item.resultado.daily },
                      { label: "Monthly", val: item.resultado.monthly },
                      { label: "Tabelas", val: item.resultado.por_tabela },
                    ].map(r => (
                      <span key={r.label} style={{
                        background: "#05966918", color: "#059669",
                        border: "1px solid #05966933",
                        borderRadius: 6, padding: "2px 8px",
                        fontSize: 11, fontWeight: 600, fontFamily: FONT.body,
                      }}>
                        {r.label}: {r.val}
                      </span>
                    ))}
                  </div>
                )}

                {/* Erro */}
                {item.status === "error" && item.erro && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, color: BRAND.vermelho, fontSize: 11, fontFamily: FONT.body }}>
                    <AlertCircle size={11} /> {item.erro}
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div style={{ flexShrink: 0 }}>
                {item.status === "idle" && (
                  <span style={{
                    background: `${BRAND.roxoVivo}18`, color: BRAND.roxoVivo,
                    border: `1px solid ${BRAND.roxoVivo}33`,
                    borderRadius: 8, padding: "4px 10px",
                    fontSize: 11, fontWeight: 600, fontFamily: FONT.body,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <FileImage size={11} /> Pendente
                  </span>
                )}
                {item.status === "processing" && (
                  <span style={{
                    background: `${BRAND.azul}18`, color: BRAND.azul,
                    border: `1px solid ${BRAND.azul}33`,
                    borderRadius: 8, padding: "4px 10px",
                    fontSize: 11, fontWeight: 600, fontFamily: FONT.body,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <Loader size={11} style={{ animation: "spin 1s linear infinite" }} /> Processando
                  </span>
                )}
                {item.status === "success" && (
                  <span style={{
                    background: "#05966918", color: "#059669",
                    border: "1px solid #05966933",
                    borderRadius: 8, padding: "4px 10px",
                    fontSize: 11, fontWeight: 600, fontFamily: FONT.body,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <CheckCircle size={11} /> Processado
                  </span>
                )}
                {item.status === "error" && (
                  <span style={{
                    background: `${BRAND.vermelho}18`, color: BRAND.vermelho,
                    border: `1px solid ${BRAND.vermelho}33`,
                    borderRadius: 8, padding: "4px 10px",
                    fontSize: 11, fontWeight: 600, fontFamily: FONT.body,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <XCircle size={11} /> Erro
                  </span>
                )}
              </div>

              {/* Remover */}
              {item.status !== "processing" && (
                <button
                  onClick={() => removeFile(item.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 4, flexShrink: 0, display: "flex", alignItems: "center" }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Instrução ──────────────────────────────────────────────────────── */}
      <div style={{
        ...card,
        padding: "16px 20px",
        display: "flex", alignItems: "flex-start", gap: 12,
        borderLeft: `3px solid ${BRAND.roxoVivo}`,
      }}>
        <AlertCircle size={16} color={BRAND.roxoVivo} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, lineHeight: 1.6 }}>
          <strong style={{ color: t.text }}>Como usar:</strong> Selecione ou arraste as imagens do relatório
          <em> PLS / Daily Commercial Report (SG)</em>. Cada imagem será processada pelo Claude Vision,
          que extrai os dados e salva automaticamente nas tabelas <code style={{ fontSize: 11, color: BRAND.roxoVivo }}>relatorio_daily_summary</code>,{" "}
          <code style={{ fontSize: 11, color: BRAND.roxoVivo }}>relatorio_monthly_summary</code> e{" "}
          <code style={{ fontSize: 11, color: BRAND.roxoVivo }}>relatorio_por_tabela</code>.
          Registros duplicados são atualizados automaticamente.
        </div>
      </div>

      {/* ─── CSS para spinner ────────────────────────────────────────────────── */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
