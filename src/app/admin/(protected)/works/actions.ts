"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";
import { createStableSlug } from "@/lib/cms/admin-model";
import {
  createPrivatePreviewToken,
  hashPrivatePreviewToken,
} from "@/lib/cms/private-preview";
import { seedStaticPortfolioData } from "@/lib/cms/seed-static-portfolio";

const draftWorkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  year: z.string().trim().max(20).default(""),
  is_representative: z.coerce.boolean().default(false),
  representative_order: z.coerce.number().int().nullable().default(null),
  is_composite: z.coerce.boolean().default(false),
  composite_order: z.coerce.number().int().nullable().default(null),
});

const paletteColorSchema = z.string().trim().max(7).regex(/^#[0-9a-fA-F]{3,6}$/, "must be hex color (#RGB or #RRGGBB)");

const workUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  subtitle: z.string().trim().max(160),
  summary: z.string().trim().max(1000),
  year: z.string().trim().max(20),
  client: z.string().trim().max(120),
  palette: z.array(paletteColorSchema).default([]),
  status: z.enum(["draft", "published", "private"]),
  sort_order: z.coerce.number().int().default(0),
  is_representative: z.boolean(),
  representative_order: z.coerce.number().int().nullable(),
  is_composite: z.boolean(),
  composite_order: z.coerce.number().int().nullable(),
  seo_title: z.string().trim().max(120),
  seo_description: z.string().trim().max(300),
});

const textBlockSchema = z.object({
  block_id: z.string().uuid().optional(),
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  heading: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(5000),
  sort_order: z.coerce.number().int().default(0),
  is_visible: z.boolean(),
});

const taxonomyUpdateSchema = z.object({
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category_ids: z.array(z.string().uuid()),
  tag_ids: z.array(z.string().uuid()),
});

const nullableMediaId = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable(),
);

const mediaUpdateSchema = z.object({
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  cover_media_id: nullableMediaId,
  hover_media_id: nullableMediaId,
  share_media_id: nullableMediaId,
});

