"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";

const pageSchema = z.object({
  slug: z.enum(["home", "works", "resume"]),
  title: z.string().trim().min(1).max(120),
  seo_title: z.string().trim().max(140),
  seo_description: z.string().trim().max(300),
});

const SECTION_ORDER_MODULE_ID = "home-section-order";

type PageModule = {
  id: string;
  type: string;
  sort_order: number;
  is_visible: boolean;
  settings: Record<string, unknown>;
};

export async function savePageSettings(formData: FormData) {
  const parsed = pageSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    seo_title: formData.get("seo_title") ?? "",
    seo_description: formData.get("seo_description") ?? "",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();

  // Preserve existing modules (hero video config etc.) — only update title/SEO
  const { data: existing } = await client
    .from("pages")
    .select("modules")
    .eq("slug", parsed.data.slug)
    .single();

  const { error } = await client.from("pages").upsert({
    ...parsed.data,
    modules: existing?.modules ?? [],
  }, { onConflict: "slug" });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/works");
  revalidatePath("/resume");
  revalidatePath("/admin/pages");
}

/**
 * 保存首页板块排序配置到 pages.modules JSONB 字段。
 */
export async function saveHomeSectionOrder(formData: FormData) {
  const rawOrder = formData.getAll("section_order").map(String).filter(Boolean);
  const validSections = ["hero", "capabilities"];
  const order = rawOrder.filter((s) => validSections.includes(s));

  if (order.length === 0) return;

  const { client } = await requireAdmin();

  const { data: existing } = await client
    .from("pages")
    .select("slug,title,modules,seo_title,seo_description")
    .eq("slug", "home")
    .single();

  const existingModules = (existing?.modules as PageModule[] | null) ?? [];
  const filteredModules = existingModules.filter(
    (m) => m.id !== SECTION_ORDER_MODULE_ID,
  );

  const sectionOrderModule: PageModule = {
    id: SECTION_ORDER_MODULE_ID,
    type: "section_order",
    sort_order: 0,
    is_visible: true,
    settings: { sections: order },
  };

  const { error } = await client.from("pages").upsert(
    {
      slug: "home",
      title: existing?.title ?? "首页",
      seo_title: existing?.seo_title ?? "首页",
      seo_description: existing?.seo_description ?? "",
      modules: [sectionOrderModule, ...filteredModules],
    },
    { onConflict: "slug" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin/pages");
}
