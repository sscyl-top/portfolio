"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
  action,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.035]">
      {/* 折叠头部 */}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
      >
        <span className="text-white/40 transition-transform duration-200 [&_svg]:size-4">
          {isOpen ? <ChevronDown /> : <ChevronRight />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white/80">{title}</h3>
            {action}
          </div>
          {description && !isOpen ? (
            <p className="mt-0.5 text-xs text-white/35 line-clamp-1">{description}</p>
          ) : null}
        </div>
      </button>

      {/* 可折叠内容 */}
      {isOpen ? <div className="border-t border-white/5 p-4">{children}</div> : null}
    </section>
  );
}
