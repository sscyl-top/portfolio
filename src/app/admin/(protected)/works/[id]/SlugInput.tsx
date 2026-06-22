"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { suggestSlug } from "../actions";

export function SlugInput({ defaultValue }: { defaultValue: string }) {
  const [slug, setSlug] = useState(defaultValue);

  const handleGenerate = async () => {
    const titleEl = document.querySelector<HTMLInputElement>(
      'input[name="title"]',
    );
    const title = titleEl?.value?.trim() ?? "";
    if (!title) return;
    const suggestion = await suggestSlug(title);
    setSlug(suggestion);
  };

  return (
    <label className="grid gap-2 text-sm">
      <span className="flex items-center justify-between text-white/58">
        Slug
        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex items-center gap-1.5 rounded border border-white/15 px-2.5 py-1 text-xs text-cyan transition hover:bg-cyan/10"
        >
          <RefreshCw aria-hidden="true" className="h-3 w-3" />
          从标题生成
        </button>
      </span>
      <input
        name="slug"
        required
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
    </label>
  );
}
