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
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { isPrivatePreviewTokenValid } from "@/lib/cms/private-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildOptimizedMediaUrl, buildPublicMediaUrl } from "@/lib/cms/media-url";
import { runHeroVideosMigration } from "@/lib/cms/migrations";

export type CmsReadSource = {
  listPublishedWorks(): Promise<Work[]>;
  listFeaturedWorks(): Promise<Work[]>;
  listCompositeWorks(): Promise<Work[]>;
  listVisibleCategories(): Promise<Array<{ name: string; sort_order: number }>>;
  getSiteSettings(): Promise<PublicSiteSettings>;
};

export type PublicSiteSettings = {
  avatarMediaUrl?: string;
  ctaCardMediaUrl?: string;
  ctaFigureMediaUrl?: string;
  ctaTickerLogoMediaUrl?: string;
  ctaTickerLogoMediaUrls: string[];
  ctaCardScale: number;
  ctaCardOffsetX: number;
  ctaCardOffsetY: number;
  ctaFigureScale: number;
  ctaFigureOffsetX: number;
  ctaFigureOffsetY: number;
  description: string;
  heroMainVideoUrl?: string;
  heroSide1VideoUrl?: string;
  heroSide2VideoUrl?: string;
  heroSide3VideoUrl?: string;
  logoMediaUrl?: string;
  name: string;
  navigation: Array<{ href: string; label: string }>;
  nickname: string;
  seoDescription: string;
  seoTitle: string;
  shareMediaUrl?: string;
  socialLinks: Array<{ href: string; label: string }>;
  title: string;
};

const SETTINGS_TEXT_KEYS = [
  "cta_card_scale",
  "cta_card_offset_x",
  "cta_card_offset_y",
  "cta_figure_scale",
  "cta_figure_offset_x",
  "cta_figure_offset_y",
  "cta_ticker_logo_media_ids",
] as const;

const CTA_TRANSFORM_DEFAULTS: Record<string, number> = {
  cta_card_scale: 1.0,
  cta_card_offset_x: 0,
  cta_card_offset_y: 0,
  cta_figure_scale: 1.0,
  cta_figure_offset_x: 0,
  cta_figure_offset_y: 0,
};

async function safeQuerySiteSettings(client: ReturnType<typeof createSupabaseServiceClient>) {
  await runHeroVideosMigration().catch(() => {});

  await new Promise(resolve => setTimeout(resolve, 500));

  const baseColumns = "name,nickname,default_theme,font_preset,seo_title,seo_description,social_links,logo_media_id,avatar_media_id,share_media_id,cta_card_media_id,cta_figure_media_id,cta_ticker_logo_media_id";

  let baseData: Record<string, unknown> | null = null;
  try {
    const { data, error } = await client.from("site_settings").select(baseColumns).single();
    if (error) {
      console.error("[getSiteSettings] 基础查询失败:", error);
      return null;
    }
    baseData = data as Record<string, unknown>;
  } catch (err) {
    console.error("[getSiteSettings] 基础查询异常:", err);
    return null;
  }

  if (!baseData) return null;

  let heroIds = {
    hero_main_video_media_id: null as string | null,
    hero_side1_video_media_id: null as string | null,
    hero_side2_video_media_id: null as string | null,
    hero_side3_video_media_id: null as string | null,
  };
  try {
    const { data, error } = await client
      .from("site_settings")
      .select("hero_main_video_media_id,hero_side1_video_media_id,hero_side2_video_media_id,hero_side3_video_media_id")
      .single();
    if (!error && data) {
      heroIds = {
        hero_main_video_media_id: data.hero_main_video_media_id ?? null,
        hero_side1_video_media_id: data.hero_side1_video_media_id ?? null,
        hero_side2_video_media_id: data.hero_side2_video_media_id ?? null,
        hero_side3_video_media_id: data.hero_side3_video_media_id ?? null,
      };
    }
  } catch {
    // columns may not exist
  }

  const ctaTransform: {
    cta_card_scale: number;
    cta_card_offset_x: number;
    cta_card_offset_y: number;
    cta_figure_scale: number;
    cta_figure_offset_x: number;
    cta_figure_offset_y: number;
  } = {
    cta_card_scale: 1.0,
    cta_card_offset_x: 0,
    cta_card_offset_y: 0,
    cta_figure_scale: 1.0,
    cta_figure_offset_x: 0,
    cta_figure_offset_y: 0,
  };
  let tickerLogoIdsRaw = "";
  try {
    const { data: textData, error: textError } = await client
      .from("text_content")
      .select("key,content")
      .in("key", SETTINGS_TEXT_KEYS as unknown as string[])
      .eq("is_active", true)
      .is("deleted_at", null);
    if (!textError && textData) {
      for (const item of textData) {
        if (item.key === "cta_ticker_logo_media_ids") {
          tickerLogoIdsRaw = item.content ?? "";
        } else {
          const num = Number(item.content);
          if (!isNaN(num) && item.key in ctaTransform) {
            (ctaTransform as Record<string, number>)[item.key] = num;
          }
        }
      }
    }
  } catch {
    // text_content query failed, use defaults
  }

  const allIds = {
    ...baseData,
    ...heroIds,
  } as Record<string, unknown>;

  return { allIds, ctaTransform, tickerLogoIdsRaw };
}

