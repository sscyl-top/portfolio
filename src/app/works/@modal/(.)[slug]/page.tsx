import { notFound } from "next/navigation";

import {
  createServerCmsRepository,
  getPrivatePreviewWorkBySlug,
} from "@/lib/cms/repository";
import { WorkDetailContent } from "@/components/works/WorkDetailContent";

export default async function WorkModalPage({
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

  return <WorkDetailContent work={work} relatedWorks={relatedWorks} isModal />;
}
