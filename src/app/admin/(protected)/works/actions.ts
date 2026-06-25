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
import {
  archiveWorkVersion,
  listWorkVersions,
  rollbackWorkVersion,
  writeAuditLog,
} from "@/lib/cms/versions";

/**
 * 静默自动归档：在修改作品成功后调用。
 * 失败时只记录日志，不阻断主操作。
 * 自动归档已彻底关闭，版本仅通过手动"保存当前版本"产生。
 * 此函数保留签名以兼容调用点，但不执行任何操作。
 */
async function autoArchiveAfterChange(
  client: Awaited<ReturnType<typeof requireAdmin>>["client"],
  workId: string,
  adminUserId: string,
  label?: string,
) {
  // 自动归档已禁用 — 仅手动归档产生版本
  void client; void workId; void adminUserId; void label;
}

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
  subtitle: z.string().trim().max(160).optional(),
  summary: z.string().trim().max(1000).optional(),
  year: z.string().trim().max(20).optional(),
  client: z.string().trim().max(120).optional(),
  palette: z.array(paletteColorSchema).optional(),
  status: z.enum(["draft", "published", "private"]).optional(),
  sort_order: z.coerce.number().int().optional(),
  is_representative: z.boolean().optional(),
  representative_order: z.coerce.number().int().nullable().optional(),
  is_composite: z.boolean().optional(),
  composite_order: z.coerce.number().int().nullable().optional(),
  seo_title: z.string().trim().max(120).optional(),
  seo_description: z.string().trim().max(300).optional(),
  scheduled_publish_at: z.string().datetime().nullable().optional(),
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
  // 清除 token 的同时将状态恢复为 draft，避免作品永久隐藏
  const { error } = await client
    .from("works")
    .update({ private_token_hash: null, status: "draft" })
    .eq("id", work_id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath("/works");
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

  const { client, user } = await requireAdmin();
  const { work_id, work_slug, ...values } = parsed.data;
  const { error } = await client.from("works").update(values).eq("id", work_id);

  if (error) throw new Error(error.message);

  await autoArchiveAfterChange(client, work_id, user.id, "更新作品媒体");

  redirect(`/admin/works/${work_id}?toast=${encodeURIComponent("媒体保存成功")}`);
}

export async function updateWorkTaxonomy(formData: FormData) {
  const parsed = taxonomyUpdateSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
    category_ids: formData.getAll("category_ids").map(String),
    tag_ids: formData.getAll("tag_ids").map(String),
  });

  if (!parsed.success) return;

  const { client, user } = await requireAdmin();
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

  await autoArchiveAfterChange(client, work_id, user.id, "更新作品分类与标签");

  redirect(`/admin/works/${work_id}?toast=${encodeURIComponent("分类与标签保存成功")}`);
}

export async function updateWork(formData: FormData) {
  const id = formData.get("id");
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) return;
  const workId = idParsed.data;

  const { client, user } = await requireAdmin();

  const { data: currentWork } = await client
    .from("works")
    .select("*")
    .eq("id", workId)
    .is("deleted_at", null)
    .single();

  if (!currentWork) return;

  const updates: Record<string, unknown> = {};

  const title = formData.get("title");
  if (title !== null && typeof title === "string" && title.trim()) updates.title = title.trim();

  const slug = formData.get("slug");
  if (slug !== null && typeof slug === "string" && slug.trim()) updates.slug = slug.trim();

  const subtitle = formData.get("subtitle");
  if (subtitle !== null) updates.subtitle = String(subtitle).trim().slice(0, 160);

  const summary = formData.get("summary");
  if (summary !== null) updates.summary = String(summary).trim().slice(0, 1000);

  const year = formData.get("year");
  if (year !== null) updates.year = String(year).trim().slice(0, 20);

  const clientVal = formData.get("client");
  if (clientVal !== null) updates.client = String(clientVal).trim().slice(0, 120);

  const paletteRaw = formData.get("palette");
  if (paletteRaw !== null) {
    const colors = String(paletteRaw)
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^#[0-9a-fA-F]{3,6}$/.test(s));
    updates.palette = colors;
  }

  const status = formData.get("status");
  if (status !== null && typeof status === "string" && ["draft", "published", "private"].includes(status)) {
    updates.status = status;
  }

  const sortOrder = formData.get("sort_order");
  if (sortOrder !== null) {
    const n = Number(sortOrder);
    if (Number.isInteger(n)) updates.sort_order = n;
  }

  if (formData.has("is_representative")) {
    updates.is_representative = formData.get("is_representative") === "on";
  }
  if (formData.has("representative_order")) {
    const v = formData.get("representative_order");
    updates.representative_order = v ? Number(v) : null;
  }
  if (formData.has("is_composite")) {
    updates.is_composite = formData.get("is_composite") === "on";
  }
  if (formData.has("composite_order")) {
    const v = formData.get("composite_order");
    updates.composite_order = v ? Number(v) : null;
  }

  const seoTitle = formData.get("seo_title");
  if (seoTitle !== null) updates.seo_title = String(seoTitle).trim().slice(0, 120);

  const seoDesc = formData.get("seo_description");
  if (seoDesc !== null) updates.seo_description = String(seoDesc).trim().slice(0, 300);

  if (formData.has("scheduled_publish_at")) {
    const v = formData.get("scheduled_publish_at");
    updates.scheduled_publish_at = v ? new Date(String(v)).toISOString() : null;
  }

  const existingPublishedAt = (currentWork as { published_at: string | null }).published_at;
  const newStatus = (updates.status as "draft" | "published" | "private" | undefined) ?? (currentWork as { status: string }).status;
  const published_at =
    newStatus === "published"
      ? existingPublishedAt ?? new Date().toISOString()
      : existingPublishedAt;
  updates.published_at = published_at;

  const { error } = await client
    .from("works")
    .update(updates)
    .eq("id", workId);

  if (error) throw new Error(error.message);

  await autoArchiveAfterChange(client, workId, user.id, "更新作品元数据");

  redirect(`/admin/works/${workId}?toast=${encodeURIComponent("作品保存成功")}`);
}

