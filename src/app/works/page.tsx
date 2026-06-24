import { CompositeDesignWall } from "@/components/works/CompositeDesignWall";
import { RepresentativeWorks } from "@/components/works/RepresentativeWorks";
import { WorksExplorer } from "@/components/works/WorksExplorer";
import { WorksPageShell } from "@/components/works/WorksPageShell";
import { createServerCmsRepository } from "@/lib/cms/repository";
import { getTextContentsByKeys } from "@/lib/cms/text-content";

const WORKS_TEXT_KEYS = [
  "works.composite.kicker",
  "works.composite.title",
  "works.composite.description",
  "works.cta.resume",
  "works.cta.hiring",
  "works.cta.commercial",
];

export default async function WorksPage() {
  const repository = await createServerCmsRepository();
  const [works, featuredWorks, compositeWorks, visibleCategories, texts, siteSettings] =
    await Promise.all([
      repository.listPublishedWorks(),
      repository.listFeaturedWorks(),
      repository.listCompositeWorks(),
      repository.listVisibleCategories(),
      getTextContentsByKeys(WORKS_TEXT_KEYS),
      repository.getSiteSettings(),
    ]);
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
      <RepresentativeWorks works={featuredWorks} />
      <WorksExplorer works={works} categoryNames={categoryNames} />
      <CompositeDesignWall
        works={compositeWorks}
        textOverrides={textOverrides}
        ctaCardUrl={siteSettings.ctaCardMediaUrl}
        ctaFigureUrl={siteSettings.ctaFigureMediaUrl}
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
