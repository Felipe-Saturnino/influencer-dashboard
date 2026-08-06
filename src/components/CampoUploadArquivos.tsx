import { useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import { Plus, X, type LucideIcon } from "lucide-react";
import { FONT } from "../constants/theme";
import { CampoObrigatorioMark } from "./CampoObrigatorioMark";
import { tooltipAcao } from "../lib/iconOnlyButtonA11y";

export type CampoUploadArquivoItem = {
  key: string;
  label: string;
  /** `true` = ainda não persistido (badge Pendente + hint de envio no save). */
  pendente?: boolean;
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
    const key = `${named.name}:${named.size}:${named.type}:${named.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(named);
  };

  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === "file") add(item.getAsFile());
  }
  for (const f of Array.from(dt.files ?? [])) add(f);

  if (out.length === 0) return [];
  return multiple ? out : out.slice(0, 1);
}

/**
 * Upload em modal — layout canónico (Portal Academy).
 * Só padroniza a UI; accept, tamanho, upload imediato vs. no save e regras de domínio ficam na página.
 * Inclui seleção por botão, arrastar/soltar e colar (Ctrl+V) imagem/vídeo da área de transferência.
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
  emptyLabel = "Nenhum arquivo adicionado.",
  pendingHint = "Arquivos serão enviados ao salvar ou publicar.",
  footer,
}: CampoUploadArquivosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
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
    const files = collectFilesFromDataTransfer(e.clipboardData, accept, multiple, true);
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
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
        style={{
          borderRadius: 10,
          border: `1px ${activeHighlight ? "dashed" : "solid"} ${borderColor}`,
          background: dropZoneBg,
          padding: 12,
          transition: "border-color 120ms ease, background 120ms ease",
          outline: "none",
        }}
      >
        <button
          type="button"
          disabled={disabled}
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
    </div>
  );
}
