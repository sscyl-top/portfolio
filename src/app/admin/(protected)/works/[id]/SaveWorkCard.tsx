"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Send, Loader2 } from "lucide-react";

import { WorkAutoSave } from "./WorkAutoSave";

function formatTime(iso: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${m}/${day} ${hh}:${mm}`;
  } catch {
    return "-";
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const [justSubmitted, setJustSubmitted] = useState(false);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending) {
      setJustSubmitted(true);
      const t = setTimeout(() => setJustSubmitted(false), 2500);
      return () => clearTimeout(t);
    }
    prevPending.current = pending;
  }, [pending]);

  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <button
        type="submit"
        form="mainWorkForm"
        disabled={pending || justSubmitted}
        className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : justSubmitted ? (
          <Check className="h-4 w-4" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        {justSubmitted ? "提交成功" : pending ? "提交中…" : "提交作品"}
      </button>
    </div>
  );
}

export function SaveWorkCard({ updatedAt, workId }: { updatedAt: string; workId: string }) {
  return (
    <section className="rounded-md border border-cyan/20 bg-cyan/[0.055] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white/88">提交作品</h3>
          <p className="mt-1 truncate text-[10px] text-white/38">
            内容会自动保存 · 最近更新 {formatTime(updatedAt)}
          </p>
        </div>
        <WorkAutoSave workId={workId} />
      </div>
      <SubmitButton />
    </section>
  );
}