const privateLinkSchema = z.object({
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function createDraftWork(formData: FormData) {
  const parsed = draftWorkSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    year: formData.get("year") ?? "",
    is_representative: formData.get("is_representative") === "true",
    representative_order: formData.get("representative_order") ?? null,
    is_composite: formData.get("is_composite") === "true",
    composite_order: formData.get("composite_order") ?? null,
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client.from("works").insert({
    ...parsed.data,
    status: "draft",
    palette: [],
    sort_order: 0,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
}

export async function generatePrivatePreviewLink(formData: FormData) {
  const parsed = privateLinkSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug } = parsed.data;
  const token = createPrivatePreviewToken();
  const { error } = await client
    .from("works")
    .update({
      private_token_hash: hashPrivatePreviewToken(token),
      status: "private",
    })
    .eq("id", work_id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
  revalidatePath(`/admin/works/${work_id}`);
  redirect(
    `/admin/works/${work_id}?privatePreview=${encodeURIComponent(
      `/works/${work_slug}?preview=${token}`,
    )}`,
  );
}

export async function clearPrivatePreviewLink(formData: FormData) {
  const parsed = privateLinkSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug } = parsed.data;
  const { error } = await client
    .from("works")
    .update({ private_token_hash: null })
    .eq("id", work_id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function updateWorkMedia(formData: FormData) {
  const parsed = mediaUpdateSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    cover_media_id: formData.get("cover_media_id") ?? "",
    hover_media_id: formData.get("hover_media_id") ?? "",
    share_media_id: formData.get("share_media_id") ?? "",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug, ...values } = parsed.data;
  const { error } = await client.from("works").update(values).eq("id", work_id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath("/works");
  revalidatePath(`/works/${work_slug}`);
}

export async function updateWorkTaxonomy(formData: FormData) {
  const parsed = taxonomyUpdateSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    category_ids: formData.getAll("category_ids").map(String),
    tag_ids: formData.getAll("tag_ids").map(String),
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug, category_ids, tag_ids } = parsed.data;
  const [{ error: categoryDeleteError }, { error: tagDeleteError }] =
    await Promise.all([
      client.from("work_categories").delete().eq("work_id", work_id),
      client.from("work_tags").delete().eq("work_id", work_id),
    ]);

  if (categoryDeleteError) throw new Error(categoryDeleteError.message);
  if (tagDeleteError) throw new Error(tagDeleteError.message);

  const categoryRows = category_ids.map((category_id) => ({
    work_id,
    category_id,
  }));
  const tagRows = tag_ids.map((tag_id) => ({ work_id, tag_id }));
  const [{ error: categoryInsertError }, { error: tagInsertError }] =
    await Promise.all([
      categoryRows.length
        ? client.from("work_categories").insert(categoryRows)
        : Promise.resolve({ error: null }),
      tagRows.length
        ? client.from("work_tags").insert(tagRows)
        : Promise.resolve({ error: null }),
    ]);

  if (categoryInsertError) throw new Error(categoryInsertError.message);
  if (tagInsertError) throw new Error(tagInsertError.message);

  revalidatePath("/admin/works");
  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath("/works");
  revalidatePath(`/works/${work_slug}`);
}

export async function updateWork(formData: FormData) {
  const parsed = workUpdateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    subtitle: formData.get("subtitle") ?? "",
    summary: formData.get("summary") ?? "",
    year: formData.get("year") ?? "",
    client: formData.get("client") ?? "",
    palette: String(formData.get("palette") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    status: formData.get("status"),
    sort_order: formData.get("sort_order") || 0,
    is_representative: formData.get("is_representative") === "on",
    representative_order: formData.get("representative_order")
      ? formData.get("representative_order")
      : null,
    is_composite: formData.get("is_composite") === "on",
    composite_order: formData.get("composite_order")
      ? formData.get("composite_order")
      : null,
    seo_title: formData.get("seo_title") ?? "",
    seo_description: formData.get("seo_description") ?? "",
  });

  if (!parsed.success) return;

  const { id, ...values } = parsed.data;
  const published_at =
    values.status === "published" ? new Date().toISOString() : null;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("works")
    .update({ ...values, published_at })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
  revalidatePath(`/admin/works/${id}`);
  revalidatePath(`/works/${values.slug}`);
}

export async function deleteWork(formData: FormData) {
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""));
  if (!id.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("works")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
}

export async function createTextBlock(formData: FormData) {
  const parsed = textBlockSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    heading: formData.get("heading"),
    body: formData.get("body"),
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug, heading, body, sort_order, is_visible } =
    parsed.data;
  const { error } = await client.from("work_blocks").insert({
    work_id,
    block_type: "text",
    sort_order,
    is_visible,
    payload: { heading, body },
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function updateTextBlock(formData: FormData) {
  const parsed = textBlockSchema.safeParse({
    block_id: formData.get("block_id"),
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    heading: formData.get("heading"),
    body: formData.get("body"),
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success || !parsed.data.block_id) return;

  const { client } = await requireAdmin();
  const { block_id, work_id, work_slug, heading, body, sort_order, is_visible } =
    parsed.data;
  const { error } = await client
    .from("work_blocks")
    .update({
      sort_order,
      is_visible,
      payload: { heading, body },
    })
    .eq("id", block_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}


const mediaBlockSchema = z.object({
  block_id: z.string().uuid().optional(),
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  media_id: z.string().uuid(),
  caption: z.string().trim().max(300).default(""),
  sort_order: z.coerce.number().int().default(0),
  is_visible: z.boolean(),
});

const galleryBlockUpdateSchema = z.object({
  block_id: z.string().uuid(),
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  caption: z.string().trim().max(300).default(""),
  sort_order: z.coerce.number().int().default(0),
  is_visible: z.boolean(),
});

const videoBlockSchema = z.object({
  block_id: z.string().uuid().optional(),
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  media_id: z.string().uuid(),
  caption: z.string().trim().max(300).default(""),
  sort_order: z.coerce.number().int().default(0),
  is_visible: z.boolean(),
});

const pdfBlockSchema = z.object({
  block_id: z.string().uuid().optional(),
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  media_id: z.string().uuid(),
  caption: z.string().trim().max(300).default(""),
  sort_order: z.coerce.number().int().default(0),
  is_visible: z.boolean(),
});

const beforeAfterBlockSchema = z.object({
  block_id: z.string().uuid().optional(),
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  before_media_id: z.string().uuid(),
  after_media_id: z.string().uuid(),
  caption: z.string().trim().max(300).default(""),
  sort_order: z.coerce.number().int().default(0),
  is_visible: z.boolean(),
});

export async function createMediaBlock(formData: FormData) {
  const parsed = mediaBlockSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    media_id: formData.get("media_id"),
    caption: formData.get("caption") ?? "",
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug, media_id, caption, sort_order, is_visible } =
    parsed.data;

  const { data: asset } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .eq("id", media_id)
    .is("deleted_at", null)
    .single();

  const media_ref = asset
    ? { id: asset.id, storage_key: asset.storage_key, mime_type: asset.mime_type, alt_text: asset.alt_text }
    : null;

  const { error } = await client.from("work_blocks").insert({
    work_id,
    block_type: "media",
    sort_order,
    is_visible,
    payload: { media_id, caption, media_ref },
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function updateMediaBlock(formData: FormData) {
  const parsed = mediaBlockSchema.safeParse({
    block_id: formData.get("block_id"),
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    media_id: formData.get("media_id"),
    caption: formData.get("caption") ?? "",
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success || !parsed.data.block_id) return;

  const { client } = await requireAdmin();
  const { block_id, work_id, work_slug, media_id, caption, sort_order, is_visible } =
    parsed.data;

  const { data: asset } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .eq("id", media_id)
    .is("deleted_at", null)
    .single();

  const media_ref = asset
    ? { id: asset.id, storage_key: asset.storage_key, mime_type: asset.mime_type, alt_text: asset.alt_text }
    : null;

  const { error } = await client
    .from("work_blocks")
    .update({
      sort_order,
      is_visible,
      payload: { media_id, caption, media_ref },
    })
    .eq("id", block_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function deleteWorkBlock(formData: FormData) {
  const parsed = z
    .object({
      block_id: z.string().uuid(),
      work_id: z.string().uuid(),
      work_slug: z
        .string()
        .trim()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    })
    .safeParse({
      block_id: formData.get("block_id"),
      work_id: formData.get("work_id"),
      work_slug: formData.get("work_slug"),
    });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { block_id, work_id, work_slug } = parsed.data;
  const { error } = await client.from("work_blocks").delete()    .eq("id", block_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function createVideoBlock(formData: FormData) {
  const parsed = videoBlockSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    media_id: formData.get("media_id"),
    caption: formData.get("caption") ?? "",
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug, media_id, caption, sort_order, is_visible } =
    parsed.data;

  const { data: asset } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .eq("id", media_id)
    .is("deleted_at", null)
    .single();

  const media_ref = asset
    ? { id: asset.id, storage_key: asset.storage_key, mime_type: asset.mime_type, alt_text: asset.alt_text }
    : null;

  const { error } = await client.from("work_blocks").insert({
    work_id,
    block_type: "video",
    sort_order,
    is_visible,
    payload: { media_id, caption, media_ref },
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function updateVideoBlock(formData: FormData) {
  const parsed = videoBlockSchema.safeParse({
    block_id: formData.get("block_id"),
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    media_id: formData.get("media_id"),
    caption: formData.get("caption") ?? "",
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success || !parsed.data.block_id) return;

  const { client } = await requireAdmin();
  const { block_id, work_id, work_slug, media_id, caption, sort_order, is_visible } =
    parsed.data;

  const { data: asset } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .eq("id", media_id)
    .is("deleted_at", null)
    .single();

  const media_ref = asset
    ? { id: asset.id, storage_key: asset.storage_key, mime_type: asset.mime_type, alt_text: asset.alt_text }
    : null;

  const { error } = await client
    .from("work_blocks")
    .update({ sort_order, is_visible, payload: { media_id, caption, media_ref } })
    .eq("id", block_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function createPdfBlock(formData: FormData) {
  const parsed = pdfBlockSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    media_id: formData.get("media_id"),
    caption: formData.get("caption") ?? "",
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug, media_id, caption, sort_order, is_visible } =
    parsed.data;

  const { data: asset } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .eq("id", media_id)
    .is("deleted_at", null)
    .single();

  const media_ref = asset
    ? { id: asset.id, storage_key: asset.storage_key, mime_type: asset.mime_type, alt_text: asset.alt_text }
    : null;

  const { error } = await client.from("work_blocks").insert({
    work_id,
    block_type: "pdf",
    sort_order,
    is_visible,
    payload: { media_id, caption, media_ref },
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function updatePdfBlock(formData: FormData) {
  const parsed = pdfBlockSchema.safeParse({
    block_id: formData.get("block_id"),
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    media_id: formData.get("media_id"),
    caption: formData.get("caption") ?? "",
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success || !parsed.data.block_id) return;

  const { client } = await requireAdmin();
  const { block_id, work_id, work_slug, media_id, caption, sort_order, is_visible } =
    parsed.data;

  const { data: asset } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .eq("id", media_id)
    .is("deleted_at", null)
    .single();

  const media_ref = asset
    ? { id: asset.id, storage_key: asset.storage_key, mime_type: asset.mime_type, alt_text: asset.alt_text }
    : null;

  const { error } = await client
    .from("work_blocks")
    .update({ sort_order, is_visible, payload: { media_id, caption, media_ref } })
    .eq("id", block_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function createBeforeAfterBlock(formData: FormData) {
  const parsed = beforeAfterBlockSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    before_media_id: formData.get("before_media_id"),
    after_media_id: formData.get("after_media_id"),
    caption: formData.get("caption") ?? "",
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug, before_media_id, after_media_id, caption, sort_order, is_visible } =
    parsed.data;

  const { data: assets } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .in("id", [before_media_id, after_media_id])
    .is("deleted_at", null);

  const assetById = new Map(
    (assets ?? []).map((a: { id: string; storage_key: string; mime_type: string; alt_text: string }) => [a.id, a]),
  );
  const mediaRef = (id: string) => {
    const a = assetById.get(id);
    return a ? { id: a.id, storage_key: a.storage_key, mime_type: a.mime_type, alt_text: a.alt_text } : null;
  };

  const { error } = await client.from("work_blocks").insert({
    work_id,
    block_type: "before_after",
    sort_order,
    is_visible,
    payload: {
      before_media_id, after_media_id, caption,
      before_media_ref: mediaRef(before_media_id),
      after_media_ref: mediaRef(after_media_id),
    },
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function updateBeforeAfterBlock(formData: FormData) {
  const parsed = beforeAfterBlockSchema.safeParse({
    block_id: formData.get("block_id"),
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    before_media_id: formData.get("before_media_id"),
    after_media_id: formData.get("after_media_id"),
    caption: formData.get("caption") ?? "",
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success || !parsed.data.block_id) return;

  const { client } = await requireAdmin();
  const { block_id, work_id, work_slug, before_media_id, after_media_id, caption, sort_order, is_visible } =
    parsed.data;

  const { data: assets } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .in("id", [before_media_id, after_media_id])
    .is("deleted_at", null);

  const assetById = new Map(
    (assets ?? []).map((a: { id: string; storage_key: string; mime_type: string; alt_text: string }) => [a.id, a]),
  );
  const mediaRef = (id: string) => {
    const a = assetById.get(id);
    return a ? { id: a.id, storage_key: a.storage_key, mime_type: a.mime_type, alt_text: a.alt_text } : null;
  };

  const { error } = await client
    .from("work_blocks")
    .update({
      sort_order,
      is_visible,
      payload: {
        before_media_id, after_media_id, caption,
        before_media_ref: mediaRef(before_media_id),
        after_media_ref: mediaRef(after_media_id),
      },
    })
    .eq("id", block_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function seedStaticPortfolio() {
  const { client, user } = await requireAdmin();
  await seedStaticPortfolioData({ adminUserId: user.id, client });
  revalidatePath("/admin");
  revalidatePath("/admin/works");
  revalidatePath("/admin/categories");
}

export async function suggestSlug(title: string) {
  return createStableSlug(title, "new-work");
}

export async function reorderWorkBlocks(
  workId: string,
  workSlug: string,
  blockIds: string[],
) {
  const { client } = await requireAdmin();

  const updates = blockIds.map((id, index) =>
    client.from("work_blocks").update({ sort_order: index }).eq("id", id).eq("work_id", workId),
  );
  const results = await Promise.all(updates);
  const error = results.find((r) => r.error);
  if (error?.error) throw new Error(error.error.message);

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath(`/works/${workSlug}`);
}


export async function createGalleryBlock(formData: FormData) {
  const rawIds = formData.getAll("media_ids").map(String).filter(Boolean);
  const parsed = z
    .object({
      work_id: z.string().uuid(),
      work_slug: z
        .string()
        .trim()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      caption: z.string().trim().max(300).default(""),
      sort_order: z.coerce.number().int().default(0),
      is_visible: z.boolean(),
    })
    .safeParse({
      work_id: formData.get("work_id"),
      work_slug: formData.get("work_slug"),
      caption: formData.get("caption") ?? "",
      sort_order: formData.get("sort_order") || 0,
      is_visible: formData.get("is_visible") === "on",
    });

  if (!parsed.success || rawIds.length === 0) return;

  const { client } = await requireAdmin();
  const { work_id, work_slug, caption, sort_order, is_visible } =
    parsed.data;

  // Enrich payload with media asset references.
  const { data: rows } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .in("id", rawIds)
    .is("deleted_at", null);
  const refs = (rows ?? []).map(
    (r: { id: string; storage_key: string; mime_type: string; alt_text: string }) => ({
      id: r.id,
      storage_key: r.storage_key,
      mime_type: r.mime_type,
      alt_text: r.alt_text,
    }),
  );

  const { error } = await client.from("work_blocks").insert({
    work_id,
    block_type: "gallery",
    sort_order,
    is_visible,
    payload: { media_ids: rawIds, caption, media_refs: refs },
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

export async function updateGalleryBlock(formData: FormData) {
  const rawIds = formData.getAll("media_ids").map(String).filter(Boolean);
  const parsed = galleryBlockUpdateSchema.safeParse({
    block_id: formData.get("block_id"),
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    caption: formData.get("caption") ?? "",
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success || rawIds.length === 0) return;

  const { client } = await requireAdmin();
  const { block_id, work_id, work_slug, caption, sort_order, is_visible } =
    parsed.data;

  const { data: rows } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .in("id", rawIds)
    .is("deleted_at", null);
  const refs = (rows ?? []).map(
    (r: { id: string; storage_key: string; mime_type: string; alt_text: string }) => ({
      id: r.id,
      storage_key: r.storage_key,
      mime_type: r.mime_type,
      alt_text: r.alt_text,
    }),
  );

  const { error } = await client
    .from("work_blocks")
    .update({
      sort_order,
      is_visible,
      payload: { media_ids: rawIds, caption, media_refs: refs },
    })
    .eq("id", block_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}
// ── Client-callable Server Actions for VisualBlockEditor ──

export async function createBlockDirect(
  workId: string,
  workSlug: string,
  blockType: string,
  payload: Record<string, unknown>,
  sortOrder: number,
) {
  const { client } = await requireAdmin();

  let enrichedPayload = { ...payload };
  if (["media", "video", "pdf"].includes(blockType) && payload.media_id) {
    const { data: asset } = await client
      .from("media_assets")
      .select("id,storage_key,mime_type,alt_text")
      .eq("id", payload.media_id as string)
      .is("deleted_at", null)
      .single();
    if (asset) {
      enrichedPayload.media_ref = {
        id: asset.id,
        storage_key: asset.storage_key,
        mime_type: asset.mime_type,
        alt_text: asset.alt_text,
      };
    }
  }

  if (blockType === "gallery" && payload.media_ids) {
    const ids = payload.media_ids as string[];
    const { data: rows } = await client
      .from("media_assets")
      .select("id,storage_key,mime_type,alt_text")
      .in("id", ids)
      .is("deleted_at", null);
    enrichedPayload.media_refs = (rows ?? []).map(
      (r: { id: string; storage_key: string; mime_type: string; alt_text: string }) => ({
        id: r.id, storage_key: r.storage_key, mime_type: r.mime_type, alt_text: r.alt_text,
      }),
    );
  }

  const { data, error } = await client
    .from("work_blocks")
    .insert({
      work_id: workId,
      block_type: blockType,
      sort_order: sortOrder,
      is_visible: true,
      payload: enrichedPayload,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath(`/works/${workSlug}`);
  return { id: (data as { id: string }).id };
}

export async function deleteBlockDirect(
  blockId: string,
  workId: string,
  workSlug: string,
) {
  const { client } = await requireAdmin();
  const { error } = await client.from("work_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/works/${workId}`);
  revalidatePath(`/works/${workSlug}`);
}
