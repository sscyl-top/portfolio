import {
  getCompositeWorks,
  getFeaturedWorks,
  getPublishedWorks,
  getRelatedWorks,
  getStaticVisibleCategories,
  getStaticSiteSettings,
  getWorkBySlug,
  type Work,
} from "@/data/portfolio";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CmsReadSource = {
  listPublishedWorks(): Promise<Work[]>;
  listVisibleCategories(): Promise<Array<{ name: string; sort_order: number }>>;
  getSiteSettings(): Promise<PublicSiteSettings>;
};

export type PublicSiteSettings = {
  description: string;
  name: string;
  navigation: Array<{ href: string; label: string }>;
  nickname: string;
  seoDescription: string;
  seoTitle: string;
  socialLinks: Array<{ href: string; label: string }>;
  title: string;
};

type CmsWorkRow = {
  slug: string;
  title: string;
  summary: string;
  year: string;
  status: Work["status"];
  palette: string[] | null;
  is_representative: boolean;
  representative_order: number | null;
  is_composite: boolean;
  composite_order: number | null;
  sort_order: number;
  work_categories?: Array<{
    categories?: { name: string } | Array<{ name: string }> | null;
  }>;
  work_tags?: Array<{
    tags?: { name: string } | Array<{ name: string }> | null;
  }>;
  work_blocks?: Array<{
    block_type: string;
    is_visible?: boolean;
    sort_order: number;
    payload: Record<string, unknown>;
  }>;
};

export function createCmsRepository(source: CmsReadSource | null) {
  return {
    async listPublishedWorks() {
      if (source) {
        try {
          return await source.listPublishedWorks();
        } catch {
          return getPublishedWorks();
        }
      }
      return getPublishedWorks();
    },
    async listFeaturedWorks() {
      const works = await this.listPublishedWorks();
      return works
        .filter((work) => typeof work.featuredPriority === "number")
        .sort((a, b) => (b.featuredPriority ?? 0) - (a.featuredPriority ?? 0));
    },
    async listCompositeWorks() {
      const works = await this.listPublishedWorks();
      return works
        .filter((work) => work.category === "复合设计" || work.category === "澶嶅悎璁捐")
        .sort((a, b) => b.priority - a.priority);
    },
    async getWorkBySlug(slug: string) {
      const works = await this.listPublishedWorks();
      return works.find((work) => work.slug === slug) ?? getWorkBySlug(slug);
    },
    async getRelatedWorks(slug: string) {
      const current = await this.getWorkBySlug(slug);

      if (!current) return [];

      const works = await this.listPublishedWorks();
      const related = works
        .filter(
          (work) => work.slug !== slug && work.category === current.category,
        )
        .slice(0, 2);

      return related.length > 0 ? related : getRelatedWorks(slug);
    },
    async listVisibleCategories() {
      if (source) {
        try {
          return await source.listVisibleCategories();
        } catch {
          return getStaticVisibleCategories();
        }
      }
      return getStaticVisibleCategories();
    },
    async getSiteSettings() {
      if (source) {
        try {
          return await source.getSiteSettings();
        } catch {
          return getStaticPublicSiteSettings();
        }
      }
      return getStaticPublicSiteSettings();
    },
  };
}

export async function createServerCmsRepository() {
  if (!isSupabaseConfigured()) {
    return createCmsRepository(null);
  }

  const client = await createSupabaseServerClient();

  return createCmsRepository({
    async listPublishedWorks() {
      const { data, error } = await client
        .from("works")
        .select(
          `
          slug,title,summary,year,status,palette,is_representative,
          representative_order,is_composite,composite_order,sort_order,
          work_categories(categories(name)),
          work_tags(tags(name)),
          work_blocks(block_type,sort_order,is_visible,payload)
        `,
        )
        .eq("status", "published")
        .is("deleted_at", null)
        .order("sort_order", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as CmsWorkRow[]).map(toPublicWork);
    },
    async listVisibleCategories() {
      const { data, error } = await client
        .from("categories")
        .select("name,sort_order")
        .eq("is_visible", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
    async getSiteSettings() {
      const { data, error } = await client.from("site_settings").select("*").single();

      if (error) throw error;

      return data ? toPublicSiteSettings(data as CmsSiteSettingsRow) : getStaticPublicSiteSettings();
    },
  });
}

type CmsSiteSettingsRow = {
  name: string;
  nickname: string;
  seo_title: string;
  seo_description: string;
  social_links: Array<{ label: string; url: string }> | null;
};

function getStaticPublicSiteSettings(): PublicSiteSettings {
  const settings = getStaticSiteSettings();

  return {
    description: settings.description,
    name: settings.name,
    navigation: settings.navigation,
    nickname: settings.logo,
    seoDescription: settings.description,
    seoTitle: `${settings.name} | ${settings.title}`,
    socialLinks: settings.socialLinks,
    title: settings.title,
  };
}

function toPublicSiteSettings(row: CmsSiteSettingsRow): PublicSiteSettings {
  const settings = getStaticSiteSettings();

  return {
    description: row.seo_description || settings.description,
    name: row.name || settings.name,
    navigation: settings.navigation,
    nickname: row.nickname || settings.logo,
    seoDescription: row.seo_description || settings.description,
    seoTitle: row.seo_title || `${settings.name} | ${settings.title}`,
    socialLinks:
      row.social_links?.map((link) => ({
        href: link.url,
        label: link.label,
      })) ?? settings.socialLinks,
    title: row.seo_title || settings.title,
  };
}

function toPublicWork(row: CmsWorkRow): Work {
  const category =
    getJoinedName(row.work_categories?.[0]?.categories) ??
    getStaticVisibleCategories()[0].name;
  const tags =
    row.work_tags
      ?.map((item) => getJoinedName(item.tags))
      .filter((tag): tag is string => Boolean(tag)) ?? [];

  return {
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    category,
    tags,
    tools: [],
    year: row.year,
    status: row.status,
    priority: row.sort_order,
    featuredPriority: row.is_representative
      ? (row.representative_order ?? row.sort_order)
      : undefined,
    palette: row.palette ?? [],
    coverTone: "graphite",
    blocks: toPublicBlocks(row.work_blocks ?? []),
  };
}

function getJoinedName(
  value: { name: string } | Array<{ name: string }> | null | undefined,
) {
  if (Array.isArray(value)) return value[0]?.name;
  return value?.name;
}

function toPublicBlocks(blocks: CmsWorkRow["work_blocks"] = []): Work["blocks"] {
  const mappedBlocks = blocks
    .filter((block) => block.block_type === "text" && block.is_visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((block) => ({
      type: "text" as const,
      heading: String(block.payload.heading ?? "内容"),
      body: String(block.payload.body ?? ""),
    }));

  return mappedBlocks.length > 0 ? mappedBlocks : [];
}

export const staticPortfolioCollections = {
  getFeaturedWorks,
  getCompositeWorks,
};
