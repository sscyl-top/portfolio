"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContentBlock, BlockLayout } from "@/data/portfolio";
import { WorkMediaFrame } from "./WorkMediaFrame";
import { SmartVideo, SmartGifBoundary } from "./SmartVideo";
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
  mediaNoGap?: boolean;
  isModal?: boolean;
};

/**
 * 作品详情内容块渲染器（站酷风格）
 * - 图片/视频/动图直接展示，无卡片边框
 * - 文字块居中带适度宽度
 * - 支持自由排版（free layout）
 */
export function WorkContentBlocks({ blocks, coverTone, mediaNoGap = false, isModal = false }: Props) {
  return (
    <div className="space-y-0">
      {blocks.map((block, index) => renderBlock(block, index, coverTone, mediaNoGap, isModal))}
    </div>
  );
}

function blockProps<T extends ContentBlock>(block: T): Omit<T, "type" | "layout"> {
  return Object.fromEntries(
    Object.entries(block).filter(([key]) => key !== "type" && key !== "layout"),
  ) as Omit<T, "type" | "layout">;
}

// ── 图库 Lightbox（点击查看大图）─────────────────────────────
function GalleryLightbox({
  items,
  initialIndex,
  onClose,
}: {
  items: { url?: string; alt?: string }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const go = useCallback((delta: number) => {
    setIndex((i) => Math.max(0, Math.min(items.length - 1, i + delta)));
  }, [items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) go(-1);
      if (e.key === "ArrowRight" && hasNext) go(1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, hasPrev, hasNext, go]);

  const current = items[index];
  if (!current?.url) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 关闭按钮 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
        aria-label="关闭"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 上一张 */}
      {hasPrev ? (
        <button
          type="button"
          onClick={() => go(-1)}
          className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white md:left-6"
          aria-label="上一张"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      ) : null}

      {/* 图片 */}
      <img
        src={current.url}
        alt={current.alt ?? `${index + 1}/${items.length}`}
        className="max-h-[85vh] max-w-[90vw] object-contain"
      />

      {/* 下一张 */}
      {hasNext ? (
        <button
          type="button"
          onClick={() => go(1)}
          className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white md:right-6"
          aria-label="下一张"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      ) : null }

      {/* 计数器 */}
      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-white/40">
        {index + 1} / {items.length}
      </span>
    </div>
  );
}