function buildSiteSettingsFromRow(
  allIds: Record<string, unknown>,
  ctaTransform: {
    cta_card_scale: number;
    cta_card_offset_x: number;
    cta_card_offset_y: number;
    cta_figure_scale: number;
    cta_figure_offset_x: number;
    cta_figure_offset_y: number;
  },
  tickerLogoIdsRaw: string,
  mediaMap: Map<string, { storage_key: string }>,
): PublicSiteSettings {
  const getUrlForId = (id: string | null | undefined): string | undefined => {
    if (!id) return undefined;
    const media = mediaMap.get(id);
    if (!media?.storage_key) return undefined;
    return buildPublicMediaUrl(media.storage_key);
  };

  const tickerLogoIds = tickerLogoIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (tickerLogoIds.length === 0 && allIds.cta_ticker_logo_media_id) {
    tickerLogoIds.push(allIds.cta_ticker_logo_media_id as string);
  }

  const tickerLogoUrls = tickerLogoIds
    .map((id) => getUrlForId(id))
    .filter((url): url is string => !!url);

  const settings = getStaticSiteSettings();
  return {
    avatarMediaUrl: getUrlForId(allIds.avatar_media_id as string | null),
    ctaCardMediaUrl: getUrlForId(allIds.cta_card_media_id as string | null),
    ctaFigureMediaUrl: getUrlForId(allIds.cta_figure_media_id as string | null),
    ctaTickerLogoMediaUrl: getUrlForId(allIds.cta_ticker_logo_media_id as string | null),
    ctaTickerLogoMediaUrls: tickerLogoUrls,
    ctaCardScale: ctaTransform.cta_card_scale,
    ctaCardOffsetX: ctaTransform.cta_card_offset_x,
    ctaCardOffsetY: ctaTransform.cta_card_offset_y,
    ctaFigureScale: ctaTransform.cta_figure_scale,
    ctaFigureOffsetX: ctaTransform.cta_figure_offset_x,
    ctaFigureOffsetY: ctaTransform.cta_figure_offset_y,
    description: (allIds.seo_description as string) || settings.description,
    heroMainVideoUrl: getUrlForId(allIds.hero_main_video_media_id as string | null),
    heroSide1VideoUrl: getUrlForId(allIds.hero_side1_video_media_id as string | null),
    heroSide2VideoUrl: getUrlForId(allIds.hero_side2_video_media_id as string | null),
    heroSide3VideoUrl: getUrlForId(allIds.hero_side3_video_media_id as string | null),
    logoMediaUrl: getUrlForId(allIds.logo_media_id as string | null),
    name: (allIds.name as string) || settings.name,
    navigation: settings.navigation,
    nickname: (allIds.nickname as string) || settings.logo,
    seoDescription: (allIds.seo_description as string) || settings.description,
    seoTitle: (allIds.seo_title as string) || settings.name,
    shareMediaUrl: getUrlForId(allIds.share_media_id as string | null),
    socialLinks: Array.isArray(allIds.social_links) && (allIds.social_links as unknown[]).length > 0
      ? (allIds.social_links as Array<{ label: string; url: string }>).map((link) => ({
          href: link.url,
          label: normalizeUtf8(link.label),
        }))
      : settings.socialLinks,
    title: settings.title,
  };
}

