import "@helvety/extension-chrome/theme-boot";
import "./index.css";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

class InspectorErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[flow-inspector] render failed", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-sm text-destructive">
          <p className="font-semibold">Flow Inspector failed to render.</p>
          <p className="mt-2 break-words text-xs">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(
    <InspectorErrorBoundary>
      <App />
    </InspectorErrorBoundary>,
  );
} else {
  document.body.replaceChildren("Flow Inspector failed to mount.");
}
