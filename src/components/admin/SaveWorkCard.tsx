"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";

import { updateWork } from "@/app/admin/(protected)/works/actions";

type Props = {
  updatedAt: string;
  formId?: string;
};

/**
 * 保存作品卡片（客户端组件）。
 * 点击按钮时手动收集 mainWorkForm 数据并调用 updateWork server action，
 * 通过 useTransition 跟踪 pending 状态，给出明确的 loading 反馈。
 */
export function SaveWorkCard({ updatedAt, formId = "mainWorkForm" }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const updatedDate = updatedAt ? new Date(updatedAt) : null;
  const updatedLabel = updatedDate
    ? `${updatedDate.getMonth() + 1}/${updatedDate.getDate()} ${String(
        updatedDate.getHours(),
      ).padStart(2, "0")}:${String(updatedDate.getMinutes()).padStart(2, "0")}`
    : "-";

  const handleClick = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) {
      setError("找不到表单");
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      try {
        await updateWork(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存失败");
      }
    });
  };

  return (
    <section className="rounded-md border border-cyan/20 bg-cyan/[0.055] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white/88">保存作品</h3>
          <p className="mt-1 truncate text-[10px] text-white/38">
            最近更新 {updatedLabel}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition ${
          isPending
            ? "cursor-wait bg-cyan/60 text-black/70"
            : "bg-cyan text-black hover:bg-white"
        }`}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            保存中…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            保存作品
          </>
        )}
      </button>
      {error ? (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      ) : null}
    </section>
  );
}