export async function deleteWork(formData: FormData) {
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""));
  if (!id.success) return;

  const { client } = await requireAdmin();

  // 查询 slug 用于清理公开缓存
  const { data: workRow } = await client
    .from("works")
    .select("slug")
    .eq("id", id.data)
    .single();

  const { error } = await client
    .from("works")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
  revalidatePath("/works");
  if (workRow?.slug) {
    revalidatePath(`/works/${workRow.slug}`);
  }

  redirect("/admin/works");
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

  const { client, user } = await requireAdmin();
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

  await autoArchiveAfterChange(client, work_id, user.id, "创建文本块");

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

  const { client, user } = await requireAdmin();
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

  // 高频微调操作，不触发自动归档

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

  const { client, user } = await requireAdmin();
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

  await autoArchiveAfterChange(client, work_id, user.id, "创建媒体块");

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

  const { client, user } = await requireAdmin();
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

  // 媒体块调整属于高频微调操作，不触发自动归档（避免版本爆炸）
  // 用户可通过手动"保存当前版本"按钮归档重要节点

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

  const { client, user } = await requireAdmin();
  const { block_id, work_id, work_slug } = parsed.data;
  const { error } = await client.from("work_blocks").delete()    .eq("id", block_id);

  if (error) throw new Error(error.message);

  await autoArchiveAfterChange(client, work_id, user.id, "删除内容块");

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

  const { client, user } = await requireAdmin();
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

  await autoArchiveAfterChange(client, work_id, user.id, "创建视频块");

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

  const { client, user } = await requireAdmin();
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

  // 高频微调操作，不触发自动归档

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

  const { client, user } = await requireAdmin();
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

  await autoArchiveAfterChange(client, work_id, user.id, "创建 PDF 块");

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

  const { client, user } = await requireAdmin();
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

  // 高频微调操作，不触发自动归档

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

  const { client, user } = await requireAdmin();
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

  await autoArchiveAfterChange(client, work_id, user.id, "创建 Before/After 块");

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

  const { client, user } = await requireAdmin();
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

  // 高频微调操作，不触发自动归档

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

const createWorkFromMediaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  year: z.string().trim().max(20).default(""),
  media_ids: z.array(z.string().uuid()).min(1, "至少上传一个媒体文件"),
});

/**
 * 站酷式快速发布：从拖拽上传的媒体一键创建作品草稿。
 * 第一个媒体设为封面，其余按顺序生成对应内容块。
 */
