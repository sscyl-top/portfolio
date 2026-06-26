import type { MetadataRoute } from "next";
import { createServerCmsRepository } from "@/lib/cms/repository";
import { getBackendReadiness } from "@/lib/supabase/config";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sscyl.top";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // static pages
  const entries: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/works`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/resume`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  // dynamic works (from CMS if available, fallback to static)
  try {
    const readiness = getBackendReadiness();
    if (readiness.cms) {
      const repository = await createServerCmsRepository();
      const works = await repository.listPublishedWorks();
      for (const work of works) {
        entries.push({
          url: `${BASE_URL}/works/${work.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.8,
        });
      }
    }
  } catch {
    // CMS unavailable — static pages only
  }

  return entries;
}
