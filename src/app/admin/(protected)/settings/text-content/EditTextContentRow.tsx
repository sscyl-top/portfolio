"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

import { updateTextContent } from "./actions";
import { DeleteTextContentButton } from "./DeleteTextContentButton";

type Props = {
  item: {
    id: string;
    key: string;
    content: string;
    page: string;
    section: string | null;
    font_size: string | null;
    font_family: string | null;
    font_weight: string | null;
    color: string | null;
  };
};

export function EditTextContentRow({ item }: Props) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/[0.03]">
        <td className="px-4 py-2 font-mono text-xs">{item.key}</td>
        <td className="max-w-[240px] truncate px-4 py-2">{item.content}</td>
        <td className="px-4 py-2 text-white/50">{item.section ?? "-"}</td>
        <td className="px-4 py-2 text-white/50">{item.font_size ?? "-"}</td>
        <td className="px-4 py-2 text-white/50">{item.font_family ?? "-"}</td>
        <td className="px-4 py-2 text-white/50">{item.font_weight ?? "-"}</td>
        <td className="px-4 py-2 text-white/50">{item.color ?? "-"}</td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 text-xs text-cyan transition hover:text-white"
            >
              <Pencil className="h-3 w-3" />
              编辑
            </button>
            <DeleteTextContentButton id={item.id} label={item.key} />
          </div>
        </td>
      </tr>
      {isEditing && (
        <tr>
          <td colSpan={8} className="border-b border-white/5 bg-white/[0.02] p-4">
            <EditForm item={item} onCancel={() => setIsEditing(false)} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditForm({ item, onCancel }: { item: Props["item"]; onCancel: () => void }) {
  const fontSizes = [
    "",
    "text-xs",
    "text-sm",
    "text-base",
    "text-lg",
    "text-xl",
    "text-2xl",
    "text-3xl",
    "text-4xl",
  ];
  const fontFamilies = ["", "font-sans", "font-serif", "font-mono", "font-Inter"];

  return (
    <form action={updateTextContent} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="id" value={item.id} />
      <div className="md:col-span-2 lg:col-span-4">
        <label className="mb-1 block text-xs text-white/50">内容</label>
        <textarea
          name="content"
          defaultValue={item.content}
          required
          rows={3}
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/50">字号</label>
        <select
          name="font_size"
          defaultValue={item.font_size ?? ""}
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
        >
          <option value="">默认</option>
          {fontSizes.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/50">字体</label>
        <select
          name="font_family"
          defaultValue={item.font_family ?? ""}
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
        >
          <option value="">默认</option>
          {fontFamilies.filter(Boolean).map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/50">字重</label>
        <input
          name="font_weight"
          defaultValue={item.font_weight ?? ""}
          placeholder="如 400/700"
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/50">颜色</label>
        <input
          name="color"
          defaultValue={item.color ?? ""}
          placeholder="如 #ffffff"
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
        />
      </div>
      <div className="flex items-center gap-2 md:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="min-h-9 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-9 items-center gap-1 rounded-md border border-white/10 px-4 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
          取消
        </button>
      </div>
    </form>
  );
}