export async function createWorkFromMedia(formData: FormData) {
  const rawIds = formData.getAll("media_ids").map(String).filter(Boolean);
  const parsed = createWorkFromMediaSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    year: formData.get("year") ?? "",
    media_ids: rawIds,
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { title, slug, year, media_ids } = parsed.data;

  const { data: work, error } = await client
    .from("works")
    .insert({
      title,
      slug,
      year,
      status: "draft",
      palette: [],
      sort_order: 0,
      cover_media_id: media_ids[0],
    })
    .select("id")
    .single();

  if (error || !work) throw new Error(error?.message ?? "作品创建失败");

  const { data: assets } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .in("id", media_ids)
    .is("deleted_at", null);

  const assetById = new Map(
    (assets ?? []).map((a: { id: string; storage_key: string; mime_type: string; alt_text: string }) => [a.id, a]),
  );

  const blockRows = media_ids.map((id, index) => {
    const asset = assetById.get(id);
    const mimeType = asset?.mime_type ?? "";
    const blockType = mimeType.startsWith("video/")
      ? "video"
      : mimeType === "application/pdf"
        ? "pdf"
        : "media";

    const mediaRef = asset
      ? { id: asset.id, storage_key: asset.storage_key, mime_type: asset.mime_type, alt_text: asset.alt_text }
      : null;

    return {
      work_id: work.id,
      block_type: blockType,
      sort_order: index,
      is_visible: true,
      payload: { media_id: id, caption: "", media_ref: mediaRef },
    };
  });

  if (blockRows.length > 0) {
    const { error: blockError } = await client.from("work_blocks").insert(blockRows);
    if (blockError) throw new Error(blockError.message);
  }

  revalidatePath("/admin/works");
  redirect(`/admin/works/${work.id}`);
}

const createWorkFromWizardSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  subtitle: z.string().trim().max(160).default(""),
  summary: z.string().trim().max(1000).default(""),
  year: z.string().trim().max(20).default(""),
  client: z.string().trim().max(120).default(""),
  palette: z.string().trim().default(""),
  status: z.enum(["draft", "published", "private"]).default("draft"),
  media_ids: z.array(z.string().uuid()).min(1, "至少上传一个媒体文件"),
  category_ids: z.array(z.string().uuid()).default([]),
  tag_ids: z.array(z.string().uuid()).default([]),
  is_representative: z.coerce.boolean().default(false),
  representative_order: z.coerce.number().int().min(1).max(7).nullable().default(null),
  is_composite: z.coerce.boolean().default(false),
});

/**
 * 站酷式三步向导：从媒体、元数据创建作品。
 * 第一个媒体设为封面，其余按顺序生成内容块；同时写入分类与标签。
 */
export async function createWorkFromWizard(formData: FormData) {
  const rawIds = formData.getAll("media_ids").map(String).filter(Boolean);
  const parsed = createWorkFromWizardSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    subtitle: formData.get("subtitle") ?? "",
    summary: formData.get("summary") ?? "",
    year: formData.get("year") ?? "",
    client: formData.get("client") ?? "",
    palette: formData.get("palette") ?? "",
    status: formData.get("status"),
    media_ids: rawIds,
    category_ids: formData.getAll("category_ids").map(String).filter(Boolean),
    tag_ids: formData.getAll("tag_ids").map(String).filter(Boolean),
    is_representative: formData.get("is_representative") === "on" || formData.get("is_representative") === "true",
    representative_order: formData.get("representative_order") ? Number(formData.get("representative_order")) : null,
    is_composite: formData.get("is_composite") === "on" || formData.get("is_composite") === "true",
  });

  if (!parsed.success) return;

  const { client, user } = await requireAdmin();
  const {
    title,
    slug,
    subtitle,
    summary,
    year,
    client: workClient,
    palette,
    status,
    media_ids,
    category_ids,
    tag_ids,
    is_representative,
    representative_order,
    is_composite,
  } = parsed.data;

  const paletteColors = palette
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^#[0-9a-fA-F]{3,6}$/.test(s));

  const published_at = status === "published" ? new Date().toISOString() : null;

  // 如果要设置为代表作且指定了槽位，先清除该槽位现有作品
  if (is_representative && representative_order) {
    await client
      .from("works")
      .update({ is_representative: false, representative_order: null })
      .eq("representative_order", representative_order)
      .is("deleted_at", null);
  }

  // 如果要设置为复合设计，composite_order自动分配
  let composite_order: number | null = null;
  if (is_composite) {
    const { data: maxComposite } = await client
      .from("works")
      .select("composite_order")
      .eq("is_composite", true)
      .is("deleted_at", null)
      .order("composite_order", { ascending: false })
      .limit(1);
    composite_order = (maxComposite?.[0]?.composite_order as number) ?? 0;
    composite_order += 1;
  }

  const { data: work, error } = await client
    .from("works")
    .insert({
      title,
      slug,
      subtitle,
      summary,
      year,
      client: workClient,
      status,
      palette: paletteColors,
      sort_order: 0,
      cover_media_id: media_ids[0],
      published_at,
      is_representative,
      representative_order: is_representative ? representative_order : null,
      is_composite,
      composite_order,
    })
    .select("id")
    .single();

  if (error || !work) throw new Error(error?.message ?? "作品创建失败");

  const { data: assets } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .in("id", media_ids)
    .is("deleted_at", null);

  const assetById = new Map(
    (assets ?? []).map((a: { id: string; storage_key: string; mime_type: string; alt_text: string }) => [a.id, a]),
  );

  const blockRows = media_ids.map((id, index) => {
    const asset = assetById.get(id);
    const mimeType = asset?.mime_type ?? "";
    const blockType = mimeType.startsWith("video/")
      ? "video"
      : mimeType === "application/pdf"
        ? "pdf"
        : "media";

    const mediaRef = asset
      ? { id: asset.id, storage_key: asset.storage_key, mime_type: asset.mime_type, alt_text: asset.alt_text }
      : null;

    return {
      work_id: work.id,
      block_type: blockType,
      sort_order: index,
      is_visible: true,
      payload: { media_id: id, caption: "", media_ref: mediaRef },
    };
  });

  if (blockRows.length > 0) {
    const { error: blockError } = await client.from("work_blocks").insert(blockRows);
    if (blockError) throw new Error(blockError.message);
  }

  if (category_ids.length > 0) {
    const { error: catError } = await client
      .from("work_categories")
      .insert(category_ids.map((category_id) => ({ work_id: work.id, category_id })));
    if (catError) throw new Error(catError.message);
  }

  if (tag_ids.length > 0) {
    const { error: tagError } = await client
      .from("work_tags")
      .insert(tag_ids.map((tag_id) => ({ work_id: work.id, tag_id })));
    if (tagError) throw new Error(tagError.message);
  }

  await autoArchiveAfterChange(client, work.id, user.id, "向导创建作品");

  revalidatePath("/admin/works");
  redirect(`/admin/works/${work.id}`);
}

