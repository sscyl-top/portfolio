"use client";

import { useCallback, useRef, useState, useTransition, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  children: ReactNode;
  action: (formData: FormData) => void | Promise<unknown>;
  className?: string;
  debounceMs?: number;
};

/**
 * 通用自动保存表单：监听表单内任意字段变更，防抖后调用 Server Action。
 * 用于替代带「保存」按钮的 `<form action={...}>`。
 */
export function AutoSaveForm({
  children,
  action,
  className,
  debounceMs = 400,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<SaveStatus>("idle");

  const handleChange = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saving");
    timerRef.current = setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      const formData = new FormData(form);
      startTransition(async () => {
        try {
          await action(formData);
          setStatus("saved");
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
          statusTimerRef.current = setTimeout(() => setStatus("idle"), 1800);
        } catch {
          setStatus("error");
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
          statusTimerRef.current = setTimeout(() => setStatus("idle"), 2500);
        }
      });
    }, debounceMs);
  }, [debounceMs, action]);

  const showStatus = status !== "idle" || isPending;

  return (
    <form ref={formRef} onChange={handleChange} className={className}>
      {children}
      {showStatus && (
        <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-white/45">
          {status === "saving" || (isPending && status !== "saved" && status !== "error") ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              自动保存中…
            </>
          ) : status === "saved" ? (
            <span className="inline-flex items-center gap-1 text-emerald-400/80">
              <Check className="h-3 w-3" />
              已自动保存
            </span>
          ) : status === "error" ? (
            <span className="text-red-400/80">保存失败</span>
          ) : null}
        </p>
      )}
    </form>
  );
}
