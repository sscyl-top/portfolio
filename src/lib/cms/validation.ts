import { z } from "zod";

const nullableUuid = z.uuid().nullable();

export const workStatusSchema = z.enum(["draft", "published", "private"]);

export const workRecordSchema = z.object({
  id: z.uuid(),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  subtitle: z.string(),
  summary: z.string(),
  year: z.string(),
  client: z.string(),
  status: workStatusSchema,
  palette: z.array(z.string()),
  is_representative: z.boolean(),
  representative_order: z.number().int().nullable(),
  is_composite: z.boolean(),
  composite_order: z.number().int().nullable(),
  sort_order: z.number().int(),
  seo_title: z.string(),
  seo_description: z.string(),
  published_at: z.iso.datetime().nullable(),
});

export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
});

export const tagSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

export const mediaAssetSchema = z.object({
  id: z.uuid(),
  storage_key: z.string().min(1),
  mime_type: z.string().min(1),
  original_name: z.string().min(1),
  byte_size: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  duration_ms: z.number().int().nonnegative().nullable(),
  alt_text: z.string(),
  storage_backend: z.string().optional(),
  content_hash: z.string().nullable().optional(),
  thumb_storage_key: z.string().nullable().optional(),
  large_storage_key: z.string().nullable().optional(),
});

export const workBlockSchema = z.object({
  id: z.uuid(),
  work_id: z.uuid(),
  block_type: z.enum([
    "text",
    "media",
    "gallery",
    "video",
    "pdf",
    "before_after",
    "code",
    "quote",
    "embed",
    "divider",
    "callout",
    "stats",
  ]),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
  payload: z.record(z.string(), z.unknown()),
});

export const pageModuleSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
});

export const pageSchema = z.object({
  id: z.uuid(),
  slug: z.enum(["home", "works", "resume"]),
  title: z.string().min(1),
  modules: z.array(pageModuleSchema),
  seo_title: z.string(),
  seo_description: z.string(),
});

export const siteSettingsSchema = z.object({
  id: z.literal(true),
  name: z.string(),
  nickname: z.string(),
  default_theme: z.enum(["dark", "light", "system"]),
  font_preset: z.string().min(1),
  seo_title: z.string(),
  seo_description: z.string(),
  social_links: z.array(
    z.object({
      label: z.string().min(1),
      url: z.url(),
    }),
  ),
  logo_media_id: nullableUuid,
  avatar_media_id: nullableUuid,
  share_media_id: nullableUuid,
});

export type CmsWorkStatus = z.infer<typeof workStatusSchema>;
export type CmsWorkRecord = z.infer<typeof workRecordSchema>;
export type CmsCategory = z.infer<typeof categorySchema>;
export type CmsTag = z.infer<typeof tagSchema>;
export type CmsMediaAsset = z.infer<typeof mediaAssetSchema>;
export type CmsWorkBlock = z.infer<typeof workBlockSchema>;
export type CmsPage = z.infer<typeof pageSchema>;
export type CmsSiteSettings = z.infer<typeof siteSettingsSchema>;
