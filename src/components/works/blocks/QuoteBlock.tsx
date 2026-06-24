import type { ContentBlock } from "@/data/portfolio";

type QuoteBlockData = Extract<ContentBlock, { type: "quote" }>;

type Props = Omit<QuoteBlockData, "type" | "layout">;

/** 引用块：大引号装饰，铜色左边框，作者 + 职位 */
export function QuoteBlock({ heading, text, author, role }: Props) {
  return (
    <div className="space-y-4">
      {heading ? (
        <h2 className="text-2xl font-semibold text-white">{heading}</h2>
      ) : null}
      <blockquote className="relative border-l-2 border-copper pl-6">
        {/* 大引号装饰 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-2 -top-4 select-none font-serif text-6xl leading-none text-copper/30"
        >
          &ldquo;
        </span>
        <p className="text-lg leading-8 text-white/80">{text}</p>
        <footer className="mt-3 text-sm">
          <span className="font-medium text-copper">{author}</span>
          {role ? <span className="text-white/45"> · {role}</span> : null}
        </footer>
      </blockquote>
    </div>
  );
}
