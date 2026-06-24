import type { ContentBlock } from "@/data/portfolio";

type DividerBlockData = Extract<ContentBlock, { type: "divider" }>;

type Props = Omit<DividerBlockData, "type" | "layout">;

/** 分隔线：根据 style 渲染不同 border-style */
export function DividerBlock({ style }: Props) {
  const borderStyleClass =
    style === "solid"
      ? "border-solid"
      : style === "dashed"
        ? "border-dashed"
        : "border-dotted";

  return (
    <hr
      className={`border-t border-white/15 ${borderStyleClass}`}
      aria-hidden="true"
    />
  );
}
