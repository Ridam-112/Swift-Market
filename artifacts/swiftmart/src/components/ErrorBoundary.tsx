import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "sans-serif",
            background: "var(--background, #fff)",
            color: "var(--foreground, #111)",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              background: "rgba(239,68,68,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              marginBottom: 24,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground, #666)", textAlign: "center", maxWidth: 300, marginBottom: 24, lineHeight: 1.6 }}>
            An unexpected error occurred. Please refresh the page to continue.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                fontSize: 11,
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8,
                padding: "12px 16px",
                maxWidth: 480,
                width: "100%",
                overflow: "auto",
                marginBottom: 24,
                color: "#ef4444",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            style={{
              padding: "12px 28px",
              borderRadius: 16,
              background: "var(--primary, #000)",
              color: "var(--primary-foreground, #fff)",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
