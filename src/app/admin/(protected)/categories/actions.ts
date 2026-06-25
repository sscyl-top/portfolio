"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";
import { createStableSlug } from "@/lib/cms/admin-model";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  slug: slugSchema,
  sort_order: z.coerce.number().int().default(0),
  is_visible: z.boolean(),
});

const tagSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  slug: slugSchema,
});

const idSchema = z.object({
  id: z.string().uuid(),
});

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const parsed = categorySchema.safeParse({
    name,
    slug: formData.get("slug") || createStableSlug(name, "category"),
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client.from("categories").insert(parsed.data);

  if (error) throw new Error(error.message);

  revalidateTaxonomy();
  redirect(`/admin/categories?toast=${encodeURIComponent("分类已创建")}`);
}

export async function updateCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    sort_order: formData.get("sort_order") || 0,
    is_visible: formData.get("is_visible") === "on",
  });

  if (!parsed.success || !parsed.data.id) return;

  const { id, ...values } = parsed.data;
  const { client } = await requireAdmin();
  const { error } = await client.from("categories").update(values).eq("id", id);

  if (error) throw new Error(error.message);

  revalidateTaxonomy();
  redirect(`/admin/categories?toast=category-saved&id=${encodeURIComponent(id)}`);
}

export async function deleteCategory(formData: FormData) {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("categories")
    .update({ deleted_at: new Date().toISOString(), is_visible: false })
    .eq("id", parsed.data.id);

  if (error) throw new Error(error.message);

  revalidateTaxonomy();
  redirect(`/admin/categories?toast=${encodeURIComponent("分类已删除")}`);
}

export async function createTag(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const parsed = tagSchema.safeParse({
    name,
    slug: formData.get("slug") || createStableSlug(name, "tag"),
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client.from("tags").insert(parsed.data);

  if (error) throw new Error(error.message);

  revalidateTaxonomy();
  redirect(`/admin/categories?toast=${encodeURIComponent("标签已创建")}`);
}

export async function updateTag(formData: FormData) {
  const parsed = tagSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success || !parsed.data.id) return;

  const { id, ...values } = parsed.data;
  const { client } = await requireAdmin();
  const { error } = await client.from("tags").update(values).eq("id", id);

  if (error) throw new Error(error.message);

  revalidateTaxonomy();
  redirect(`/admin/categories?toast=tag-saved&id=${encodeURIComponent(id)}`);
}

export async function deleteTag(formData: FormData) {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("tags")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) throw new Error(error.message);

  revalidateTaxonomy();
  redirect(`/admin/categories?toast=${encodeURIComponent("标签已删除")}`);
}

function revalidateTaxonomy() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/works");
  revalidatePath("/works");
}
