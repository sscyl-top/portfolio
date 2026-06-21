"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  categories,
  getCompositeWorks,
  works as staticWorks,
} from "@/data/portfolio";
import { requireAdmin } from "@/lib/admin-session";
import {
  createStableSlug,
  toCategorySeedRows,
  toTagSeedRows,
  toWorkSeedRows,
} from "@/lib/cms/admin-model";

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

export async function createDraftWork(formData: FormData) {
  const parsed = draftWorkSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    year: formData.get("year") ?? "",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  await client.from("works").insert({
    ...parsed.data,
    status: "draft",
    palette: [],
    sort_order: 0,
  });

  revalidatePath("/admin/works");
}

export async function seedStaticPortfolio() {
  const { client, user } = await requireAdmin();

  const categoryRows = toCategorySeedRows(categories);
  const { data: savedCategories } = await client
    .from("categories")
    .upsert(categoryRows, { onConflict: "slug" })
    .select("id,name");

  const tagRows = toTagSeedRows(staticWorks);
  const { data: savedTags } = await client
    .from("tags")
    .upsert(tagRows, { onConflict: "slug" })
    .select("id,name");

  const compositeSlugs = new Set(getCompositeWorks().map((work) => work.slug));
  const workRows = toWorkSeedRows(staticWorks, compositeSlugs);
  const { data: savedWorks } = await client
    .from("works")
    .upsert(workRows, { onConflict: "slug" })
    .select("id,slug");

  const categoryByName = new Map(
    (savedCategories ?? []).map((category) => [category.name, category.id]),
  );
  const tagByName = new Map((savedTags ?? []).map((tag) => [tag.name, tag.id]));
  const workBySlug = new Map(
    (savedWorks ?? []).map((work) => [work.slug, work.id]),
  );

  const workCategoryRows = staticWorks
    .map((work) => ({
      work_id: workBySlug.get(work.slug),
      category_id: categoryByName.get(work.category),
    }))
    .filter(
      (row): row is { work_id: string; category_id: string } =>
        Boolean(row.work_id && row.category_id),
    );

  if (workCategoryRows.length > 0) {
    await client.from("work_categories").upsert(workCategoryRows);
  }

  const workTagRows = staticWorks
    .flatMap((work) =>
      work.tags.map((tag) => ({
        work_id: workBySlug.get(work.slug),
        tag_id: tagByName.get(tag),
      })),
    )
    .filter(
      (row): row is { work_id: string; tag_id: string } =>
        Boolean(row.work_id && row.tag_id),
    );

  if (workTagRows.length > 0) {
    await client.from("work_tags").upsert(workTagRows);
  }

  await client.from("audit_logs").insert({
    admin_user_id: user.id,
    action: "seed_static_portfolio",
    entity_type: "portfolio",
    entity_id: "static",
    details: {
      works: workRows.length,
      categories: categoryRows.length,
      tags: tagRows.length,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/works");
  revalidatePath("/admin/categories");
}

export async function suggestSlug(title: string) {
  return createStableSlug(title, "new-work");
}