function createSupabaseBackedRepository(client: ReturnType<typeof createSupabaseServiceClient>) {
  return createCmsRepository({
    async listPublishedWorks() {
      const { data, error } = await client
        .from("works")
        .select(publicWorkSelect)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("sort_order", { ascending: false });

      if (error) throw error;

      return safeMapWorks(((data ?? []) as unknown as CmsWorkRow[]), "listPublishedWorks");
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

      return safeMapWorks(((data ?? []) as unknown as CmsWorkRow[]), "listFeaturedWorks");
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

      return safeMapWorks(((data ?? []) as unknown as CmsWorkRow[]), "listCompositeWorks");
    },
    async getSiteSettings() {
      const result = await safeQuerySiteSettings(client);
      if (!result) {
        return getStaticPublicSiteSettings();
      }

      const { allIds, ctaTransform, tickerLogoIdsRaw } = result;

      const mediaIdFields = [
        "logo_media_id",
        "avatar_media_id",
        "share_media_id",
        "cta_card_media_id",
        "cta_figure_media_id",
        "cta_ticker_logo_media_id",
        "hero_main_video_media_id",
        "hero_side1_video_media_id",
        "hero_side2_video_media_id",
        "hero_side3_video_media_id",
      ] as const;

      const tickerLogoIds = tickerLogoIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (tickerLogoIds.length === 0 && allIds.cta_ticker_logo_media_id) {
        tickerLogoIds.push(allIds.cta_ticker_logo_media_id as string);
      }

      const singleMediaIdsToFetch = mediaIdFields
        .map((field) => allIds[field] as string | null)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      const mediaIdsToFetch = Array.from(new Set([...singleMediaIdsToFetch, ...tickerLogoIds]));

      const mediaMap = new Map<string, { storage_key: string }>();
      if (mediaIdsToFetch.length > 0) {
        const { data: mediaList } = await client
          .from("media_assets")
          .select("id,storage_key")
          .is("deleted_at", null)
          .in("id", mediaIdsToFetch);

        if (mediaList) {
          for (const m of mediaList) {
            mediaMap.set(m.id, { storage_key: m.storage_key });
          }
        }
      }

      return buildSiteSettingsFromRow(allIds, ctaTransform, tickerLogoIdsRaw, mediaMap);
    },
  });
}

export function createPublicCmsRepository() {
  if (!isSupabaseConfigured()) {
    return createCmsRepository(null);
  }
  return createSupabaseBackedRepository(createSupabaseServiceClient());
}

