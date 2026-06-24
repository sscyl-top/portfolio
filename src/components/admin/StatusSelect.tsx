"use client";

import { useState } from "react";

type Status = "draft" | "published" | "private";

const STATUS_STYLES: Record<Status, string> = {
  published: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  draft: "border-yellow-400/40 bg-yellow-400/10 text-yellow-300",
  private: "border-slate-400/40 bg-slate-400/10 text-slate-300",
};

export function StatusSelect({
  name,
  defaultValue,
  className = "",
}: {
  name: string;
  defaultValue: Status;
  className?: string;
}) {
  const [value, setValue] = useState<Status>(defaultValue);

  return (
    <select
      name={name}
      value={value}
      onChange={(e) => setValue(e.target.value as Status)}
      className={`min-h-8 rounded-md border px-2.5 text-xs font-medium outline-none transition focus:border-cyan ${STATUS_STYLES[value]} ${className}`}
    >
      <option value="draft" className="bg-neutral-900 text-yellow-300">草稿</option>
      <option value="published" className="bg-neutral-900 text-emerald-300">已发布</option>
      <option value="private" className="bg-neutral-900 text-slate-300">私密</option>
    </select>
  );
}
