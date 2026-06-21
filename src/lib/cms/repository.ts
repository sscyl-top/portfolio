import {
  getPublishedWorks,
  getStaticSiteSettings,
  getStaticVisibleCategories,
  type Work,
} from "@/data/portfolio";

export type CmsReadSource = {
  listPublishedWorks(): Promise<Work[]>;
  listVisibleCategories(): Promise<Array<{ name: string; sort_order: number }>>;
  getSiteSettings(): Promise<unknown>;
};

export function createCmsRepository(source: CmsReadSource | null) {
  return {
    async listPublishedWorks() {
      if (source) return source.listPublishedWorks();
      return getPublishedWorks();
    },
    async listVisibleCategories() {
      if (source) return source.listVisibleCategories();
      return getStaticVisibleCategories();
    },
    async getSiteSettings() {
      if (source) return source.getSiteSettings();
      return getStaticSiteSettings();
    },
  };
}
