"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { deleteTextContent } from "./actions";

type Props = {
  id: string;
  label: string;
};

export function DeleteTextContentButton({ id, label }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`确定删除「${label}」？此操作可软删除恢复。`)) return;
    startTransition(() => {
      deleteTextContent(id);
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-1 text-xs text-red-400 transition hover:text-red-300 disabled:opacity-40"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Trash2 className="h-3 w-3" />
      )}
      删除
    </button>
  );
}
