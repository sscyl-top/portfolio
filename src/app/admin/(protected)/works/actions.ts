"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";
import { createStableSlug } from "@/lib/cms/admin-model";
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
