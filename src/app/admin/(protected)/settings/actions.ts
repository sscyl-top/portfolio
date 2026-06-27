"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { runHeroVideosMigration, runCtaTransformMigration } from "@/lib/cms/migrations";

const uuidOrNull = (val: FormDataEntryValue | null) => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  return str;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isSchemaCacheError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("schema") || lower.includes("column") || lower.includes("does not exist");
}

async function saveTextContent(
  serviceClient: ReturnType<typeof createSupabaseServiceClient>,
  key: string,
  content: string,
) {
  try {
    const { data: existing, error: findErr } = await serviceClient
      .from("text_content")
      .select("id")
      .eq("key", key)
      .eq("page", "site_settings")
      .limit(1)
      .maybeSingle();

    if (findErr) {
      console.warn(`[Settings] Failed to find text_content for ${key}:`, findErr.message);
      return;
    }

    if (existing) {
      const { error: updErr } = await serviceClient
        .from("text_content")
        .update({ content, is_active: true, deleted_at: null })
        .eq("id", existing.id);
      if (updErr) console.warn(`[Settings] Failed to update text_content ${key}:`, updErr.message);
    } else {
      const { error: insErr } = await serviceClient.from("text_content").insert({
        key,
        content,
        page: "site_settings",
        sort_order: 0,
        is_active: true,
      });
      if (insErr) console.warn(`[Settings] Failed to insert text_content ${key}:`, insErr.message);
    }
  } catch (e) {
    console.warn(`[Settings] Exception saving text_content ${key}:`, e);
  }
}

export async function saveSiteSettings(formData: FormData) {
  await requireAdmin();

  const labels = formData.getAll("social_label").map(String);
  const urls = formData.getAll("social_url").map(String);
  const social_links = labels
    .map((label, index) => ({ label: label.trim(), url: (urls[index] ?? "").trim() }))
    .filter((link) => link.label && link.url);

  const cta_card_scale = Number(formData.get("cta_card_scale") ?? 1);
  const cta_card_offset_x = Number(formData.get("cta_card_offset_x") ?? 0);
  const cta_card_offset_y = Number(formData.get("cta_card_offset_y") ?? 0);
  const cta_figure_scale = Number(formData.get("cta_figure_scale") ?? 1);
  const cta_figure_offset_x = Number(formData.get("cta_figure_offset_x") ?? 0);
  const cta_figure_offset_y = Number(formData.get("cta_figure_offset_y") ?? 0);

  const tickerLogoIdsRaw = String(formData.get("cta_ticker_logo_media_ids") ?? "").trim();
  const ctaTickerLogoMediaIds = tickerLogoIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(",");

  const saveData: Record<string, unknown> = {
    id: true,
    name: String(formData.get("name") ?? "").trim(),
    nickname: String(formData.get("nickname") ?? "").trim(),
    default_theme: formData.get("default_theme"),
    font_preset: String(formData.get("font_preset") ?? "default").trim(),
    seo_title: String(formData.get("seo_title") ?? "").trim(),
    seo_description: String(formData.get("seo_description") ?? "").trim(),
    logo_media_id: uuidOrNull(formData.get("logo_media_id")),
    avatar_media_id: uuidOrNull(formData.get("avatar_media_id")),
    share_media_id: uuidOrNull(formData.get("share_media_id")),
    cta_card_media_id: uuidOrNull(formData.get("cta_card_media_id")),
    cta_figure_media_id: uuidOrNull(formData.get("cta_figure_media_id")),
    cta_ticker_logo_media_id: uuidOrNull(formData.get("cta_ticker_logo_media_id")),
    hero_main_video_media_id: uuidOrNull(formData.get("hero_main_video_media_id")),
    hero_side1_video_media_id: uuidOrNull(formData.get("hero_side1_video_media_id")),
    hero_side2_video_media_id: uuidOrNull(formData.get("hero_side2_video_media_id")),
    hero_side3_video_media_id: uuidOrNull(formData.get("hero_side3_video_media_id")),
    social_links,
  };

  const ctaTransformValues: Record<string, number> = {
    cta_card_scale: isNaN(cta_card_scale) ? 1 : Math.min(5, Math.max(0.1, cta_card_scale)),
    cta_card_offset_x: isNaN(cta_card_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_x)),
    cta_card_offset_y: isNaN(cta_card_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_y)),
    cta_figure_scale: isNaN(cta_figure_scale) ? 1 : Math.min(5, Math.max(0.1, cta_figure_scale)),
    cta_figure_offset_x: isNaN(cta_figure_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_x)),
    cta_figure_offset_y: isNaN(cta_figure_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_y)),
  };

  await runHeroVideosMigration().catch(() => {});
  await runCtaTransformMigration().catch(() => {});

  await wait(1500);

  const serviceClient = createSupabaseServiceClient();

  let saveError: string | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await serviceClient.from("site_settings").upsert(saveData, { onConflict: "id" });
    if (!error) {
      console.log(`[Settings] site_settings saved successfully (attempt ${attempt + 1})`);
      saveError = null;
      break;
    }
    saveError = error.message;
    console.warn(`[Settings] site_settings save attempt ${attempt + 1} failed:`, error.message);
    if (isSchemaCacheError(error.message) && attempt < 3) {
      await wait(2000);
      continue;
    }
    break;
  }

  if (saveError) {
    console.error("[Settings] site_settings save failed after retries:", saveError);
    redirect(`/admin/settings?toast=${encodeURIComponent(`保存失败: ${saveError}`)}`);
  }

  for (const [key, value] of Object.entries(ctaTransformValues)) {
    await saveTextContent(serviceClient, key, String(value));
  }

  await saveTextContent(serviceClient, "cta_ticker_logo_media_ids", ctaTickerLogoMediaIds);

  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/works");
  redirect(`/admin/settings?toast=${encodeURIComponent("设置保存成功")}`);
}
