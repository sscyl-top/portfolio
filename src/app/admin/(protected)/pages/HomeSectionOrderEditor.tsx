"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { SaveButton } from "@/components/admin/SaveButton";
import { saveHomeSectionOrder } from "./actions";

const SECTIONS = [
  { id: "hero", label: "Hero 首屏", description: "大卡片视频 + 浮动装饰" },
  { id: "capabilities", label: "专业能力", description: "核心优势面板 + 联系入口" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function HomeSectionOrderEditor({ initialOrder, saved }: { initialOrder: SectionId[]; saved?: boolean }) {
  const [order, setOrder] = useState<SectionId[]>(() => {
    const valid = initialOrder.filter((id): id is SectionId =>
      SECTIONS.some((s) => s.id === id),
    );
    const remaining = SECTIONS.filter((s) => !valid.includes(s.id)).map((s) => s.id);
    return [...valid, ...remaining];
  });

  const move = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    const next = [...order];
    const [item] = next.splice(index, 1);
    next.splice(newIndex, 0, item);
    setOrder(next);
  };

  return (
    <form action={saveHomeSectionOrder} className="mt-4">
      {order.map((id, index) => {
        const section = SECTIONS.find((s) => s.id === id)!;
        return (
          <div
            key={id}
            className="flex items-center gap-2 border-b border-white/8 py-2.5 first:pt-0 last:border-b-0 last:pb-0"
          >
            <input type="hidden" name="section_order" value={id} />
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] text-white/50">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/85">{section.label}</p>
              <p className="text-[11px] text-white/35">{section.description}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="flex h-7 w-7 items-center justify-center rounded text-white/30 transition hover:bg-white/10 hover:text-white/70 disabled:opacity-25"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1}
                className="flex h-7 w-7 items-center justify-center rounded text-white/30 transition hover:bg-white/10 hover:text-white/70 disabled:opacity-25"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
      <div className="mt-3 flex justify-end">
        <SaveButton saved={saved} size="sm">保存板块排序</SaveButton>
      </div>
    </form>
  );
}
