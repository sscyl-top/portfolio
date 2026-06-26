"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { autoSaveWork } from "../actions";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function WorkAutoSave({ workId }: { workId: string }) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement | null>(null);
  const summaryRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSavedRef = useRef<{ title: string; summary: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const titleEl = document.getElementById("work-title") as HTMLInputElement | null;
    const summaryEl = document.querySelector('textarea[name="summary"]') as HTMLTextAreaElement | null;
    titleRef.current = titleEl;
    summaryRef.current = summaryEl;

    if (titleEl && summaryEl) {
      lastSavedRef.current = { title: titleEl.value, summary: summaryEl.value };
    }

    const handleInput = () => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }
      if (!titleRef.current || !summaryRef.current) return;
      const currentTitle = titleRef.current.value;
      const currentSummary = summaryRef.current.value;
      const last = lastSavedRef.current;
      if (last && last.title === currentTitle && last.summary === currentSummary) return;

      setStatus("saving");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const formData = new FormData();
        formData.append("id", workId);
        formData.append("title", currentTitle);
        formData.append("summary", currentSummary);

        startTransition(async () => {
          const result = await autoSaveWork(formData);
          if ("success" in result && result.success) {
            lastSavedRef.current = { title: currentTitle, summary: currentSummary };
            setStatus("saved");
            setTimeout(() => setStatus("idle"), 2000);
          } else {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
          }
        });
      }, 1200);
    };

    const events = ["input", "change"] as const;
    if (titleEl) events.forEach((ev) => titleEl.addEventListener(ev, handleInput));
    if (summaryEl) events.forEach((ev) => summaryEl.addEventListener(ev, handleInput));

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (titleEl) events.forEach((ev) => titleEl.removeEventListener(ev, handleInput));
      if (summaryEl) events.forEach((ev) => summaryEl.removeEventListener(ev, handleInput));
    };
  }, [workId]);

  if (status === "idle") return null;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-white/35">
      {status === "saving" ? (
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
    </span>
  );
}
