import { CompositeDesignWall } from "@/components/works/CompositeDesignWall";
import { RepresentativeWorks } from "@/components/works/RepresentativeWorks";
import { WorksExplorer } from "@/components/works/WorksExplorer";
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
    <main>
      <RepresentativeWorks works={featuredWorks} />
      <WorksExplorer works={works} />
      <CompositeDesignWall works={compositeWorks} />
    </main>
  );
}
