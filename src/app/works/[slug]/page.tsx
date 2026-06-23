import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { BlockLayout } from "@/data/portfolio";

import {
  getPublishedWorks,
} from "@/data/portfolio";
import {
  createServerCmsRepository,
  getPrivatePreviewWorkBySlug,
} from "@/lib/cms/repository";
import { WorkMediaFrame } from "@/components/works/WorkMediaFrame";
import { PdfBlockRenderer } from "@/components/works/PdfBlockRenderer";

/** 根据 layout 字段返回对应的宽度 CSS 类 */
function layoutWidthClass(layout?: BlockLayout): string {
  if (!layout || layout.width === "contained" || !layout.width) {
    return "max-w-6xl mx-auto";
  }
  if (layout.width === "narrow") return "max-w-3xl mx-auto";
  if (layout.width === "free") return "relative mx-auto max-w-6xl min-h-[520px]";
  return ""; // full: 无约束
}

/** 根据 layout 返回 section 的额外 class */
function layoutSectionClass(layout?: BlockLayout): string {
  if (layout?.width === "free") {
    // 自由定位：作为画布容器，内部元素绝对定位
    return "rounded-lg border border-white/10 bg-white/[0.035] p-0 overflow-hidden";
  }
  if (layout?.width === "full") {
    // 满宽：去掉边框/圆角/背景，让内容真正通栏
    return "border-0 bg-transparent p-0";
  }
  return "rounded-lg border border-white/10 bg-white/[0.035] p-6";
}