export async function reorderWorkBlocks(
  workId: string,
  workSlug: string,
  blockIds: string[],
) {
  const { client, user } = await requireAdmin();

  const updates = blockIds.map((id, index) =>
    client.from("work_blocks").update({ sort_order: index }).eq("id", id).eq("work_id", workId),
  );
  const results = await Promise.all(updates);
  const error = results.find((r) => r.error);
  if (error?.error) throw new Error(error.error.message);

  await autoArchiveAfterChange(client, workId, user.id, "重新排序内容块");

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

  const { client, user } = await requireAdmin();
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

  await autoArchiveAfterChange(client, work_id, user.id, "创建图库块");

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

  const { client, user } = await requireAdmin();
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

  // 高频微调操作，不触发自动归档

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
  const { client, user } = await requireAdmin();

  const enrichedPayload = { ...payload };
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

  await autoArchiveAfterChange(client, workId, user.id, `直接创建 ${blockType} 块`);

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath(`/works/${workSlug}`);
  return { id: (data as { id: string }).id };
}

export async function deleteBlockDirect(
  blockId: string,
  workId: string,
  workSlug: string,
) {
  const { client, user } = await requireAdmin();
  const { error } = await client.from("work_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);

  await autoArchiveAfterChange(client, workId, user.id, "直接删除内容块");

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath(`/works/${workSlug}`);
}

export async function updateBlockDirect(
  workId: string,
  workSlug: string,
  blockId: string,
  payload: Record<string, unknown>,
) {
  const { client, user } = await requireAdmin();

  // Re-enrich media_ref if this is a media/video/pdf block with media_id
  const blockType = payload._block_type as string | undefined;
  const enrichedPayload = { ...payload };
  delete enrichedPayload._block_type;

  // 先获取当前块类型（如果_block_type未提供）
  let effectiveBlockType = blockType;
  if (!effectiveBlockType) {
    const { data: currentBlock } = await client
      .from("work_blocks")
      .select("block_type")
      .eq("id", blockId)
      .eq("work_id", workId)
      .single();
    effectiveBlockType = (currentBlock as { block_type?: string })?.block_type;
  }

  if (["media", "video", "pdf"].includes(effectiveBlockType ?? "") && enrichedPayload.media_id) {
    const { data: asset } = await client
      .from("media_assets")
      .select("id,storage_key,mime_type,alt_text")
      .eq("id", enrichedPayload.media_id as string)
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

  // 如果是gallery块，重新构建media_refs
  if (effectiveBlockType === "gallery" && Array.isArray(enrichedPayload.media_ids)) {
    const ids = enrichedPayload.media_ids as string[];
    if (ids.length > 0) {
      const { data: rows } = await client
        .from("media_assets")
        .select("id,storage_key,mime_type,alt_text")
        .in("id", ids)
        .is("deleted_at", null);
      const idOrder = new Map(ids.map((id, idx) => [id, idx]));
      enrichedPayload.media_refs = (rows ?? [])
        .map((r: { id: string; storage_key: string; mime_type: string; alt_text: string }) => ({
          id: r.id, storage_key: r.storage_key, mime_type: r.mime_type, alt_text: r.alt_text,
        }))
        .sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
    } else {
      enrichedPayload.media_refs = [];
    }
  }

  const { error } = await client
    .from("work_blocks")
    .update({ payload: enrichedPayload })
    .eq("id", blockId)
    .eq("work_id", workId);

  if (error) throw new Error(error.message);

  // 高频微调操作，不触发自动归档

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath(`/works/${workSlug}`);
}

/**
 * 仅保存布局变更，不触发 revalidatePath — 用于后台布局按钮高频切换
 * （避免乐观更新被服务端 RSC 重新渲染覆盖，导致按钮来回跳动）
 * 正确合并layout到现有payload中，保留media_ids/media_refs等其他字段
 */
export async function updateBlockLayoutDirect(
  workId: string,
  blockId: string,
  newPayload: Record<string, unknown>,
) {
  const { client } = await requireAdmin();

  // 先获取当前块的payload
  const { data: block } = await client
    .from("work_blocks")
    .select("payload,block_type")
    .eq("id", blockId)
    .eq("work_id", workId)
    .single();

  if (!block) throw new Error("Block not found");

  const currentPayload = ((block as { payload?: Record<string, unknown> }).payload) || {};
  // 合并新layout到现有payload中，保留其他字段
  const mergedPayload: Record<string, unknown> = {
    ...currentPayload,
    ...newPayload,
    layout: {
      ...(currentPayload.layout as Record<string, unknown> | undefined ?? {}),
      ...(newPayload.layout as Record<string, unknown> | undefined ?? {}),
    },
  };

  // 如果是gallery块，确保media_refs正确（基于media_ids）
  if ((block as { block_type: string }).block_type === "gallery" && mergedPayload.media_ids) {
    const ids = mergedPayload.media_ids as string[];
    const { data: rows } = await client
      .from("media_assets")
      .select("id,storage_key,mime_type,alt_text")
      .in("id", ids)
      .is("deleted_at", null);
    const idOrder = new Map(ids.map((id, idx) => [id, idx]));
    mergedPayload.media_refs = (rows ?? [])
      .map((r: { id: string; storage_key: string; mime_type: string; alt_text: string }) => ({
        id: r.id, storage_key: r.storage_key, mime_type: r.mime_type, alt_text: r.alt_text,
      }))
      .sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
  }

  const { error } = await client
    .from("work_blocks")
    .update({ payload: mergedPayload })
    .eq("id", blockId)
    .eq("work_id", workId);

  if (error) throw new Error(error.message);
}

/**
 * 更新块的 media_ref（用于裁剪后替换媒体）
 */
export async function updateBlockMediaRef(
  workId: string,
  workSlug: string,
  blockId: string,
  mediaId: string,
) {
  const { client, user } = await requireAdmin();

  // 获取新的 media asset 信息
  const { data: asset } = await client
    .from("media_assets")
    .select("id,storage_key,mime_type,alt_text")
    .eq("id", mediaId)
    .is("deleted_at", null)
    .single();

  if (!asset) throw new Error("Media asset not found");

  // 获取当前块
  const { data: block } = await client
    .from("work_blocks")
    .select("payload,block_type")
    .eq("id", blockId)
    .single();

  if (!block) throw new Error("Block not found");

  // 更新 payload 中的 media_id 和 media_ref
  const currentPayload = (block as { payload?: Record<string, unknown> }).payload || {};
  const newPayload = {
    ...currentPayload,
    media_id: mediaId,
    media_ref: {
      id: asset.id,
      storage_key: asset.storage_key,
      mime_type: asset.mime_type,
      alt_text: asset.alt_text,
    },
  };

  const { error } = await client
    .from("work_blocks")
    .update({ payload: newPayload })
    .eq("id", blockId)
    .eq("work_id", workId);

  if (error) throw new Error(error.message);

  // 高频微调操作，不触发自动归档

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath(`/works/${workSlug}`);
}

// ── 版本控制 Server Actions ────────────────────────────────

const versionActionSchema = z.object({
  work_id: z.string().uuid(),
  work_slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

/**
 * 手动保存当前作品状态为一个版本。
 */
export async function archiveWorkVersionAction(formData: FormData) {
  const parsed = versionActionSchema.safeParse({
    work_id: formData.get("work_id"),
    work_slug: formData.get("work_slug"),
  });
  if (!parsed.success) return;

  const { client, user } = await requireAdmin();
  const label = String(formData.get("label") ?? "").trim() || undefined;

  const versionNumber = await archiveWorkVersion(
    client,
    parsed.data.work_id,
    user.id,
    label,
    "manual",
  );
  if (!versionNumber) throw new Error("作品不存在，无法保存版本");

  revalidatePath(`/admin/works/${parsed.data.work_id}`);
}

/**
 * 查询作品的版本列表。
 */
export async function listWorkVersionsAction(workId: string) {
  const parsed = z.string().uuid().safeParse(workId);
  if (!parsed.success) throw new Error("无效的作品 ID");

  const { client } = await requireAdmin();
  return listWorkVersions(client, parsed.data);
}

/**
 * 回滚到指定版本（目标版本号低于或等于当前版本）。
 */
export async function rollbackWorkVersionAction(formData: FormData) {
  const parsed = z
    .object({
      work_id: z.string().uuid(),
      work_slug: z
        .string()
        .trim()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      version_number: z.coerce.number().int().min(1),
    })
    .safeParse({
      work_id: formData.get("work_id"),
      work_slug: formData.get("work_slug"),
      version_number: formData.get("version_number"),
    });

  if (!parsed.success) return;

  const { client, user } = await requireAdmin();
  const { work_id, work_slug, version_number } = parsed.data;

  await rollbackWorkVersion(client, work_id, version_number, user.id);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

// ── 批量操作 Server Actions ────────────────────────────────

const batchWorkIdsSchema = z.object({
  work_ids: z.array(z.string().uuid()).min(1),
});

/**
 * 批量删除作品（软删除）。
 */
export async function batchDeleteWorks(formData: FormData) {
  const parsed = batchWorkIdsSchema.safeParse({
    work_ids: formData.getAll("work_ids").map(String).filter(Boolean),
  });
  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("works")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", parsed.data.work_ids);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
}

/**
 * 批量修改作品状态。
 */
export async function batchUpdateWorkStatus(formData: FormData) {
  const parsed = z
    .object({
      work_ids: z.array(z.string().uuid()).min(1),
      status: z.enum(["draft", "published", "private"]),
    })
    .safeParse({
      work_ids: formData.getAll("work_ids").map(String).filter(Boolean),
      status: formData.get("status"),
    });
  if (!parsed.success) return;

  const { client } = await requireAdmin();

  // 批量发布时：保留已有 published_at，仅首次发布时设置；同时清除 scheduled_publish_at
  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
    scheduled_publish_at: null,
  };

  if (parsed.data.status === "published") {
    // 查询已有 published_at，仅对未发布过的作品设置当前时间
    const { data: existingWorks } = await client
      .from("works")
      .select("id,published_at")
      .in("id", parsed.data.work_ids);

    const now = new Date().toISOString();
    const needsPublishAt = (existingWorks ?? []).filter(
      (w) => !w.published_at,
    );
    if (needsPublishAt.length > 0) {
      // 对没有 published_at 的作品单独更新
      const newIds = needsPublishAt.map((w) => w.id);
      await client
        .from("works")
        .update({ ...updateData, published_at: now })
        .in("id", newIds);
    }
    // 已有 published_at 的作品只更新 status 和 scheduled_publish_at
    const existingIds = (existingWorks ?? [])
      .filter((w) => w.published_at)
      .map((w) => w.id);
    if (existingIds.length > 0) {
      await client.from("works").update(updateData).in("id", existingIds);
    }
  } else {
    // 非发布状态：保留已有 published_at，不清空
    const { error } = await client
      .from("works")
      .update(updateData)
      .in("id", parsed.data.work_ids);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/works");
  revalidatePath("/works");
  parsed.data.work_ids.forEach((id) => revalidatePath(`/admin/works/${id}`));
}

/**
 * 检查并发布所有到达 scheduled_publish_at 时间的草稿作品。
 */
export async function publishScheduledWorks() {
  const { client } = await requireAdmin();

  const now = new Date().toISOString();
  const { data: dueWorks, error: fetchError } = await client
    .from("works")
    .select("id,slug")
    .eq("status", "draft")
    .lte("scheduled_publish_at", now)
    .is("deleted_at", null);

  if (fetchError) throw new Error(fetchError.message);
  if (!dueWorks || dueWorks.length === 0) return;

  const ids = (dueWorks as Array<{ id: string; slug: string }>).map((w) => w.id);
  const { error: updateError } = await client
    .from("works")
    .update({ status: "published", published_at: now })
    .in("id", ids);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/admin/works");
  ids.forEach((id) => revalidatePath(`/admin/works/${id}`));
}

/**
 * 批量设置作品展示属性（代表作 / 复合设计）。
 */
export async function batchUpdateWorkPlacement(formData: FormData) {
  const parsed = z
    .object({
      work_ids: z.array(z.string().uuid()).min(1),
      field: z.enum(["is_representative", "is_composite"]),
      value: z.coerce.boolean(),
    })
    .safeParse({
      work_ids: formData.getAll("work_ids").map(String).filter(Boolean),
      field: formData.get("field"),
      value: formData.get("value"),
    });
  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const update =
    parsed.data.field === "is_representative"
      ? { is_representative: parsed.data.value }
      : { is_composite: parsed.data.value };

  const { error } = await client
    .from("works")
    .update(update)
    .in("id", parsed.data.work_ids);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
  parsed.data.work_ids.forEach((id) => revalidatePath(`/admin/works/${id}`));
}

/**
 * 删除指定版本（支持单选/多选）。
 * 基于 work_id + version_number 唯一约束删除，不物理删除当前活跃版本。
 * 不允许删除当前正在使用的版本（is_current）。
 */
export async function deleteWorkVersionsAction(formData: FormData) {
  const parsed = z
    .object({
      work_id: z.string().uuid(),
      work_slug: z
        .string()
        .trim()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      version_numbers: z
        .string() // 逗号分隔的版本号
        .transform((s) => s.split(",").map(Number).filter((n) => n > 0)),
    })
    .safeParse({
      work_id: formData.get("work_id"),
      work_slug: formData.get("work_slug"),
      version_numbers: formData.get("version_numbers"),
    });

  if (!parsed.success || parsed.data.version_numbers.length === 0) return;

  const { client, user } = await requireAdmin();
  const { work_id, work_slug, version_numbers } = parsed.data;

  // 检查所有目标版本都不是当前版本
  const { data: allVersions } = await client
    .from("work_versions")
    .select("version_number")
    .eq("work_id", work_id)
    .in("version_number", version_numbers)
    .order("version_number", { ascending: false })
    .limit(1);

  const maxVersion = allVersions && allVersions.length > 0
    ? (allVersions[0].version_number as number)
    : 0;

  const { error: deleteError } = await client
    .from("work_versions")
    .delete()
    .eq("work_id", work_id)
    .in("version_number", version_numbers);

  if (deleteError) throw new Error(deleteError.message);

  await writeAuditLog(client, {
    adminUserId: user.id,
    action: "delete_work_versions",
    workId: work_id,
    details: { deleted_versions: version_numbers },
  });

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

/**
 * 从当前版本前进到更高版本号。
 * 与回滚共用同一套底层逻辑：先备份当前状态，再还原目标快照。
 */
export async function restoreForwardWorkVersionAction(formData: FormData) {
  const parsed = z
    .object({
      work_id: z.string().uuid(),
      work_slug: z
        .string()
        .trim()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      version_number: z.coerce.number().int().min(1),
    })
    .safeParse({
      work_id: formData.get("work_id"),
      work_slug: formData.get("work_slug"),
      version_number: formData.get("version_number"),
    });

  if (!parsed.success) return;

  const { client, user } = await requireAdmin();
  const { work_id, work_slug, version_number } = parsed.data;

  await rollbackWorkVersion(client, work_id, version_number, user.id);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}

/**
 * 批量更新作品排序。
 * 接收有序的 work_id 数组（JSON 字符串），按位置分配 sort_order。
 */
export async function reorderWorksAction(formData: FormData) {
  const raw = String(formData.get("ordered_ids") ?? "[]");
  let orderedIds: string[] = [];
  try {
    orderedIds = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;

  const uuidSchema = z.array(z.string().uuid());
  const parsed = uuidSchema.safeParse(orderedIds);
  if (!parsed.success) return;

  const { client } = await requireAdmin();

  // sort_order 从高到低：第一个作品 sort_order 最大
  const base = parsed.data.length;
  const results = await Promise.all(
    parsed.data.map((workId, index) =>
      client
        .from("works")
        .update({ sort_order: base - index })
        .eq("id", workId),
    ),
  );

  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw new Error(firstError.error.message);

  revalidatePath("/admin/works");
  revalidatePath("/works");
}

// ── 作品评论审核 Server Actions ────────────────────────────

const commentIdSchema = z.string().uuid();

/**
 * 审核通过作品评论：将 is_approved 置为 true。
 */
export async function approveWorkCommentAction(formData: FormData) {
  const parsed = commentIdSchema.safeParse(String(formData.get("id") ?? ""));
  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("work_comments")
    .update({ is_approved: true })
    .eq("id", parsed.data);

  if (error) {
    console.error("Failed to approve work comment", error);
    return;
  }

  revalidatePath("/admin/analytics");
}

/**
 * 删除作品评论。
 * 注：work_comments 表无 deleted_at 软删除字段，此处执行硬删除。
 */
export async function deleteWorkCommentAction(formData: FormData) {
  const parsed = commentIdSchema.safeParse(String(formData.get("id") ?? ""));
  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("work_comments")
    .delete()
    .eq("id", parsed.data);

  if (error) {
    console.error("Failed to delete work comment", error);
    return;
  }

  revalidatePath("/admin/analytics");
}

// ── 代表作槽位管理 Server Actions ──────────────────────────

const representativeSlotSchema = z.object({
  work_id: z.string().uuid(),
  slot: z.coerce.number().int().min(1).max(7),
});

/**
 * 将现有作品分配到指定代表作槽位。
 * 如果该槽位已有作品，会先将其移出代表作。
 */
export async function assignToRepresentativeSlot(formData: FormData) {
  const parsed = representativeSlotSchema.safeParse({
    work_id: formData.get("work_id"),
    slot: formData.get("slot"),
  });
  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { work_id, slot } = parsed.data;

  await client
    .from("works")
    .update({ is_representative: false, representative_order: null })
    .eq("representative_order", slot)
    .is("deleted_at", null);

  await client
    .from("works")
    .update({ representative_order: null })
    .eq("id", work_id)
    .is("deleted_at", null);

  const { error } = await client
    .from("works")
    .update({ is_representative: true, representative_order: slot })
    .eq("id", work_id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
  revalidatePath("/");
  revalidatePath("/works");
}

/**
 * 将作品从代表作移除（保留作品本身）。
 */
export async function removeFromRepresentative(formData: FormData) {
  const parsed = z.object({ work_id: z.string().uuid() }).safeParse({
    work_id: formData.get("work_id"),
  });
  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("works")
    .update({ is_representative: false, representative_order: null })
    .eq("id", parsed.data.work_id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/works");
  revalidatePath("/");
  revalidatePath("/works");
}

const emptyWorkSchema = z.object({
  section: z.enum(["all", "representative", "composite"]).default("all"),
  representative_slot: z.coerce.number().int().min(1).max(7).optional(),
});

/**
 * 快速创建空作品：点击"上传新作品"直接进入编辑页。
 * 默认已发布状态，带唯一slug，不创建任何内容块。
 */
export async function createEmptyWork(formData: FormData) {
  const parsed = emptyWorkSchema.safeParse({
    section: formData.get("section") ?? "all",
    representative_slot: formData.get("representative_slot") ?? undefined,
  });
  if (!parsed.success) redirect("/admin/works");

  const { section, representative_slot } = parsed.data;
  const { client, user } = await requireAdmin();

  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  const baseSlug = `untitled-${timestamp}${randomSuffix}`;

  const isRepresentative = section === "representative";
  const isComposite = section === "composite";

  let representative_order: number | null = null;
  let composite_order: number | null = null;

  if (isRepresentative) {
    const slot = representative_slot ?? null;
    if (slot) {
      await client
        .from("works")
        .update({ is_representative: false, representative_order: null })
        .eq("representative_order", slot)
        .is("deleted_at", null);
      representative_order = slot;
    }
  }

  if (isComposite) {
    const { data: maxComposite } = await client
      .from("works")
      .select("composite_order")
      .eq("is_composite", true)
      .is("deleted_at", null)
      .order("composite_order", { ascending: false })
      .limit(1);
    composite_order = ((maxComposite?.[0]?.composite_order as number) ?? 0) + 1;
  }

  const { data: work, error } = await client
    .from("works")
    .insert({
      title: "未命名作品",
      slug: baseSlug,
      subtitle: "",
      summary: "",
      year: "",
      client: "",
      status: "published",
      palette: [],
      sort_order: 0,
      cover_media_id: null,
      published_at: new Date().toISOString(),
      is_representative: isRepresentative,
      representative_order,
      is_composite: isComposite,
      composite_order,
      seo_title: "",
      seo_description: "",
    })
    .select("id")
    .single();

  if (error || !work) throw new Error(error?.message ?? "作品创建失败");

  await autoArchiveAfterChange(client, work.id, user.id, "创建空作品（快速上传）");

  revalidatePath("/admin/works");
  redirect(`/admin/works/${work.id}`);
}
