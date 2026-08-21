import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import { FileText, Film, Plus, X, type LucideIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { FONT } from "../constants/theme";
import { CampoObrigatorioMark } from "./CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "./OperacoesModal";
import { tooltipAcao } from "../lib/iconOnlyButtonA11y";

export type CampoUploadArquivoItem = {
  key: string;
  label: string;
  /** `true` = ainda não persistido (badge Pendente + hint de envio no save). */
  pendente?: boolean;
  /** Arquivo local — gera miniatura de imagem/vídeo em `listVariant="cards"`. */
  file?: File | null;
  /** URL remota (assinada) para preview quando não há `file`. */
  previewUrl?: string | null;
};

export type CampoUploadArquivosTheme = {
  text: string;
  textMuted: string;
  cardBorder: string;
  inputBg: string;
};

export type CampoUploadArquivosProps = {
  id: string;
  /** Rótulo do campo (acima do botão). */
  label: string;
  /** Texto do botão de seleção — domínio da página (ex.: «Selecionar PDF»). */
  buttonLabel: string;
  accept?: string;
  multiple?: boolean;
  items: CampoUploadArquivoItem[];
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  disabled?: boolean;
  t: CampoUploadArquivosTheme;
  /** Ícone à esquerda do botão. Default: `Plus`. */
  icon?: LucideIcon;
  obrigatorio?: boolean;
  hasError?: boolean;
  /** Texto auxiliar sob o botão (tipos, tamanho, orientação). */
  hint?: ReactNode;
  /** Exibe a lista / empty state. `false` quando a lista de arquivos fica noutro sítio (ex.: coluna da tabela). Default `true`. */
  showList?: boolean;
  /**
   * `list` — linhas (padrão Academy).
   * `cards` — miniaturas com nome (referência Jira / Incidentes).
   */
  listVariant?: "list" | "cards";
  emptyLabel?: string;
  /** Hint quando há item `pendente`. Default: mensagem Academy. */
  pendingHint?: string;
  /** Conteúdo extra abaixo da lista (ex.: link «Assistir vídeo»). */
  footer?: ReactNode;
};

function fileMatchesAccept(file: File, accept?: string): boolean {
  if (!accept?.trim()) return true;
  const tokens = accept
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  if (m === "image/bmp") return "bmp";
  if (m === "video/mp4") return "mp4";
  if (m === "video/webm") return "webm";
  if (m === "video/quicktime") return "mov";
  if (m.startsWith("image/")) return m.slice(6) || "img";
  if (m.startsWith("video/")) return m.slice(6) || "vid";
  return "bin";
}

function stampArquivoLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Print Screen / captura costuma chegar sem nome útil — gera um nome estável. */
function ensureNamedClipboardFile(file: File): File {
  const raw = (file.name || "").trim();
  if (raw && raw !== "blob" && raw !== "image.png" && raw !== "untitled") {
    return file;
  }
  // `image.png` genérico do Windows Snipping: renomear para distinguir múltiplas capturas
  if (raw === "image.png" || !raw || raw === "blob" || raw === "untitled") {
    const ext = extFromMime(file.type || "image/png");
    const prefix = (file.type || "").startsWith("video/") ? "video" : "captura";
    return new File([file], `${prefix}-${stampArquivoLocal()}.${ext}`, {
      type: file.type || (ext === "mp4" ? "video/mp4" : "image/png"),
      lastModified: file.lastModified || Date.now(),
    });
  }
  return file;
}

function collectFilesFromDataTransfer(
  dt: DataTransfer | null | undefined,
  accept: string | undefined,
  multiple: boolean,
  fromClipboard: boolean,
): File[] {
  if (!dt) return [];
  const seen = new Set<string>();
  const out: File[] = [];

  const add = (file: File | null) => {
    if (!file) return;
    if (!fileMatchesAccept(file, accept)) return;
    const named = fromClipboard ? ensureNamedClipboardFile(file) : file;
    // Clipboard: items e files espelham o mesmo payload com lastModified/nome diferentes — dedupe por size+type.
    const key = fromClipboard
      ? `${named.size}:${named.type || "unknown"}`
      : `${named.name}:${named.size}:${named.type}:${named.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(named);
  };

  if (fromClipboard) {
    // Preferir `items`; `files` costuma duplicar a mesma captura/vídeo colado.
    for (const item of Array.from(dt.items ?? [])) {
      if (item.kind === "file") add(item.getAsFile());
    }
    if (out.length === 0) {
      for (const f of Array.from(dt.files ?? [])) add(f);
    }
  } else {
    for (const f of Array.from(dt.files ?? [])) add(f);
    if (out.length === 0) {
      for (const item of Array.from(dt.items ?? [])) {
        if (item.kind === "file") add(item.getAsFile());
      }
    }
  }

  if (out.length === 0) return [];
  return multiple ? out : out.slice(0, 1);
}

function mimePreviewKind(mime: string | undefined, urlHint?: string | null): "image" | "video" | "other" {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  const u = (urlHint ?? "").toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(u)) return "image";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return "video";
  return "other";
}

function useAnexoPreviewSrc(item: CampoUploadArquivoItem, kind: "image" | "video" | "other") {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item.previewUrl) {
      setObjectUrl(null);
      return;
    }
    if (!item.file || (kind !== "image" && kind !== "video")) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(item.file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file, item.previewUrl, kind]);

  return item.previewUrl || objectUrl;
}

function AnexoAmpliadoModal({
  item,
  onClose,
}: {
  item: CampoUploadArquivoItem;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const kind = mimePreviewKind(item.file?.type, item.previewUrl);
  const src = useAnexoPreviewSrc(item, kind);

  if (!src || (kind !== "image" && kind !== "video")) return null;

  return (
    <ModalBase onClose={onClose} maxWidth={960} zIndex={1100}>
      <ModalHeader title={item.label} onClose={onClose} />
      {kind === "image" ? (
        <img
          src={src}
          alt={item.label}
          style={{
            width: "100%",
            maxHeight: "min(80dvh, 760px)",
            objectFit: "contain",
            borderRadius: 10,
            display: "block",
          }}
        />
      ) : (
        <video
          src={src}
          controls
          playsInline
          style={{
            width: "100%",
            maxHeight: "min(80dvh, 760px)",
            objectFit: "contain",
            borderRadius: 10,
            display: "block",
            background: "#000",
          }}
        />
      )}
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 12,
          color: t.textMuted,
          fontFamily: FONT.body,
          textAlign: "center",
        }}
      >
        {item.label}
      </p>
    </ModalBase>
  );
}

function AnexoPreviewCard({
  item,
  t,
  disabled,
  onRemove,
  onAmpliar,
}: {
  item: CampoUploadArquivoItem;
  t: CampoUploadArquivosTheme;
  disabled?: boolean;
  onRemove: (key: string) => void;
  onAmpliar?: (item: CampoUploadArquivoItem) => void;
}) {
  const kind = mimePreviewKind(item.file?.type, item.previewUrl);
  const src = useAnexoPreviewSrc(item, kind);
  const podeAmpliar = !!src && (kind === "image" || kind === "video") && !!onAmpliar;

  const previewMedia =
    kind === "image" && src ? (
      <img
        src={src}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    ) : kind === "video" && src ? (
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    ) : kind === "video" ? (
      <Film size={28} color={t.textMuted} aria-hidden />
    ) : (
      <FileText size={28} color={t.textMuted} aria-hidden />
    );

  const previewAreaStyle: React.CSSProperties = {
    height: 88,
    background: `color-mix(in srgb, ${t.cardBorder} 55%, ${t.inputBg})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  };

  return (
    <li
      style={{
        width: 120,
        borderRadius: 10,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg,
        overflow: "hidden",
        position: "relative",
        fontFamily: FONT.body,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {podeAmpliar ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAmpliar!(item)}
          aria-label={tooltipAcao("Ampliar pré-visualização")}
          title={tooltipAcao("Ampliar pré-visualização")}
          className="app-campo-foco"
          style={{
            ...previewAreaStyle,
            border: "none",
            padding: 0,
            cursor: disabled ? "not-allowed" : "zoom-in",
          }}
        >
          {previewMedia}
        </button>
      ) : (
        <div style={previewAreaStyle}>{previewMedia}</div>
      )}
      <div
        style={{
          padding: "8px 8px 10px",
          background: t.inputBg,
          borderTop: `1px solid ${t.cardBorder}`,
          minHeight: 40,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: t.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
          title={item.label}
        >
          {item.label}
        </span>
        {item.pendente ? (
          <span
            style={{
              alignSelf: "flex-start",
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 20,
              background: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.35)",
            }}
          >
            Pendente
          </span>
        ) : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRemove(item.key)}
        aria-label={tooltipAcao("Remover arquivo")}
        title={tooltipAcao("Remover arquivo")}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 26,
          height: 26,
          borderRadius: 8,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          color: t.textMuted,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={13} aria-hidden />
      </button>
    </li>
  );
}

/**
 * Upload em modal — layout canónico (Portal Academy).
 * Só padroniza a UI; accept, tamanho, upload imediato vs. no save e regras de domínio ficam na página.
 * Inclui seleção por botão, arrastar/soltar e colar (Ctrl+V) imagem/vídeo da área de transferência.
 * `listVariant="cards"`: miniaturas com nome (Incidentes / referência Jira).
 */
export function CampoUploadArquivos({
  id,
  label,
  buttonLabel,
  accept,
  multiple = true,
  items,
  onAdd,
  onRemove,
  disabled,
  t,
  icon: Icon = Plus,
  obrigatorio = false,
  hasError = false,
  hint,
  showList = true,
  listVariant = "list",
  emptyLabel = "Nenhum arquivo adicionado.",
  pendingHint = "Arquivos serão enviados ao salvar ou publicar.",
  footer,
}: CampoUploadArquivosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const lastPasteAtRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  const [ampliado, setAmpliado] = useState<CampoUploadArquivoItem | null>(null);

  useEffect(() => {
    if (ampliado && !items.some((i) => i.key === ampliado.key)) {
      setAmpliado(null);
    }
  }, [items, ampliado]);
  const activeHighlight = isDragging || pasteFlash;
  const borderColor = hasError
    ? "#e84025"
    : activeHighlight
      ? "var(--brand-primary, #7c3aed)"
      : t.cardBorder;
  const dropZoneBg = activeHighlight
    ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)"
    : t.inputBg;

  function resetDrag() {
    dragDepthRef.current = 0;
    setIsDragging(false);
  }

  function flashPaste() {
    setPasteFlash(true);
    window.setTimeout(() => setPasteFlash(false), 450);
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (![...e.dataTransfer.types].includes("Files")) return;
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    e.dataTransfer.dropEffect = "copy";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) {
      resetDrag();
      return;
    }
    const files = collectFilesFromDataTransfer(e.dataTransfer, accept, multiple, false);
    resetDrag();
    if (files.length > 0) onAdd(files);
  }

  function onPaste(e: ClipboardEvent) {
    if (disabled) return;
    const now = Date.now();
    // Evita disparo duplo (bubble / reentrada do mesmo Ctrl+V).
    if (now - lastPasteAtRef.current < 400) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const files = collectFilesFromDataTransfer(e.clipboardData, accept, multiple, true);
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    lastPasteAtRef.current = now;
    flashPaste();
    onAdd(files);
  }

  return (
    <div>
      {label.trim() || obrigatorio ? (
        <label
          htmlFor={id}
          style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}
        >
          {label}
          {obrigatorio ? <CampoObrigatorioMark /> : null}
        </label>
      ) : null}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          const list = e.target.files;
          if (!list?.length) return;
          const files = Array.from(list);
          onAdd(multiple ? files : files.slice(0, 1));
          e.target.value = "";
        }}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          border: 0,
        }}
        aria-label={buttonLabel}
      />
      <div
        ref={zoneRef}
        role="group"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${buttonLabel} — arraste, solte ou cole (Ctrl+V) imagem ou vídeo nesta área`}
        aria-disabled={disabled || undefined}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaste={onPaste}
        onMouseDown={(e) => {
          // Foca a área para Ctrl+V (sem roubar clique do botão de seleção).
          if (disabled) return;
          const target = e.target as HTMLElement;
          if (target.closest("button")) return;
          zoneRef.current?.focus();
        }}
        className="app-campo-foco"
        style={{
          borderRadius: 10,
          border: `1px ${activeHighlight ? "dashed" : "solid"} ${borderColor}`,
          background: dropZoneBg,
          padding: 12,
          transition: "border-color 120ms ease, background 120ms ease",
        }}
      >
        <button
          type="button"
          disabled={disabled}
          className="app-campo-foco"
          onClick={() => inputRef.current?.click()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 10,
            border: `1px solid ${hasError ? "#e84025" : t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <Icon size={15} aria-hidden />
          {buttonLabel}
        </button>
        {!disabled ? (
          <div style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
            {isDragging
              ? "Solte os arquivos aqui."
              : pasteFlash
                ? "Arquivo colado."
                : "ou arraste, solte ou cole (Ctrl+V) aqui"}
          </div>
        ) : null}
        {hint ? (
          <div style={{ margin: "6px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>{hint}</div>
        ) : null}
      </div>
      {showList ? (
        items.length === 0 ? (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>{emptyLabel}</p>
        ) : listVariant === "cards" ? (
          <>
            <ul
              style={{
                margin: "12px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {items.map((item) => (
                <AnexoPreviewCard
                  key={item.key}
                  item={item}
                  t={t}
                  disabled={disabled}
                  onRemove={onRemove}
                  onAmpliar={setAmpliado}
                />
              ))}
            </ul>
            {items.some((i) => i.pendente) && pendingHint ? (
              <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                {pendingHint}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <ul
              style={{
                margin: "10px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {items.map((item) => (
                <li
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                    fontFamily: FONT.body,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                      color: t.text,
                    }}
                    title={item.label}
                  >
                    {item.label}
                  </span>
                  {item.pendente ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "rgba(245,158,11,0.15)",
                        color: "#f59e0b",
                        border: "1px solid rgba(245,158,11,0.35)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Pendente
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemove(item.key)}
                    aria-label={tooltipAcao("Remover arquivo")}
                    title={tooltipAcao("Remover arquivo")}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: `1px solid ${t.cardBorder}`,
                      background: "transparent",
                      color: t.textMuted,
                      cursor: disabled ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <X size={13} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {items.some((i) => i.pendente) && pendingHint ? (
              <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                {pendingHint}
              </p>
            ) : null}
          </>
        )
      ) : null}
      {footer}
      {ampliado ? <AnexoAmpliadoModal item={ampliado} onClose={() => setAmpliado(null)} /> : null}
    </div>
  );
}
