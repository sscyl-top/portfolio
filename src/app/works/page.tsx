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
      <section className="px-5 pb-24 pt-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="font-mono text-xs uppercase text-copper">
              Projects / Works Archive
            </p>
            <h2 className="mt-5 text-5xl font-semibold leading-tight text-white md:text-7xl">
              全部作品
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/58">
              按视觉设计、品牌全案、概念设计、包装设计、电商设计和工作案例归档。后续接入后台后，作品数量会跟随你发布的内容自动变化。
            </p>
          </div>
          <WorksExplorer works={works} />
        </div>
      </section>
      <CompositeDesignWall works={compositeWorks} />
    </main>
  );
}
