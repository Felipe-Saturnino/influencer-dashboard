import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  /** Fundo do fallback padrão (para combinar com o tema) */
  background?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Captura erros de carregamento de chunks (lazy) e erros de render.
 * Exibe mensagem amigável e botão "Tentar novamente".
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro capturado:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
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
          <div
            style={{
              textAlign: "center",
              maxWidth: 380,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
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
              Pode ter sido um problema temporário de conexão. Tente novamente.
            </p>
            <button
              onClick={this.handleRetry}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: "1px solid rgba(124, 58, 237, 0.5)",
                background: "rgba(124, 58, 237, 0.2)",
                color: "#c4b5d4",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
