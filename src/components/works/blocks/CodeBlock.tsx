import type { ContentBlock } from "@/data/portfolio";

type CodeBlockData = Extract<ContentBlock, { type: "code" }>;

type Props = Omit<CodeBlockData, "type" | "layout">;

/** 代码块：等宽字体渲染，暗色背景配绿色文字，显示语言标签 */
export function CodeBlock({ heading, language, code, caption }: Props) {
  return (
    <div className="space-y-3">
      {heading ? (
        <h2 className="text-2xl font-semibold text-white">{heading}</h2>
      ) : null}
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40">
        {/* 语言标签 */}
        <span className="absolute right-3 top-2 z-10 rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/40">
          {language}
        </span>
        <pre className="overflow-x-auto p-4 pr-20 font-mono text-sm leading-relaxed text-green-300/90">
          <code>{code}</code>
        </pre>
      </div>
      {caption ? (
        <p className="text-sm font-medium text-white/54">{caption}</p>
      ) : null}
    </div>
  );
}
