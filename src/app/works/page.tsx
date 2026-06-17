import { CompositeDesignWall } from "@/components/works/CompositeDesignWall";
import { RepresentativeWorks } from "@/components/works/RepresentativeWorks";
import { WorksExplorer } from "@/components/works/WorksExplorer";
import { WorksPageShell } from "@/components/works/WorksPageShell";
import {
  getCompositeWorks,
  getFeaturedWorks,
  getPublishedWorks,
} from "@/data/portfolio";

export default function WorksPage() {
  const works = getPublishedWorks();
  const featuredWorks = getFeaturedWorks();
  const compositeWorks = getCompositeWorks();

  return (
    <WorksPageShell>
      <RepresentativeWorks works={featuredWorks} />
      <WorksExplorer works={works} />
      <CompositeDesignWall works={compositeWorks} />
    </WorksPageShell>
  );
}
