import {
  categories,
  getCompositeWorks,
  works as staticWorks,
} from "@/data/portfolio";

import {
  toCategorySeedRows,
  toTagSeedRows,
  toWorkSeedRows,
} from "./admin-model";

type MutationResult<TData = unknown> = PromiseLike<{
  data: TData | null;
  error: { message: string } | null;
}>;

type SupabaseMutationClient = {
  from(table: string): {
    upsert(values: unknown, options?: { onConflict?: string }): MutationResult & {
      select(columns: string): MutationResult<Array<Record<string, string>>>;
    };
    insert(values: unknown): MutationResult;
  };
};

type SeedStaticPortfolioOptions = {
  adminUserId: string;
  client: SupabaseMutationClient;
};

export async function seedStaticPortfolioData({
  adminUserId,
  client,
}: SeedStaticPortfolioOptions) {
  const categoryRows = toCategorySeedRows(categories);
  const { data: savedCategories, error: categoryError } = await client
    .from("categories")
    .upsert(categoryRows, { onConflict: "slug" })
    .select("id,name");
  if (categoryError) throw new Error(categoryError.message);

  const tagRows = toTagSeedRows(staticWorks);
  const { data: savedTags, error: tagError } = await client
    .from("tags")
    .upsert(tagRows, { onConflict: "slug" })
    .select("id,name");
  if (tagError) throw new Error(tagError.message);

  const compositeSlugs = new Set(getCompositeWorks().map((work) => work.slug));
  const workRows = toWorkSeedRows(staticWorks, compositeSlugs);
  const { data: savedWorks, error: workError } = await client
    .from("works")
    .upsert(workRows, { onConflict: "slug" })
    .select("id,slug");
  if (workError) throw new Error(workError.message);

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
    const { error } = await client
      .from("work_categories")
      .upsert(workCategoryRows);
    if (error) throw new Error(error.message);
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
    const { error } = await client.from("work_tags").upsert(workTagRows);
    if (error) throw new Error(error.message);
  }

  const { error: auditError } = await client.from("audit_logs").insert({
    admin_user_id: adminUserId,
    action: "seed_static_portfolio",
    entity_type: "portfolio",
    entity_id: "static",
    details: {
      works: workRows.length,
      categories: categoryRows.length,
      tags: tagRows.length,
    },
  });
  if (auditError) throw new Error(auditError.message);

  return {
    categories: categoryRows.length,
    tags: tagRows.length,
    works: workRows.length,
  };
}