type CmsWorkRow = {
  slug: string;
  title: string;
  subtitle: string;
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
  slug,title,subtitle,summary,year,status,palette,is_representative,
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
        } catch (error) {
          console.error("[listPublishedWorks] 查询失败，回退到静态数据:", error);
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
        .filter((work) => normalizeUtf8(work.category) === "复合设计")
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

  const client = createSupabaseServiceClient();

  return createCmsRepository({
    async listPublishedWorks() {
      const { data, error } = await client
        .from("works")
        .select(publicWorkSelect)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("sort_order", { ascending: false });

      if (error) throw error;

      return safeMapWorks(((data ?? []) as unknown as CmsWorkRow[]), "server:listPublishedWorks");
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

      return safeMapWorks(((data ?? []) as unknown as CmsWorkRow[]), "server:listFeaturedWorks");
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

      return safeMapWorks(((data ?? []) as unknown as CmsWorkRow[]), "server:listCompositeWorks");
    },
    async getSiteSettings() {
      const result = await safeQuerySiteSettings(client);
      if (!result) {
        return getStaticPublicSiteSettings();
      }

      const { allIds, ctaTransform, tickerLogoIdsRaw } = result;

      const mediaIdFields = [
        "logo_media_id",
        "avatar_media_id",
        "share_media_id",
        "cta_card_media_id",
        "cta_figure_media_id",
        "cta_ticker_logo_media_id",
        "hero_main_video_media_id",
        "hero_side1_video_media_id",
        "hero_side2_video_media_id",
        "hero_side3_video_media_id",
      ] as const;

      const tickerLogoIds = tickerLogoIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (tickerLogoIds.length === 0 && allIds.cta_ticker_logo_media_id) {
        tickerLogoIds.push(allIds.cta_ticker_logo_media_id as string);
      }

      const singleMediaIdsToFetch = mediaIdFields
        .map((field) => allIds[field] as string | null)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      const mediaIdsToFetch = Array.from(new Set([...singleMediaIdsToFetch, ...tickerLogoIds]));

      const mediaMap = new Map<string, { storage_key: string }>();
      if (mediaIdsToFetch.length > 0) {
        const { data: mediaList } = await client
          .from("media_assets")
          .select("id,storage_key")
          .is("deleted_at", null)
          .in("id", mediaIdsToFetch);

        if (mediaList) {
          for (const m of mediaList) {
            mediaMap.set(m.id, { storage_key: m.storage_key });
          }
        }
      }

      return buildSiteSettingsFromRow(allIds, ctaTransform, tickerLogoIdsRaw, mediaMap);
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
  avatar_media_id?: string | null;
  avatar_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  logo_media_id?: string | null;
  logo_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  share_media_id?: string | null;
  share_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  cta_card_media_id?: string | null;
  cta_card_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  cta_figure_media_id?: string | null;
  cta_figure_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  cta_ticker_logo_media_id?: string | null;
  cta_ticker_logo_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  hero_main_video_media_id?: string | null;
  hero_main_video_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  hero_side1_video_media_id?: string | null;
  hero_side1_video_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  hero_side2_video_media_id?: string | null;
  hero_side2_video_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  hero_side3_video_media_id?: string | null;
  hero_side3_video_media?: CmsMediaRow | Array<CmsMediaRow> | null;
  social_links: Array<{ label: string; url: string }> | null;
};

function getStaticPublicSiteSettings(): PublicSiteSettings {
  const settings = getStaticSiteSettings();

  return {
    ctaCardScale: 1,
    ctaCardOffsetX: 0,
    ctaCardOffsetY: 0,
    ctaFigureScale: 1,
    ctaFigureOffsetX: 0,
    ctaFigureOffsetY: 0,
    ctaTickerLogoMediaUrls: [],
    description: settings.description,
    name: settings.name,
    navigation: settings.navigation,
    nickname: settings.logo,
    seoDescription: settings.description,
    seoTitle: settings.name,
    socialLinks: settings.socialLinks,
    title: settings.title,
  };
}

function toPublicMediaUrl(
  value: CmsMediaRow | Array<CmsMediaRow> | null | undefined,
): string | undefined {
  const media = Array.isArray(value) ? value[0] : value;
  if (!media?.storage_key) return undefined;

  return buildPublicMediaUrl(media.storage_key);
}

function toPublicSiteSettings(row: CmsSiteSettingsRow): PublicSiteSettings {
  const settings = getStaticSiteSettings();
  const singleTickerUrl = toPublicMediaUrl(row.cta_ticker_logo_media);

  return {
    avatarMediaUrl: toPublicMediaUrl(row.avatar_media),
    ctaCardMediaUrl: toPublicMediaUrl(row.cta_card_media),
    ctaFigureMediaUrl: toPublicMediaUrl(row.cta_figure_media),
    ctaTickerLogoMediaUrl: singleTickerUrl,
    ctaTickerLogoMediaUrls: singleTickerUrl ? [singleTickerUrl] : [],
    ctaCardScale: 1,
    ctaCardOffsetX: 0,
    ctaCardOffsetY: 0,
    ctaFigureScale: 1,
    ctaFigureOffsetX: 0,
    ctaFigureOffsetY: 0,
    description: normalizeUtf8(row.seo_description) || settings.description,
    heroMainVideoUrl: toPublicMediaUrl(row.hero_main_video_media),
    heroSide1VideoUrl: toPublicMediaUrl(row.hero_side1_video_media),
    heroSide2VideoUrl: toPublicMediaUrl(row.hero_side2_video_media),
    heroSide3VideoUrl: toPublicMediaUrl(row.hero_side3_video_media),
    logoMediaUrl: toPublicMediaUrl(row.logo_media),
    name: normalizeUtf8(row.name) || settings.name,
    navigation: settings.navigation,
    nickname: normalizeUtf8(row.nickname) || settings.logo,
    seoDescription: normalizeUtf8(row.seo_description) || settings.description,
    seoTitle: normalizeUtf8(row.seo_title) || settings.name,
    shareMediaUrl: toPublicMediaUrl(row.share_media),
    socialLinks:
      row.social_links?.map((link) => ({
        href: link.url,
        label: normalizeUtf8(link.label),
      })) ?? settings.socialLinks,
    title: settings.title,
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
    title: normalizeUtf8(row.title),
    subtitle: normalizeUtf8(row.subtitle ?? ""),
    slug: row.slug,
    summary: normalizeUtf8(row.summary ?? ""),
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

function safeMapWorks(rows: CmsWorkRow[], context: string): Work[] {
  const works: Work[] = [];
  for (const row of rows) {
    try {
      works.push(toPublicWork(row));
    } catch (err) {
      console.error(`[safeMapWorks] 作品转换失败 (${context}), slug=${row.slug}, title=${row.title}:`, err);
    }
  }
  return works;
}

function getJoinedName(
  value: { name: string } | Array<{ name: string }> | null | undefined,
) {
  if (Array.isArray(value)) return normalizeUtf8(value[0]?.name ?? "");
  return normalizeUtf8(value?.name ?? "");
}

/** 修复 UTF-8 字节被错误解码为 Latin-1 导致的中文乱码 */
function normalizeUtf8(text: string): string {
  if (!text) return text;
  // 已包含中文字符 → 无需修复
  if (/[\u4e00-\u9fff]/.test(text)) return text;
  try {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i) & 0xff;
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return /[\u4e00-\u9fff]/.test(decoded) ? decoded : text;
  } catch {
    return text;
  }
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
  const toMedia = (ref: MediaRef) => ({
    alt: ref.alt_text ?? "",
    mimeType: ref.mime_type ?? "",
    url: buildMediaUrl(ref.storage_key, ref.mime_type),
    storage_key: ref.storage_key,
  });

  const toItems = (refs: MediaRef[]) => refs.map(toMedia);

  return blocks
    .filter((block) => block.is_visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((block) => {
      // 读取 layout 字段（来自 payload.layout）
      const rawLayout = (block.payload.layout ?? {}) as Record<string, unknown>;
      const rawFree = rawLayout.free as Record<string, unknown> | undefined;
      const free =
        rawFree &&
        typeof rawFree.x === "number" &&
        typeof rawFree.y === "number" &&
        typeof rawFree.w === "number" &&
        typeof rawFree.h === "number"
          ? { x: rawFree.x, y: rawFree.y, w: rawFree.w, h: rawFree.h }
          : undefined;
      const layout =
        rawLayout && typeof rawLayout === "object"
          ? {
              width:  (rawLayout.width  as "full" | "contained" | "narrow" | "free") ?? undefined,
              align:  (rawLayout.align  as "left" | "center")          ?? undefined,
              columns: (rawLayout.columns as 1 | 2 | 3 | 4)           ?? undefined,
              free,
            }
          : undefined;

      if (block.block_type === "text") {
        return {
          type: "text" as const,
          heading: String(block.payload.heading ?? "内容"),
          body: String(block.payload.body ?? ""),
          layout: layout ?? undefined,
        };
      }
      if (block.block_type === "media" || block.block_type === "gallery") {
        const refs = toRefs(block.payload.media_refs ?? block.payload.media_ref);
        const items = toItems(refs);
        const caption = String(block.payload.caption ?? "");
        const rawFocal = block.payload.focal_point as { x?: number; y?: number } | undefined;
        const focalPoint =
          rawFocal && typeof rawFocal.x === "number" && typeof rawFocal.y === "number"
            ? { x: rawFocal.x, y: rawFocal.y }
            : undefined;

        return {
          type: block.block_type as "media" | "gallery",
          caption: caption || undefined,
          items,
          layout: layout ?? undefined,
          ...(block.block_type === "media" && focalPoint ? { focalPoint } : {}),
        };
      }
      if (block.block_type === "video") {
        const ref = block.payload.media_ref as MediaRef | null;
        const items = ref ? [toMedia(ref)] : [];
        const caption = String(block.payload.caption ?? "");
        const rawFocal = block.payload.focal_point as { x?: number; y?: number } | undefined;
        const focalPoint =
          rawFocal && typeof rawFocal.x === "number" && typeof rawFocal.y === "number"
            ? { x: rawFocal.x, y: rawFocal.y }
            : undefined;

        return { type: "video" as const, caption: caption || undefined, items, layout: layout ?? undefined, focalPoint };
      }
      if (block.block_type === "pdf") {
        const ref = block.payload.media_ref as MediaRef | null;
        const items = ref ? [toMedia(ref)] : [];
        const caption = String(block.payload.caption ?? "");

        return { type: "pdf" as const, caption: caption || undefined, items, layout: layout ?? undefined };
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
          layout: layout ?? undefined,
        };
      }
      return null;
    })
    .filter((block): block is NonNullable<typeof block> => block !== null);
}

function buildMediaUrl(storageKey: string, mimeType?: string): string {
  // 图片直接返回原始 COS/Supabase URL，由 Next.js Image 组件在 Vercel 边缘节点做优化（缩放、格式转换、压缩）
  // 不再使用 COS imageMogr2 做双重处理，避免产生不必要的 COS 回源流量
  return buildPublicMediaUrl(storageKey);
}

function toPublicMedia(value: CmsWorkRow["cover_media"]): Work["coverMedia"] {
  const media = Array.isArray(value) ? value[0] : value;
  if (!media?.storage_key) return undefined;

  return {
    alt: media.alt_text,
    mimeType: media.mime_type,
    url: buildMediaUrl(media.storage_key, media.mime_type),
  };
}

export const staticPortfolioCollections = {
  getFeaturedWorks,
  getCompositeWorks,
};
