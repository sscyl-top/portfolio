"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title = "确认操作",
  message,
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-sm rounded-xl border border-white/10 bg-[#141424] p-5 shadow-2xl"
        style={{ animation: "dialogIn 0.18s ease-out" }}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${danger ? "bg-red-400/10 text-red-400" : "bg-cyan/10 text-cyan"}`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white/90">{title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-white/55">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded p-1 text-white/30 transition hover:bg-white/5 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-8 rounded-md border border-white/12 px-3 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`min-h-8 rounded-md px-4 text-xs font-medium transition ${
              danger
                ? "bg-red-400 text-white hover:bg-red-500"
                : "bg-cyan text-black hover:bg-white"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes dialogIn {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    danger: boolean;
    resolve: ((v: boolean) => void) | null;
  }>({
    open: false,
    title: "确认操作",
    message: "",
    confirmText: "确定",
    cancelText: "取消",
    danger: false,
    resolve: null,
  });

  const confirm = (opts: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
  }) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: opts.title ?? "确认操作",
        message: opts.message,
        confirmText: opts.confirmText ?? "确定",
        cancelText: opts.cancelText ?? "取消",
        danger: opts.danger ?? false,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      danger={state.danger}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}
