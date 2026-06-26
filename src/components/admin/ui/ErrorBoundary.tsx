"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="w-full max-w-md rounded-xl border border-red-400/15 bg-red-400/[0.03] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-400/10 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white/85">页面出现错误</h3>
            <p className="mt-2 text-xs text-white/45">
              {this.state.error?.message ?? "发生了未知错误，请刷新页面重试。"}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={this.handleRetry}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-cyan px-3 text-xs font-medium text-black transition hover:bg-white"
              >
                <RefreshCw className="h-3 w-3" />
                重试
              </button>
              <a
                href="/admin"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-white/12 px-3 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <Home className="h-3 w-3" />
                返回首页
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
