import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  createServerCmsRepository,
  getPrivatePreviewWorkBySlug,
  listPublishedWorkSlugs,
} from "@/lib/cms/repository";
import { WorkDetailContent } from "@/components/works/WorkDetailContent";

// ISR 策略：构建时预生成已发布作品的静态 HTML，访问 ?preview=xxx 时动态生成
// 后台编辑通过 revalidatePath 立即刷新；60 秒兜底自动重新生成
export const revalidate = 60;
export const dynamicParams = true; // 允许新发布的作品动态生成（不返回 404）

/**
 * 构建时预生成所有已发布作品的静态 HTML
 * 收益：访问作品详情页时直接从 CDN 返回，无需走 Supabase 查询
 * 私人预览（?preview=xxx）和未知 slug 走动态渲染
 */
export async function generateStaticParams() {
  try {
    const slugs = await listPublishedWorkSlugs();
    return slugs.map(({ slug }) => ({ slug }));
  } catch {
    // 静态数据回退已由 listPublishedWorkSlugs 内部处理
    return [];
  }
}

const FROM_TITLES: Record<string, string> = {
  featured: "sscyl.top-代表作",
  works: "sscyl.top-分类作品",
  composite: "sscyl.top-早期作品",
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { from } = await searchParams;
  const fromKey = Array.isArray(from) ? from[0] : from;
  const pageTitle = FROM_TITLES[fromKey ?? ""] ?? "sscyl.top-分类作品";

  const repository = await createServerCmsRepository();
  const work = await repository.getWorkBySlug(slug);

  if (!work) return { title: pageTitle };

  const ogImage = work.shareMedia?.url ?? work.coverMedia?.url;

  return {
    title: pageTitle,
    description: work.summary,
    openGraph: {
      title: pageTitle,
      description: work.summary,
      type: "article",
      ...(ogImage ? { images: [{ url: ogImage, alt: work.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
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

  return <WorkDetailContent work={work} relatedWorks={relatedWorks} />;
}
