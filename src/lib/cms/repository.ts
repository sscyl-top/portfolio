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
import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { isPrivatePreviewTokenValid } from "@/lib/cms/private-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type CmsReadSource = {
  listPublishedWorks(): Promise<Work[]>;
  listFeaturedWorks(): Promise<Work[]>;
  listCompositeWorks(): Promise<Work[]>;
  listVisibleCategories(): Promise<Array<{ name: string; sort_order: number }>>;
  getSiteSettings(): Promise<PublicSiteSettings>;
};

export type PublicSiteSettings = {
  description: string;
  logoMediaUrl?: string;
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
  private_token_hash?: string | null;
  cover_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  hover_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  share_media?: CmsMediaRow | Array<CmsMediaRow> | null;
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

const publicWorkSelect = `
  slug,title,summary,year,status,palette,is_representative,
  representative_order,is_composite,composite_order,sort_order,
  cover_media:media_assets!works_cover_media_id_fkey(storage_key,mime_type,alt_text),
  hover_media:media_assets!works_hover_media_id_fkey(storage_key,mime_type,alt_text),
  share_media:media_assets!works_share_media_id_fkey(storage_key,mime_type,alt_text),
  work_categories(categories(name)),
  work_tags(tags(name)),
  work_blocks(block_type,sort_order,is_visible,payload)
`;

type CmsMediaRow = {
  alt_text: string;
  mime_type: string;
  storage_key: string;
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
    async listFeaturedWorks(): Promise<Work[]> {
      if (source) {
        try {
          return await source.listFeaturedWorks();
        } catch {
          // fall through
        }
      }
      const works = await this.listPublishedWorks();
      return works
        .filter((work) => typeof work.featuredPriority === "number")
        .sort((a, b) => (b.featuredPriority ?? 0) - (a.featuredPriority ?? 0));
    },
    async listCompositeWorks(): Promise<Work[]> {
      if (source) {
        try {
          return await source.listCompositeWorks();
        } catch {
          // fall through
        }
      }
      const works = await this.listPublishedWorks();
      return works
        .filter((work) => work.category === "复合设计" || work.category === "澶嶅悎璁捐")
        .sort((a, b) => b.priority - a.priority);
    },
    async getWorkBySlug(slug: string) {
      const works = await this.listPublishedWorks();
      return works.find((work) => work.slug === slug) ?? getWorkBySlug(slug);
    },
    async getRelatedWorks(slug: string): Promise<Work[]> {
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
    async listVisibleCategories(): Promise<Array<{ name: string; sort_order: number }>> {
      if (source) {
        try {
          return await source.listVisibleCategories();
        } catch {
          return getStaticVisibleCategories();
        }
      }
      return getStaticVisibleCategories();
    },
    async getSiteSettings(): Promise<PublicSiteSettings> {
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
        .select(publicWorkSelect)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("sort_order", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as CmsWorkRow[]).map(toPublicWork);
    },
    async listVisibleCategories(): Promise<Array<{ name: string; sort_order: number }>> {
      const { data, error } = await client
        .from("categories")
        .select("name,sort_order")
        .eq("is_visible", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
    async listFeaturedWorks(): Promise<Work[]> {
      const { data, error } = await client
        .from("works")
        .select(publicWorkSelect)
        .eq("status", "published")
        .eq("is_representative", true)
        .is("deleted_at", null)
        .order("representative_order", { ascending: false, nullsFirst: false })
        .order("sort_order", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as CmsWorkRow[]).map(toPublicWork);
    },
    async listCompositeWorks(): Promise<Work[]> {
      const { data, error } = await client
        .from("works")
        .select(publicWorkSelect)
        .eq("status", "published")
        .eq("is_composite", true)
        .is("deleted_at", null)
        .order("composite_order", { ascending: false, nullsFirst: false })
        .order("sort_order", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as CmsWorkRow[]).map(toPublicWork);
    },
    async getSiteSettings() {
      const { data, error } = await client
        .from("site_settings")
        .select("*,logo_media:media_assets!site_settings_logo_media_id_fkey(storage_key,mime_type,alt_text)")
        .single();

      if (error) throw error;

      return data ? toPublicSiteSettings(data as CmsSiteSettingsRow) : getStaticPublicSiteSettings();
    },
  });
}

export async function getPrivatePreviewWorkBySlug(slug: string, token: string) {
  if (!isSupabaseConfigured()) return null;

  const client = createSupabaseServiceClient();
  const { data, error } = await client
    .from("works")
    .select(`private_token_hash,${publicWorkSelect}`)
    .eq("slug", slug)
    .eq("status", "private")
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const row = data as unknown as CmsWorkRow;
  if (!isPrivatePreviewTokenValid(token, row.private_token_hash ?? null)) {
    return null;
  }

  return toPublicWork(row);
}

type CmsSiteSettingsRow = {
  name: string;
  nickname: string;
  seo_title: string;
  seo_description: string;
  logo_media_id?: string | null;
  logo_media?: CmsMediaRow | Array<CmsMediaRow> | null;
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

function toPublicLogoMedia(value: CmsSiteSettingsRow["logo_media"]): string | undefined {
  const { url } = getSupabasePublicConfig();
  const media = Array.isArray(value) ? value[0] : value;
  if (!media?.storage_key) return undefined;

  return `${url}/storage/v1/object/public/portfolio-media/${encodeURI(media.storage_key)}`;
}

function toPublicSiteSettings(row: CmsSiteSettingsRow): PublicSiteSettings {
  const settings = getStaticSiteSettings();

  return {
    description: row.seo_description || settings.description,
    logoMediaUrl: toPublicLogoMedia(row.logo_media),
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
    coverMedia: toPublicMedia(row.cover_media),
    hoverMedia: toPublicMedia(row.hover_media),
    shareMedia: toPublicMedia(row.share_media),
    blocks: toPublicBlocks(row.work_blocks ?? []),
  };
}

function getJoinedName(
  value: { name: string } | Array<{ name: string }> | null | undefined,
) {
  if (Array.isArray(value)) return value[0]?.name;
  return value?.name;
}

type MediaRef = {
  id: string;
  storage_key: string;
  mime_type: string;
  alt_text: string;
};

function toRefs(raw: unknown): MediaRef[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return [raw as MediaRef];
  return [];
}

function toPublicBlocks(blocks: CmsWorkRow["work_blocks"] = []): Work["blocks"] {
  const { url } = getSupabasePublicConfig();

  const toMedia = (ref: MediaRef) => ({
    alt: ref.alt_text ?? "",
    mimeType: ref.mime_type ?? "",
    url: `${url}/storage/v1/object/public/portfolio-media/${encodeURI(ref.storage_key)}`,
  });

  const toItems = (refs: MediaRef[]) => refs.map(toMedia);

  return blocks
    .filter((block) => block.is_visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((block) => {
      if (block.block_type === "text") {
        return {
          type: "text" as const,
          heading: String(block.payload.heading ?? "内容"),
          body: String(block.payload.body ?? ""),
        };
      }
      if (block.block_type === "media" || block.block_type === "gallery") {
        const refs = toRefs(block.payload.media_refs ?? block.payload.media_ref);
        const items = toItems(refs);
        const caption = String(block.payload.caption ?? "");

        return {
          type: block.block_type as "media" | "gallery",
          caption: caption || undefined,
          items,
        };
      }
      if (block.block_type === "video") {
        const ref = block.payload.media_ref as MediaRef | null;
        const items = ref ? [toMedia(ref)] : [];
        const caption = String(block.payload.caption ?? "");

        return { type: "video" as const, caption: caption || undefined, items };
      }
      if (block.block_type === "pdf") {
        const ref = block.payload.media_ref as MediaRef | null;
        const items = ref ? [toMedia(ref)] : [];
        const caption = String(block.payload.caption ?? "");

        return { type: "pdf" as const, caption: caption || undefined, items };
      }
      if (block.block_type === "before_after") {
        const beforeRef = block.payload.before_media_ref as MediaRef | null;
        const afterRef = block.payload.after_media_ref as MediaRef | null;
        const caption = String(block.payload.caption ?? "");

        return {
          type: "beforeAfter" as const,
          heading: caption || "Before / After",
          beforeLabel: beforeRef ? (beforeRef.alt_text || "Before") : "Before",
          afterLabel: afterRef ? (afterRef.alt_text || "After") : "After",
          note: caption || "",
          beforeMedia: beforeRef ? toMedia(beforeRef) : undefined,
          afterMedia: afterRef ? toMedia(afterRef) : undefined,
        };
      }
      return null;
    })
    .filter((block): block is NonNullable<typeof block> => block !== null);
}

function toPublicMedia(value: CmsWorkRow["cover_media"]): Work["coverMedia"] {
  const media = Array.isArray(value) ? value[0] : value;
  if (!media?.storage_key) return undefined;

  const { url } = getSupabasePublicConfig();
  const encodedKey = media.storage_key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return {
    alt: media.alt_text,
    mimeType: media.mime_type,
    url: `${url}/storage/v1/object/public/portfolio-media/${encodedKey}`,
  };
}

export const staticPortfolioCollections = {
  getFeaturedWorks,
  getCompositeWorks,
};
