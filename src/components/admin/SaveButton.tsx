"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

type SaveButtonProps = {
  children?: React.ReactNode;
  className?: string;
  form?: string;
  size?: "sm" | "md";
  variant?: "cyan" | "outline" | "danger";
  saved?: boolean;
};

export function SaveButton({
  children = "保存",
  className = "",
  form,
  size = "md",
  variant = "cyan",
  saved = false,
}: SaveButtonProps) {
  const { pending } = useFormStatus();
  const [showSuccess, setShowSuccess] = useState(false);
  const prevPendingRef = useRef(pending);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saved) {
      const frameId = requestAnimationFrame(() => setShowSuccess(true));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowSuccess(false), 2500);
      return () => cancelAnimationFrame(frameId);
    }
  }, [saved]);

  useEffect(() => {
    if (prevPendingRef.current && !pending) {
      const frameId = requestAnimationFrame(() => setShowSuccess(true));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowSuccess(false), 2500);
      prevPendingRef.current = pending;
      return () => cancelAnimationFrame(frameId);
    }
    prevPendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const sizeClasses = size === "sm"
    ? "h-8 px-2.5 text-xs"
    : "h-9 px-3 text-xs";

  const variantClasses = {
    cyan: "bg-cyan text-black hover:bg-white",
    outline: "border border-cyan/35 text-cyan hover:bg-cyan/10",
    danger: "border border-red-300/20 text-red-300 hover:bg-red-300/10",
  }[variant];

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="submit"
        form={form}
        disabled={pending}
        className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:opacity-60 ${sizeClasses} ${variantClasses} ${className}`}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : null}
        {children}
      </button>
      {showSuccess ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-400" style={{ animation: "fadeIn 0.2s ease-out" }}>
          <Check className="h-3.5 w-3.5" />
          已保存
        </span>
      ) : null}
    </span>
  );
}

export function AutoSaveIndicator() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-400" style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Check className="h-3.5 w-3.5" />
      已保存
    </span>
  );
}
