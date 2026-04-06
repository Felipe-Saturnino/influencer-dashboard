import { Component, ErrorInfo, ReactNode } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

function isChunkLoadError(error: Error | null): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("loading chunk") ||
    msg.includes("chunkloaderror") ||
    msg.includes("loading css chunk") ||
    msg.includes("importing a module script failed")
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  background?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const btnBase: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro capturado:", error?.message ?? error, errorInfo);
    if (isChunkLoadError(error)) {
      console.warn("[ErrorBoundary] ChunkLoadError detectado — recarregando para aplicar nova versão.");
      window.location.reload();
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isChunk = isChunkLoadError(this.state.error);
      if (isChunk) {
        return (
          <div
            aria-live="polite"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
              background: this.props.background ?? "inherit",
              minHeight: 280,
              fontFamily: "Inter, sans-serif",
              color: "#e5dce1",
              fontSize: 14,
              gap: 12,
            }}
          >
            <Loader2
              size={18}
              color="var(--brand-primary, #7c3aed)"
              strokeWidth={2}
              aria-hidden
              style={{ animation: "spin 1s linear infinite" }}
            />
            Atualizando...
          </div>
        );
      }
      const borderMix = "1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 50%, transparent)";
      const bgPrimary = "color-mix(in srgb, var(--brand-primary, #7c3aed) 20%, transparent)";

      return (
        <div
          role="alert"
          aria-live="polite"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            background: this.props.background ?? "inherit",
            minHeight: 280,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 380 }}>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
              <AlertTriangle size={48} color="#e94025" aria-hidden />
            </div>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: 18,
                fontWeight: 700,
                color: "#e5dce1",
              }}
            >
              Erro ao carregar a página
            </h3>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: 14,
                color: "#a0a0b8",
                lineHeight: 1.5,
              }}
            >
              Pode ter sido um problema temporário de conexão. Tente novamente ou recarregue a página.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={this.handleRetry}
                style={{
                  ...btnBase,
                  border: borderMix,
                  background: bgPrimary,
                  color: "#c4b5d4",
                }}
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  ...btnBase,
                  border: borderMix,
                  background: "transparent",
                  color: "#c4b5d4",
                }}
              >
                Recarregar página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
