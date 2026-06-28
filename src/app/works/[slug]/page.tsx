import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  createServerCmsRepository,
  getPrivatePreviewWorkBySlug,
} from "@/lib/cms/repository";
import { WorkDetailContent } from "@/components/works/WorkDetailContent";

export const dynamic = 'force-dynamic';

const FROM_TITLES: Record<string, string> = {
  featured: "sscyl.top-代表作",
  works: "sscyl.top-全部作品",
  composite: "sscyl.top-复合设计",
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
  const pageTitle = FROM_TITLES[fromKey ?? ""] ?? "sscyl.top-全部作品";

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
