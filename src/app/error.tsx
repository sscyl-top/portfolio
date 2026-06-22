"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="bg-[#050505] text-white">
        <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
          <AlertTriangle
            aria-hidden="true"
            className="mb-6 h-12 w-12 text-copper"
          />
          <h1 className="text-3xl font-semibold">出了点问题</h1>
          <p className="mt-3 max-w-md text-white/48">
            页面遇到了意外错误。这通常是暂时的，请试试重新加载。
          </p>
          <button
            onClick={() => reset()}
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm transition hover:border-white/30 hover:bg-white/[0.10]"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            重新加载
          </button>
        </main>
      </body>
    </html>
  );
}
