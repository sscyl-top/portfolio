"use client";

import { useEffect, useState, useCallback } from "react";

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const close = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(close, 3000);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [close]);

  if (!visible) return null;

  return (
    <div
      className={`pointer-events-auto fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-md border border-cyan/30 bg-black/90 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-sm transition-all duration-300 ${
        exiting ? "translate-x-[120%] opacity-0" : "translate-x-0 opacity-100"
      }`}
      role="alert"
    >
      {/* 成功图标 */}
      <svg
        className="h-5 w-5 shrink-0 text-emerald-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>

      <span className="font-medium">{message}</span>

      <button
        type="button"
        onClick={close}
        className="ml-2 shrink-0 rounded p-0.5 text-white/40 transition hover:text-white"
        aria-label="关闭"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
