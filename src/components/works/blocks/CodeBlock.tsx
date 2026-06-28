import type { ContentBlock } from "@/data/portfolio";

type CodeBlockData = Extract<ContentBlock, { type: "code" }>;

type Props = Omit<CodeBlockData, "type" | "layout">;

/** 代码块：等宽字体渲染，暗色背景配绿色文字，显示语言标签 */
export function CodeBlock({ heading, language, code, caption }: Props) {
  return (
    <div className="space-y-3">
      {heading ? (
        <h2 className="text-2xl font-semibold text-ink">{heading}</h2>
      ) : null}
      <div className="relative overflow-hidden rounded-lg border border-edge-2 bg-panel">
        {/* 语言标签 */}
        <span className="absolute right-3 top-2 z-10 rounded bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-4">
          {language}
        </span>
        <pre className="overflow-x-auto p-4 pr-20 font-mono text-sm leading-relaxed text-green-300/90 [.light_&]:text-green-700">
          <code>{code}</code>
        </pre>
      </div>
      {caption ? (
        <p className="text-sm font-medium text-ink-3">{caption}</p>
      ) : null}
    </div>
  );
}
