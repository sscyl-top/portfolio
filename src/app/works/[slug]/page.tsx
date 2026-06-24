import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { getPublishedWorks } from "@/data/portfolio";
import {
  createServerCmsRepository,
  getPrivatePreviewWorkBySlug,
} from "@/lib/cms/repository";
import { WorkReactions } from "@/components/works/WorkReactions";
import { WorkContentBlocks } from "@/components/works/WorkContentBlocks";
import type { ContentBlock, WorkMedia } from "@/data/portfolio";

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
    <main className="min-h-screen bg-[#050505] pb-24 pt-28 md:pt-32">
      {/* 头部信息：站酷风格，顶部标题 + 文字介绍 */}
      <header className="mx-auto max-w-5xl px-5 md:px-8">
        <Link
          href="/works"
          className="inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回全部作品
        </Link>

        <div className="mt-8 md:mt-12">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-copper">
            {work.category} / {work.year}
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-tight text-white md:text-6xl lg:text-7xl">
            {work.title}
          </h1>
        </div>

        <div className="mt-8 grid gap-8 border-y border-white/10 py-8 md:mt-12 md:grid-cols-[1fr_auto] md:items-start">
          <p className="max-w-3xl whitespace-pre-wrap text-base leading-8 text-white/62 md:text-lg md:leading-9">
            {work.summary}
          </p>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
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

      {/* 内容块区域：无框、自由排版 */}
      <div className="mt-8 md:mt-12">
        <WorkContentBlocks blocks={work.blocks} coverTone={work.coverTone} />
      </div>

      {/* 互动区 */}
      <section className="mx-auto mt-16 max-w-5xl px-5 md:px-8">
        <WorkReactions workSlug={work.slug} />
      </section>

      {/* 相关作品 */}
      {relatedWorks.length > 0 ? (
        <aside className="mx-auto mt-16 max-w-5xl border-t border-white/10 px-5 pt-10 md:px-8">
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
