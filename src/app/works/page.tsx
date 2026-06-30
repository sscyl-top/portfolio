import type { Metadata } from "next";
import { CompositeDesignWall } from "@/components/works/CompositeDesignWall";
import { RepresentativeWorks } from "@/components/works/RepresentativeWorks";
import { SectionTitleObserver } from "@/components/works/SectionTitleObserver";
import { WorksExplorer } from "@/components/works/WorksExplorer";
import { WorksPageShell } from "@/components/works/WorksPageShell";
import { createServerCmsRepository } from "@/lib/cms/repository";
import { getTextContentsByKeys } from "@/lib/cms/text-content";

// ISR：revalidate=60 兜底（root layout 已设），后台修改通过 revalidatePath 立即刷新
export const revalidate = 60;

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
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let works: any[] = [];
  let featuredWorks: any[] = [];
  let compositeWorks: any[] = [];
  let visibleCategories: any[] = [];
  /* eslint-enable @typescript-eslint/no-explicit-any */
  let texts: Record<string, { content: string; styles: Record<string, string> }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let siteSettings: any = {
    ctaCardMediaUrl: null,
    ctaFigureMediaUrl: null,
    ctaFigureLightMediaUrl: null,
    ctaTickerLogoMediaUrl: null,
    ctaTickerLogoMediaUrls: [],
    ctaCenterLogoMediaUrl: null,
    ctaCardScale: 1,
    ctaCardOffsetX: 0,
    ctaCardOffsetY: 0,
    ctaFigureScale: 1,
    ctaFigureOffsetX: 0,
    ctaFigureOffsetY: 0,
    ctaFigureLightScale: 1,
    ctaFigureLightOffsetX: 0,
    ctaFigureLightOffsetY: 0,
    ctaTickerLogoScale: 1,
    ctaTickerLogoOffsetX: 0,
    ctaTickerLogoOffsetY: 0,
    ctaCenterLogoScale: 1,
    ctaCenterLogoOffsetX: 0,
    ctaCenterLogoOffsetY: 0,
  };

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

  const featuredTextOverrides = {
    featuredKicker: pickText(texts, "works.featuredKicker"),
    featuredTitle: pickText(texts, "works.featuredTitle"),
    featuredDescription: pickText(texts, "works.featuredDescription"),
    swipeHint: pickText(texts, "works.swipeHint"),
  };

  const explorerTextOverrides = {
    allWorksKicker: pickText(texts, "works.allWorksKicker"),
    allWorksTitle: pickText(texts, "works.allWorksTitle"),
    allWorksDescription: pickText(texts, "works.allWorksDescription"),
    emptyCategory: pickText(texts, "works.emptyCategory"),
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
        ctaFigureLightUrl={siteSettings.ctaFigureLightMediaUrl}
        ctaTickerLogoUrls={siteSettings.ctaTickerLogoMediaUrls}
        ctaCenterLogoUrl={siteSettings.ctaCenterLogoMediaUrl}
        ctaCardScale={siteSettings.ctaCardScale}
        ctaCardOffsetX={siteSettings.ctaCardOffsetX}
        ctaCardOffsetY={siteSettings.ctaCardOffsetY}
        ctaFigureScale={siteSettings.ctaFigureScale}
        ctaFigureOffsetX={siteSettings.ctaFigureOffsetX}
        ctaFigureOffsetY={siteSettings.ctaFigureOffsetY}
        ctaFigureLightScale={siteSettings.ctaFigureLightScale}
        ctaFigureLightOffsetX={siteSettings.ctaFigureLightOffsetX}
        ctaFigureLightOffsetY={siteSettings.ctaFigureLightOffsetY}
        ctaTickerLogoScale={siteSettings.ctaTickerLogoScale}
        ctaTickerLogoOffsetX={siteSettings.ctaTickerLogoOffsetX}
        ctaTickerLogoOffsetY={siteSettings.ctaTickerLogoOffsetY}
        ctaCenterLogoScale={siteSettings.ctaCenterLogoScale}
        ctaCenterLogoOffsetX={siteSettings.ctaCenterLogoOffsetX}
        ctaCenterLogoOffsetY={siteSettings.ctaCenterLogoOffsetY}
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
