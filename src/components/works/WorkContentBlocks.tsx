"use client";

import type { ContentBlock, BlockLayout } from "@/data/portfolio";
import { WorkMediaFrame } from "./WorkMediaFrame";
import { PdfBlockRenderer } from "./PdfBlockRenderer";
import { CodeBlock } from "./blocks/CodeBlock";
import { QuoteBlock } from "./blocks/QuoteBlock";
import { EmbedBlock } from "./blocks/EmbedBlock";
import { DividerBlock } from "./blocks/DividerBlock";
import { CalloutBlock } from "./blocks/CalloutBlock";
import { StatsBlock } from "./blocks/StatsBlock";

type Props = {
  blocks: ContentBlock[];
  coverTone: string;
};

/**
 * 作品详情内容块渲染器（站酷风格）
 * - 图片/视频/动图直接展示，无卡片边框
 * - 文字块居中带适度宽度
 * - 支持自由排版（free layout）
 */
export function WorkContentBlocks({ blocks, coverTone }: Props) {
  return (
    <div className="space-y-0">
      {blocks.map((block, index) => renderBlock(block, index, coverTone))}
    </div>
  );
}

function blockProps<T extends ContentBlock>(block: T): Omit<T, "type" | "layout"> {
  return Object.fromEntries(
    Object.entries(block).filter(([key]) => key !== "type" && key !== "layout"),
  ) as Omit<T, "type" | "layout">;
}

function renderBlock(block: ContentBlock, index: number, coverTone: string) {
  switch (block.type) {
    case "text":
      return <TextBlock key={`text-${index}`} block={block} />;
    case "media":
    case "gallery":
      return <MediaBlock key={`media-${index}`} block={block} tone={coverTone} />;
    case "video":
      return <VideoBlock key={`video-${index}`} block={block} />;
    case "pdf":
      return <PdfBlock key={`pdf-${index}`} block={block} />;
    case "beforeAfter":
      return <BeforeAfterBlock key={`ba-${index}`} block={block} tone={coverTone} />;
    case "code":
      return <CodeBlock key={`code-${index}`} {...blockProps(block)} />;
    case "quote":
      return <QuoteBlock key={`quote-${index}`} {...blockProps(block)} />;
    case "embed":
      return <EmbedBlock key={`embed-${index}`} {...blockProps(block)} />;
    case "divider":
      return <DividerBlock key={`divider-${index}`} {...blockProps(block)} />;
    case "callout":
      return <CalloutBlock key={`callout-${index}`} {...blockProps(block)} />;
    case "stats":
      return <StatsBlock key={`stats-${index}`} {...blockProps(block)} />;
    default:
      return null;
  }
}

function layoutWidthClass(layout?: BlockLayout): string {
  // 与导航栏 max-w-[1420px] 对齐，内容区域左右边界与头像/"无限进步"一致
  if (!layout || !layout.width || layout.width === "contained") {
    return "mx-auto max-w-[1420px] px-3 md:px-8";
  }
  if (layout.width === "narrow") return "mx-auto max-w-4xl px-3 md:px-8";
  if (layout.width === "free") return "relative mx-auto max-w-7xl";
  return ""; // full - 无约束
}

function TextBlock({ block }: { block: Extract<ContentBlock, { type: "text" }> }) {
  const align = block.layout?.align === "center" ? "text-center" : "text-left";
  return (
    <section className={`py-14 md:py-20 ${layoutWidthClass(block.layout)} ${align}`}>
      <h2 className="text-2xl font-semibold text-white md:text-3xl">
        {block.heading}
      </h2>
      <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-white/62 md:text-lg md:leading-9">
        {block.body}
      </p>
    </section>
  );
}

function MediaBlock({
  block,
  tone,
}: {
  block: Extract<ContentBlock, { type: "media" | "gallery" }>;
  tone: string;
}) {
  if (block.items.length === 0) return null;

  const isFree = block.layout?.width === "free";
  const free = block.layout?.free;
  const isGallery = block.type === "gallery";

  // 画廊列数
  const cols = isGallery
    ? block.layout?.columns === 2
      ? "grid-cols-2"
      : block.layout?.columns === 4
        ? "grid-cols-2 md:grid-cols-4"
        : "grid-cols-2 md:grid-cols-3"
    : "";

  return (
    <section className={`py-2 ${layoutWidthClass(block.layout)}`}>
      {block.caption ? (
        <p className="mb-4 text-sm font-medium text-white/50">{block.caption}</p>
      ) : null}

      <div
        className={
          isGallery
            ? `grid gap-2 md:gap-3 ${cols}`
            : isFree
              ? "relative h-[580px] md:h-[880px]"
              : "relative w-full overflow-hidden"
        }
      >
        {block.items.map((media, i) => (
          <div
            key={`${media.url ?? i}`}
            className={
              isFree
                ? "absolute overflow-hidden rounded-sm"
                : isGallery
                  ? "relative w-full overflow-hidden md:min-h-[60vh]"
                  : "relative w-full overflow-hidden"
            }
            style={
              isFree && free
                ? {
                    left: `${free.x}%`,
                    top: `${free.y}%`,
                    width: `${free.w}%`,
                    height: `${free.h}%`,
                  }
                : undefined
            }
          >
            <WorkMediaFrame
              media={media}
              tone={tone as never}
              className={isFree ? "h-full w-full" : "w-full"}
              objectPosition={
                block.type === "media" && block.focalPoint
                  ? `${block.focalPoint.x}% ${block.focalPoint.y}%`
                  : undefined
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function VideoBlock({ block }: { block: Extract<ContentBlock, { type: "video" }> }) {
  if (block.items.length === 0) return null;
  return (
    <section className={`py-2 ${layoutWidthClass(block.layout)}`}>
      {block.caption ? (
        <p className="mb-4 text-sm font-medium text-white/50">{block.caption}</p>
      ) : null}
      <div className="relative w-full overflow-hidden bg-black md:min-h-[80vh]">
        <video
          src={block.items[0].url}
          controls
          preload="metadata"
          className="w-full"
        />
      </div>
    </section>
  );
}

function PdfBlock({ block }: { block: Extract<ContentBlock, { type: "pdf" }> }) {
  if (block.items.length === 0) return null;
  const pdf = block.items[0];
  return (
    <section className={`py-8 ${layoutWidthClass(block.layout)}`}>
      {block.caption ? (
        <p className="mb-4 text-sm font-medium text-white/50">{block.caption}</p>
      ) : null}
      {pdf.storage_key ? (
        <PdfBlockRenderer storageKey={pdf.storage_key} caption={block.caption} />
      ) : null}
    </section>
  );
}

function BeforeAfterBlock({
  block,
  tone,
}: {
  block: Extract<ContentBlock, { type: "beforeAfter" }>;
  tone: string;
}) {
  return (
    <section className={`py-8 ${layoutWidthClass(block.layout)}`}>
      {block.heading ? <h2 className="mb-6 text-2xl font-semibold text-white">{block.heading}</h2> : null}
      {block.note ? <p className="mb-6 text-white/58">{block.note}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {[block.beforeMedia, block.afterMedia].map((media, i) => (
          <div key={i} className="space-y-2">
            <span className="font-mono text-xs text-white/40">
              {i === 0 ? block.beforeLabel : block.afterLabel}
            </span>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-white/[0.03]">
              {media ? (
                <WorkMediaFrame media={media} tone={tone as never} className="w-full" />
              ) : (
                <div className="w-full h-48" />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
