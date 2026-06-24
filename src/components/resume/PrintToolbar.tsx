"use client";

import { ArrowLeft, Printer } from "lucide-react";

export function PrintToolbar() {
  return (
    <div className="no-print rp-toolbar">
      <span className="rp-toolbar-hint">
        提示：点击打印，或按 Ctrl / ⌘ + P 导出 PDF
      </span>
      <button
        type="button"
        onClick={() => window.print()}
        className="rp-print-btn"
      >
        <Printer aria-hidden="true" className="h-4 w-4" />
        打印 / 导出 PDF
      </button>
      <a href="/resume" className="rp-back-btn">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回简历
      </a>
    </div>
  );
}
