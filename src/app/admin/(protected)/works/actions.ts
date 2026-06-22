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
});

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
  const { error } = await client.from("work_blocks").insert({
    work_id,
    block_type: "media",
    sort_order,
    is_visible,
    payload: { media_id, caption },
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}export async function deleteWorkBlock(formData: FormData) {
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
  const { error } = await client.from("work_blocks").delete().eq("id", block_id);

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
  const { error } = await client.from("work_blocks").insert({
    work_id,
    block_type: "gallery",
    sort_order,
    is_visible,
    payload: { media_ids: rawIds, caption },
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/works/${work_id}`);
  revalidatePath(`/works/${work_slug}`);
}