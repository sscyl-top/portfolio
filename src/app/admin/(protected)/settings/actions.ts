"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";

const socialLinkSchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().trim().min(1),
});

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  nickname: z.string().trim().max(80),
  default_theme: z.enum(["dark", "light", "system"]),
  font_preset: z.string().trim().min(1).max(80),
  seo_title: z.string().trim().min(1).max(140),
  seo_description: z.string().trim().max(300),
  logo_media_id: z.string().uuid().nullable(),
  avatar_media_id: z.string().uuid().nullable(),
  share_media_id: z.string().uuid().nullable(),
  cta_card_media_id: z.string().uuid().nullable(),
  cta_figure_media_id: z.string().uuid().nullable(),
  social_links: z.array(socialLinkSchema),
});

export async function saveSiteSettings(formData: FormData) {
  const labels = formData.getAll("social_label").map(String);
  const urls = formData.getAll("social_url").map(String);
  const social_links = labels
    .map((label, index) => ({ label, url: urls[index] ?? "" }))
    .filter((link) => link.label.trim() || link.url.trim());

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    nickname: formData.get("nickname") ?? "",
    default_theme: formData.get("default_theme"),
    font_preset: formData.get("font_preset"),
    seo_title: formData.get("seo_title"),
    seo_description: formData.get("seo_description") ?? "",
    logo_media_id: formData.get("logo_media_id") || null,
    avatar_media_id: formData.get("avatar_media_id") || null,
    share_media_id: formData.get("share_media_id") || null,
    cta_card_media_id: formData.get("cta_card_media_id") || null,
    cta_figure_media_id: formData.get("cta_figure_media_id") || null,
    social_links,
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client.from("site_settings").upsert({
    id: true,
    ...parsed.data,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin/settings");
}
