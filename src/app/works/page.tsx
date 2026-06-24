import type { Metadata } from "next";
import { CompositeDesignWall } from "@/components/works/CompositeDesignWall";
import { RepresentativeWorks } from "@/components/works/RepresentativeWorks";
import { SectionTitleObserver } from "@/components/works/SectionTitleObserver";
import { WorksExplorer } from "@/components/works/WorksExplorer";
import { WorksPageShell } from "@/components/works/WorksPageShell";
import { createServerCmsRepository } from "@/lib/cms/repository";
import { getTextContentsByKeys } from "@/lib/cms/text-content";

export const metadata: Metadata = {
  title: "sscyl.top-代表作",
};

const WORKS_TEXT_KEYS = [
  "works.composite.kicker",
  "works.composite.title",
  "works.composite.description",
  "works.cta.resume",
  "works.cta.hiring",
  "works.cta.commercial",
];

export default async function WorksPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let works: any[] = [];
  let featuredWorks: any[] = [];
  let compositeWorks: any[] = [];
  let visibleCategories: any[] = [];
  let texts: Record<string, { content: string; styles: Record<string, string> }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let siteSettings: any = { ctaCardMediaUrl: null, ctaFigureMediaUrl: null, ctaTickerLogoMediaUrl: null };

  try {
    const repository = await createServerCmsRepository();
    [works, featuredWorks, compositeWorks, visibleCategories, texts, siteSettings] =
      await Promise.all([
        repository.listPublishedWorks(),
        repository.listFeaturedWorks(),
        repository.listCompositeWorks(),
        repository.listVisibleCategories(),
        getTextContentsByKeys(WORKS_TEXT_KEYS),
        repository.getSiteSettings(),
      ]);
  } catch (error) {
    console.error("[works/page] 数据获取失败，使用空数据:", error);
  }
  const categoryNames = visibleCategories.map((category) => category.name);

  const textOverrides = {
    compositeKicker: pickText(texts, "works.composite.kicker"),
    compositeTitle: pickText(texts, "works.composite.title"),
    compositeDescription: pickText(texts, "works.composite.description"),
    ctaResume: pickText(texts, "works.cta.resume"),
    ctaHiring: pickText(texts, "works.cta.hiring"),
    ctaCommercial: pickText(texts, "works.cta.commercial"),
  };

  return (
    <WorksPageShell>
      <SectionTitleObserver />
      <RepresentativeWorks works={featuredWorks} />
      <WorksExplorer works={works} categoryNames={categoryNames} />
      <CompositeDesignWall
        works={compositeWorks}
        textOverrides={textOverrides}
        ctaCardUrl={siteSettings.ctaCardMediaUrl}
        ctaFigureUrl={siteSettings.ctaFigureMediaUrl}
        ctaTickerLogoUrl={siteSettings.ctaTickerLogoMediaUrl}
      />
    </WorksPageShell>
  );
}

function pickText(
  texts: Record<string, { content: string; styles: Record<string, string> }>,
  key: string,
): string | undefined {
  const content = texts[key]?.content;
  if (!content || content === key) return undefined;
  return content;
}
