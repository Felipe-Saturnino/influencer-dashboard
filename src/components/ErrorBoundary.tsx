import { Component, ErrorInfo, ReactNode } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  isChunkLoadError,
  isLikelySafariModuleLoadFailure,
  isSafariWebKit,
  recarregarAposErroDeChunk,
  reloadAfterChunkError,
} from "../lib/chunkReloadGuard";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  background?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  /** Recarga automática por erro de chunk em curso — evita tela parada quando o limite é atingido. */
  chunkRecarregando: boolean;
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
  state: State = { hasError: false, error: null, chunkRecarregando: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro capturado:", error?.message ?? error, errorInfo);
    if (isChunkLoadError(error) || isLikelySafariModuleLoadFailure(error)) {
      this.setState({ chunkRecarregando: reloadAfterChunkError("ErrorBoundary: ChunkLoadError") });
    }
  }

  private isRecoverableLoadFailure(error: Error | null): boolean {
    if (!error) return false;
    return isChunkLoadError(error) || isLikelySafariModuleLoadFailure(error);
  }

  handleRetry = () => {
    if (this.isRecoverableLoadFailure(this.state.error)) {
      recarregarAposErroDeChunk();
      return;
    }
    this.setState({ hasError: false, error: null, chunkRecarregando: false });
    this.props.onReset?.();
  };

  handleReload = () => {
    if (this.isRecoverableLoadFailure(this.state.error) || isSafariWebKit()) {
      recarregarAposErroDeChunk();
      return;
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isChunk = this.isRecoverableLoadFailure(this.state.error);
      if (isChunk && this.state.chunkRecarregando) {
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
            Atualizando…
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
              {isChunk ? "Nova versão disponível" : "Erro ao carregar a página"}
            </h3>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: 14,
                color: "#a0a0b8",
                lineHeight: 1.5,
              }}
            >
              {isChunk
                ? "Não foi possível carregar esta parte da plataforma. Recarregue para buscar a versão mais recente. Se o problema persistir, entre em contato com o suporte."
                : "Pode ter sido um problema temporário de conexão. Tente novamente ou recarregue a página."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {isChunk ? null : (
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
              )}
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  ...btnBase,
                  border: borderMix,
                  background: isChunk ? bgPrimary : "transparent",
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