export function generateStaticParams() {
  return getPublishedWorks().map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const repository = await createServerCmsRepository();
  const work = await repository.getWorkBySlug(slug);

  if (!work) return { title: slug };

  const ogImage = work.shareMedia?.url ?? work.coverMedia?.url;

  return {
    title: work.title,
    description: work.summary,
    openGraph: {
      title: work.title,
      description: work.summary,
      type: "article",
      ...(ogImage ? { images: [{ url: ogImage, alt: work.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: work.title,
      description: work.summary,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function WorkDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const previewToken = Array.isArray(preview) ? preview[0] : preview;
  const repository = await createServerCmsRepository();
  const work = previewToken
    ? await getPrivatePreviewWorkBySlug(slug, previewToken)
    : await repository.getWorkBySlug(slug);

  if (!work || (work.status !== "published" && !previewToken)) {
    notFound();
  }

  const relatedWorks = await repository.getRelatedWorks(work.slug);

  return (
    <main className="px-5 pb-24 pt-32 md:px-8">
      {/* 头部信息：约束在 max-w-6xl 内 */}
      <article className="mx-auto max-w-6xl">
        <Link
          href="/works"
          className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回全部作品
        </Link>

        <header className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-copper">
              {work.category} / {work.year}
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight text-white md:text-7xl">
              {work.title}
            </h1>
          </div>
          <div className="space-y-6">
            <p className="text-lg leading-8 text-white/62">{work.summary}</p>
            <div className="flex flex-wrap gap-2">
              {work.tags.concat(work.tools).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/52"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="mt-14 min-h-[520px] rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_68%_24%,rgba(201,162,127,0.18),transparent_32%),linear-gradient(135deg,#171717,#050505_60%,#111)] p-8">
          <div className="relative h-full min-h-[460px] overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
            <WorkMediaFrame media={work.coverMedia} tone={work.coverTone} />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_52%,rgba(0,0,0,0.5))]" />
          </div>
        </div>
      </article>

      {/* 内容块区域：每个块自己控制宽度 */}
      <div className="mt-16 grid gap-6">
          {work.blocks.map((block) => {
            if (block.type === "media" || block.type === "gallery") {
              if (block.items.length === 0) return null;
              const lw = layoutWidthClass(block.layout);
              const ls = layoutSectionClass(block.layout);
              const isFree = block.layout?.width === "free";
              const free = block.layout?.free;
              const galCols =
                block.type === "gallery"
                  ? (block.layout?.columns === 2 ? "grid-cols-2"
                    : block.layout?.columns === 4 ? "grid-cols-2 md:grid-cols-4"
                    : "grid-cols-2 md:grid-cols-3")
                  : "";
              return (
                <section
                  key={`${block.type}-${block.items[0]?.url ?? "empty"}`}
                  className={`grid gap-5 ${ls} ${lw}`}
                >
                  {block.caption && !isFree ? (
                    <p className="text-sm font-medium text-white/54">
                      {block.caption}
                    </p>
                  ) : null}
                  <div
                    className={
                      block.type === "gallery"
                        ? `grid gap-4 ${galCols}`
                        : isFree
                          ? "relative h-full w-full"
                          : ""
                    }
                  >
                    {block.items.map((media, i) => (
                      <WorkMediaFrame
                        key={media.url ?? i}
                        media={media}
                        tone="graphite"
                        className={
                          isFree
                            ? "absolute rounded-lg"
                            : block.type === "media"
                              ? `w-full rounded-lg ${block.layout?.width === "full" ? "h-[70vh] object-cover" : "max-h-[70vh]"}`
                              : "w-full rounded-lg"
                        }
                        objectPosition={
                          block.type === "media" && block.focalPoint
                            ? `${block.focalPoint.x}% ${block.focalPoint.y}%`
                            : undefined
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
                      />
                    ))}
                  </div>
                </section>
              );
            }

            if (block.type === "text") {
              const lw = layoutWidthClass(block.layout);
              const ls = layoutSectionClass(block.layout);
              const alignClass = block.layout?.align === "center" ? "text-center" : "text-left";
              return (
                <section
                  key={block.heading}
                  className={`grid gap-5 ${ls} ${lw} ${alignClass}`}
                >
                  <h2 className="text-2xl font-semibold text-white">
                    {block.heading}
                  </h2>
                  <p className="text-base leading-8 text-white/62">
                    {block.body}
                  </p>
                </section>
              );
            }

            if (block.type === "beforeAfter") {
              const lw = layoutWidthClass(block.layout);
              const ls = layoutSectionClass(block.layout);
              return (
                <section
                  key={block.heading}
                  className={`${ls} ${lw}`}
                >
                  {block.heading ? (
                    <h2 className="text-2xl font-semibold text-white">
                      {block.heading}
                    </h2>
                  ) : null}
                  {block.note ? (
                    <p className="mt-3 text-white/58">{block.note}</p>
                  ) : null}
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {[block.beforeLabel, block.afterLabel].map((label, i) => {
                      const media = i === 0 ? block.beforeMedia : block.afterMedia;
                      return (
                        <div
                          key={label}
                          className="min-h-80 rounded-lg border border-white/10 bg-[linear-gradient(135deg,#111,#2b2b2b_46%,#050505)] overflow-hidden"
                        >
                          <span className="block p-3 font-mono text-xs text-white/45">
                            {label}
                          </span>
                          {media ? (
                            <WorkMediaFrame
                              media={media}
                              tone="graphite"
                              className="w-full max-h-[520px]"
                            />
                          ) : (
                            <div className="min-h-64" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            }

            if (block.type === "video") {
              if (block.items.length === 0) return null;
              const lw = layoutWidthClass(block.layout);
              const ls = layoutSectionClass(block.layout);
              return (
                <section
                  key={`video-${block.items[0]?.url ?? "empty"}`}
                  className={`grid gap-5 ${ls} ${lw}`}
                >
                  {block.caption ? (
                    <p className="text-sm font-medium text-white/54">
                      {block.caption}
                    </p>
                  ) : null}
                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <video
                      src={block.items[0].url}
                      controls
                      preload="metadata"
                      className="w-full max-h-[70vh] bg-black"
                    />
                  </div>
                </section>
              );
            }

            if (block.type === "pdf") {
              if (block.items.length === 0) return null;
              const pdfMedia = block.items[0];
              const lw = layoutWidthClass(block.layout);
              const ls = layoutSectionClass(block.layout);
              return (
                <section
                  key={`pdf-${pdfMedia?.url ?? "empty"}`}
                  className={`grid gap-5 ${ls} ${lw}`}
                >
                  {block.caption ? (
                    <p className="text-sm font-medium text-white/54">
                      {block.caption}
                    </p>
                  ) : null}
                  {pdfMedia.storage_key ? (
                    <PdfBlockRenderer
                      storageKey={pdfMedia.storage_key}
                      caption={block.caption}
                    />
                  ) : null}
                </section>
              );
            }

            return (
              <section
                key={block.type}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-6"
              >
                <div className="mt-6 min-h-96 rounded-lg border border-white/10 bg-[linear-gradient(135deg,#111,#3a3935_50%,#050505)]" />
                <p className="mt-4 font-mono text-xs text-white/38">
                  {block.type} 块
                </p>
              </section>
            );
          })}
        </div>

        {relatedWorks.length > 0 ? (
          <aside className="mt-16 border-t border-white/10 pt-10">
            <h2 className="text-2xl font-semibold text-white">相关作品</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {relatedWorks.map((related) => (
                <Link
                  key={related.slug}
                  href={`/works/${related.slug}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-5 text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  {related.title}
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </aside>
          ) : null}
    </main>
  );
}
