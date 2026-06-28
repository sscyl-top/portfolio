import type { ContentBlock } from "@/data/portfolio";

type StatsBlockData = Extract<ContentBlock, { type: "stats" }>;

type Props = Omit<StatsBlockData, "type" | "layout">;

/** 数据统计：网格布局展示大号数字 + 小号标签 */
export function StatsBlock({ heading, items }: Props) {
  return (
    <div className="space-y-4">
      {heading ? (
        <h2 className="text-2xl font-semibold text-ink">{heading}</h2>
      ) : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item, i) => (
          <div
            key={`${item.label}-${i}`}
            className="rounded-lg border border-edge-2 bg-surface-3 p-4 text-center"
          >
            <p className="text-3xl font-semibold text-copper">{item.value}</p>
            <p className="mt-1 text-sm text-ink-3">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
