import { CompositeDesignWall } from "@/components/works/CompositeDesignWall";
import { RepresentativeWorks } from "@/components/works/RepresentativeWorks";
import { WorksExplorer } from "@/components/works/WorksExplorer";
import { WorksPageShell } from "@/components/works/WorksPageShell";
import { createServerCmsRepository } from "@/lib/cms/repository";

export default async function WorksPage() {
  const repository = await createServerCmsRepository();
  const [works, featuredWorks, compositeWorks, visibleCategories] =
    await Promise.all([
      repository.listPublishedWorks(),
      repository.listFeaturedWorks(),
      repository.listCompositeWorks(),
      repository.listVisibleCategories(),
    ]);
  const categoryNames = visibleCategories.map((category) => category.name);

  return (
    <WorksPageShell>
      <RepresentativeWorks works={featuredWorks} />
      <WorksExplorer works={works} categoryNames={categoryNames} />
      <CompositeDesignWall works={compositeWorks} />
    </WorksPageShell>
  );
}