function renderBlock(block: ContentBlock, index: number, coverTone: string, mediaNoGap: boolean = false, isModal: boolean = false) {
  switch (block.type) {
    case "text":
      return <TextBlock key={`text-${index}`} block={block} isModal={isModal} />;
    case "media":
    case "gallery":
      return <MediaBlock key={`media-${index}`} block={block} tone={coverTone} noGap={mediaNoGap} isModal={isModal} />;
    case "video":
      return <VideoBlock key={`video-${index}`} block={block} noGap={mediaNoGap} isModal={isModal} />;
    case "pdf":
      return <PdfBlock key={`pdf-${index}`} block={block} isModal={isModal} />;
    case "beforeAfter":
      return <BeforeAfterBlock key={`ba-${index}`} block={block} tone={coverTone} isModal={isModal} />;
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

function layoutWidthClass(layout?: BlockLayout, isModal: boolean = false): string {
  if (isModal) {
    if (!layout || !layout.width || layout.width === "contained") {
      return "mx-auto w-full px-4 md:px-8 lg:px-10";
    }
    if (layout.width === "narrow") return "mx-auto max-w-5xl px-4 md:px-8 lg:px-10";
    if (layout.width === "free") return "relative mx-auto w-full px-0";
    return "w-full px-0";
  }
  if (!layout || !layout.width || layout.width === "contained") {
    return "mx-auto max-w-[1420px] px-3 md:px-8";
  }
  if (layout.width === "narrow") return "mx-auto max-w-4xl px-3 md:px-8";
  if (layout.width === "free") return "relative mx-auto max-w-7xl";
  return "";
}

function mediaWidthClass(layout?: BlockLayout, isModal: boolean = false): string {
  if (isModal) {
    if (!layout || !layout.width || layout.width === "contained") {
      return "mx-auto w-full px-0";
    }
    if (layout.width === "narrow") return "mx-auto max-w-5xl px-4 md:px-8 lg:px-10";
    if (layout.width === "free") return "relative mx-auto w-full px-0";
    return "w-full px-0";
  }
  return layoutWidthClass(layout, false);
}

function captionPadClass(isModal: boolean = false): string {
  return isModal ? "px-4 md:px-8 lg:px-10" : "";
}

function textWidthClass(layout?: BlockLayout, isModal: boolean = false): string {
  if (isModal) {
    if (!layout || !layout.width || layout.width === "contained") {
      return "mx-auto w-full max-w-3xl px-4 md:px-8 lg:px-10";
    }
    if (layout.width === "narrow") return "mx-auto max-w-2xl px-4 md:px-8 lg:px-10";
    if (layout.width === "free") return "relative mx-auto w-full px-4 md:px-8 lg:px-10";
    return "mx-auto w-full max-w-3xl px-4 md:px-8 lg:px-10";
  }
  return layoutWidthClass(layout, false);
}

function TextBlock({ block, isModal = false }: { block: Extract<ContentBlock, { type: "text" }>; isModal?: boolean }) {
  const align =
    block.layout?.align === "center"
      ? "text-center"
      : block.layout?.align === "right"
        ? "text-right"
        : "text-left";
  return (
    <section className={`py-14 md:py-20 ${textWidthClass(block.layout, isModal)} ${align}`}>
      <h2 className="text-2xl font-semibold text-ink md:text-3xl">
        {block.heading}
      </h2>
      <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-ink-2 md:text-lg md:leading-9">
        {block.body}
      </p>
    </section>
  );
}

function MediaBlock({
  block,
  tone,
  noGap = false,
  isModal = false,
}: {
  block: Extract<ContentBlock, { type: "media" | "gallery" }>;
  tone: string;
  noGap?: boolean;
  isModal?: boolean;
}) {
  // 图库 Lightbox 状态 - 必须在条件返回之前声明以遵守 hooks 规则
  const [lightboxIdx, setLightboxIdx] = useState(-1);

  if (block.items.length === 0) return null;

  const isFree = block.layout?.width === "free";
  const free = block.layout?.free;
  const isGallery = block.type === "gallery";
  const isSingle = !isGallery && !isFree;

  // 画廊列数
  const cols = isGallery
    ? block.layout?.columns === 1
      ? "grid-cols-1"
      : block.layout?.columns === 2
        ? "grid-cols-2"
        : block.layout?.columns === 4
          ? "grid-cols-2 md:grid-cols-4"
          : "grid-cols-2 md:grid-cols-3"
    : "";

  const sectionPy = noGap ? "py-0" : "py-2";
  const galleryGap = noGap ? "gap-0" : "gap-2 md:gap-3";

  return (
    <section className={`${sectionPy} ${mediaWidthClass(block.layout, isModal)}`}>
      {block.caption ? (
        <p className={`text-sm font-medium text-ink-3 ${captionPadClass(isModal)} ${noGap ? "mb-0" : "mb-4"}`}>{block.caption}</p>
      ) : null}

      <div
        className={
          isGallery
            ? `grid ${galleryGap} ${cols}`
            : isFree
              ? "relative h-[580px] md:h-[880px]"
              : "w-full"
        }
      >
        {block.items.map((media, i) => (
          <div
            key={`${media.url ?? i}`}
            className={
              isFree
                ? "absolute overflow-hidden rounded-sm"
                : isGallery
                  ? "relative cursor-zoom-in overflow-hidden"
                  : "w-full"
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
            onClick={isGallery ? () => setLightboxIdx(i) : undefined}
          >
            {isSingle ? (
              media.mimeType === "image/gif" ? (
                <SmartGifBoundary className="w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.url}
                    alt={media.alt ?? ""}
                    className="block w-full h-auto"
                    style={
                      block.type === "media" && block.focalPoint
                        ? { objectPosition: `${block.focalPoint.x}% ${block.focalPoint.y}%` }
                        : undefined
                    }
                  />
                </SmartGifBoundary>
              ) : media.mimeType?.startsWith("image/") ? (
                <img
                  src={media.url}
                  alt={media.alt ?? ""}
                  className="block w-full h-auto"
                  style={
                    block.type === "media" && block.focalPoint
                      ? { objectPosition: `${block.focalPoint.x}% ${block.focalPoint.y}%` }
                      : undefined
                  }
                />
              ) : media.mimeType?.startsWith("video/") ? (
                <SmartVideo
                  src={media.url}
                  controls
                  className="w-full h-auto block"
                  showContainer={false}
                />
              ) : (
                <WorkMediaFrame
                  media={media}
                  tone={tone as never}
                  className="h-full w-full"
                  objectPosition={
                    block.type === "media" && block.focalPoint
                      ? `${block.focalPoint.x}% ${block.focalPoint.y}%`
                      : undefined
                  }
                />
              )
            ) : isGallery ? (
              media.mimeType === "image/gif" ? (
                <SmartGifBoundary className="w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.url}
                    alt={media.alt ?? ""}
                    className="block w-full h-auto"
                  />
                </SmartGifBoundary>
              ) : media.mimeType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={media.url}
                  alt={media.alt ?? ""}
                  className="block w-full h-auto"
                />
              ) : media.mimeType?.startsWith("video/") ? (
                <SmartVideo
                  src={media.url}
                  controls
                  className="w-full h-auto block"
                  showContainer={false}
                />
              ) : (
                <WorkMediaFrame
                  media={media}
                  tone={tone as never}
                  className="w-full"
                />
              )
            ) : (
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
            )}
          </div>
        ))}
      </div>

      {/* 图库 Lightbox */}
      {isGallery && lightboxIdx >= 0 && (
        <GalleryLightbox
          items={block.items}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(-1)}
        />
      )}
    </section>
  );
}

function VideoBlock({
  block,
  noGap = false,
  isModal = false,
}: {
  block: Extract<ContentBlock, { type: "video" }>;
  noGap?: boolean;
  isModal?: boolean;
}) {
  if (block.items.length === 0) return null;
  const sectionPy = noGap ? "py-0" : "py-2";
  return (
    <section className={`${sectionPy} ${mediaWidthClass(block.layout, isModal)}`}>
      {block.caption ? (
        <p className={`text-sm font-medium text-ink-3 ${captionPadClass(isModal)} ${noGap ? "mb-0" : "mb-4"}`}>{block.caption}</p>
      ) : null}
      <SmartVideo
        src={block.items[0].url}
        controls
        className="w-full h-auto block"
      />
    </section>
  );
}

function PdfBlock({ block, isModal = false }: { block: Extract<ContentBlock, { type: "pdf" }>; isModal?: boolean }) {
  if (block.items.length === 0) return null;
  const pdf = block.items[0];
  return (
    <section className={`py-8 ${layoutWidthClass(block.layout, isModal)}`}>
      {block.caption ? (
        <p className="mb-4 text-sm font-medium text-ink-3">{block.caption}</p>
      ) : null}
      {pdf.storage_key ? (
        <PdfBlockRenderer storageKey={pdf.storage_key} caption={block.caption} />
      ) : (
        <a
          href={pdf.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-md border border-edge-2 bg-surface-2 p-4 text-sm text-ink-2 transition hover:border-edge hover:text-ink"
        >
          <svg className="h-6 w-6 text-orange-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          查看 PDF
        </a>
      )}
    </section>
  );
}

function BeforeAfterBlock({
  block,
  tone,
  isModal = false,
}: {
  block: Extract<ContentBlock, { type: "beforeAfter" }>;
  tone: string;
  isModal?: boolean;
}) {
  return (
    <section className={`py-8 ${layoutWidthClass(block.layout, isModal)}`}>
      {block.heading ? <h2 className="mb-6 text-2xl font-semibold text-ink">{block.heading}</h2> : null}
      {block.note ? <p className="mb-6 text-ink-2">{block.note}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {[block.beforeMedia, block.afterMedia].map((media, i) => (
          <div key={i} className="space-y-2">
            <span className="font-mono text-xs text-ink-4">
              {i === 0 ? block.beforeLabel : block.afterLabel}
            </span>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-surface-3">
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
