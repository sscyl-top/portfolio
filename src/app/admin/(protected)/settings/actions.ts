"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { runHeroVideosMigration, runCtaTransformMigration, runCenterLogoMigration, runNameMediaMigration } from "@/lib/cms/migrations";

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

async function upsertTextContent(
  serviceClient: ReturnType<typeof createSupabaseServiceClient>,
  key: string,
  content: string,
) {
  const { data: existing, error: findErr } = await serviceClient
    .from("text_content")
    .select("id")
    .eq("key", key)
    .limit(1)
    .maybeSingle();

  if (findErr) {
    console.error(`[Settings] Failed to find text_content for ${key}:`, findErr.message);
    throw findErr;
  }

  if (existing?.id) {
    const { error: updErr } = await serviceClient
      .from("text_content")
      .update({
        content,
        page: "site_settings",
        section: "settings",
        is_active: true,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updErr) {
      console.error(`[Settings] Failed to update text_content ${key}:`, updErr.message);
      throw updErr;
    }
  } else {
    const { error: insErr } = await serviceClient.from("text_content").insert({
      key,
      content,
      page: "site_settings",
      section: "settings",
      sort_order: 0,
      is_active: true,
    });
    if (insErr) {
      console.error(`[Settings] Failed to insert text_content ${key}:`, insErr.message);
      throw insErr;
    }
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
  const cta_ticker_logo_scale = Number(formData.get("cta_ticker_logo_scale") ?? 1);
  const cta_ticker_logo_offset_x = Number(formData.get("cta_ticker_logo_offset_x") ?? 0);
  const cta_ticker_logo_offset_y = Number(formData.get("cta_ticker_logo_offset_y") ?? 0);
  const cta_center_logo_scale = Number(formData.get("cta_center_logo_scale") ?? 1);
  const cta_center_logo_offset_x = Number(formData.get("cta_center_logo_offset_x") ?? 0);
  const cta_center_logo_offset_y = Number(formData.get("cta_center_logo_offset_y") ?? 0);

  const tickerLogoIdsRaw = String(formData.get("cta_ticker_logo_media_ids") ?? "").trim();
  const ctaTickerLogoMediaIds = tickerLogoIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(",");

  await runHeroVideosMigration().catch(() => {});
  await runCtaTransformMigration().catch(() => {});
  await runCenterLogoMigration().catch(() => {});
  await runNameMediaMigration().catch(() => {});

  await wait(1500);

  const serviceClient = createSupabaseServiceClient();

  // 先查询数据库已有的列，避免 upsert 包含不存在的列导致失败
  const { data: existingRow } = await serviceClient
    .from("site_settings")
    .select("*")
    .single();
  const existingColumns = new Set(
    existingRow ? Object.keys(existingRow) : []
  );

  const saveData: Record<string, unknown> = {
    id: true,
    name: String(formData.get("name") ?? "").trim(),
    nickname: String(formData.get("nickname") ?? "").trim(),
    default_theme: formData.get("default_theme"),
    font_preset: String(formData.get("font_preset") ?? "default").trim(),
    seo_title: String(formData.get("seo_title") ?? "").trim(),
    seo_description: String(formData.get("seo_description") ?? "").trim(),
    social_links,
  };

  // 只保存数据库中实际存在的 media_id 列
  const mediaIdFields = [
    "logo_media_id",
    "name_media_id",
    "avatar_media_id",
    "share_media_id",
    "cta_card_media_id",
    "cta_figure_media_id",
    "cta_ticker_logo_media_id",
    "cta_center_logo_media_id",
    "hero_main_video_media_id",
    "hero_side1_video_media_id",
    "hero_side2_video_media_id",
    "hero_side3_video_media_id",
  ];
  for (const field of mediaIdFields) {
    if (existingColumns.has(field)) {
      saveData[field] = uuidOrNull(formData.get(field));
    }
  }

  const ctaTransformValues: Record<string, number> = {
    cta_card_scale: isNaN(cta_card_scale) ? 1 : Math.min(5, Math.max(0.1, cta_card_scale)),
    cta_card_offset_x: isNaN(cta_card_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_x)),
    cta_card_offset_y: isNaN(cta_card_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_y)),
    cta_figure_scale: isNaN(cta_figure_scale) ? 1 : Math.min(5, Math.max(0.1, cta_figure_scale)),
    cta_figure_offset_x: isNaN(cta_figure_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_x)),
    cta_figure_offset_y: isNaN(cta_figure_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_y)),
    cta_ticker_logo_scale: isNaN(cta_ticker_logo_scale) ? 1 : Math.min(5, Math.max(0.1, cta_ticker_logo_scale)),
    cta_ticker_logo_offset_x: isNaN(cta_ticker_logo_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_ticker_logo_offset_x)),
    cta_ticker_logo_offset_y: isNaN(cta_ticker_logo_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_ticker_logo_offset_y)),
    cta_center_logo_scale: isNaN(cta_center_logo_scale) ? 1 : Math.min(5, Math.max(0.1, cta_center_logo_scale)),
    cta_center_logo_offset_x: isNaN(cta_center_logo_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_center_logo_offset_x)),
    cta_center_logo_offset_y: isNaN(cta_center_logo_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_center_logo_offset_y)),
  };

  let saveError: string | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { error } = await serviceClient.from("site_settings").upsert(saveData, { onConflict: "id" });
    if (!error) {
      console.log(`[Settings] site_settings saved successfully (attempt ${attempt + 1})`);
      saveError = null;
      break;
    }
    saveError = error.message;
    console.warn(`[Settings] site_settings save attempt ${attempt + 1} failed:`, error.message);
    if (isSchemaCacheError(error.message) && attempt < 5) {
      await wait(2000);
      continue;
    }
    break;
  }

  if (saveError) {
    console.error("[Settings] site_settings save failed after retries:", saveError);
    redirect(`/admin/settings?toast=${encodeURIComponent(`保存失败: ${saveError}`)}`);
  }

  try {
    for (const [key, value] of Object.entries(ctaTransformValues)) {
      await upsertTextContent(serviceClient, key, String(value));
    }

    await upsertTextContent(serviceClient, "cta_ticker_logo_media_ids", ctaTickerLogoMediaIds);
    console.log("[Settings] text_content saved successfully, tickerLogoIds:", ctaTickerLogoMediaIds);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Settings] text_content save failed:", errMsg);
    redirect(`/admin/settings?toast=${encodeURIComponent(`保存失败(text_content): ${errMsg}`)}`);
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/works");
  const timestamp = Date.now();
  redirect(`/admin/settings?toast=${encodeURIComponent("设置保存成功")}&t=${timestamp}&cache_bust=${Math.random().toString(36).substr(2, 9)}`);
}
