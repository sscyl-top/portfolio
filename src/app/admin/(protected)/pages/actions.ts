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
