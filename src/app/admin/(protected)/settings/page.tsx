import QRCode from "qrcode";

import { siteSettings } from "@/data/portfolio";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { runHeroVideosMigration, runCtaTransformMigration, runCenterLogoMigration, runNameMediaMigration, runCtaFigureLightMigration } from "@/lib/cms/migrations";
import { SettingsMediaField } from "@/components/admin/SettingsMediaField";
import { SettingsVideoField } from "@/components/admin/SettingsVideoField";
import { TickerLogosField } from "@/components/admin/TickerLogosField";
import { SaveButton } from "@/components/admin/SaveButton";
import { saveSiteSettings } from "./actions";

type SettingsRow = {
  name: string;
  nickname: string;
  default_theme: "dark" | "light" | "system";
  font_preset: string;
  seo_title: string;
  seo_description: string;
  logo_media_id: string | null;
  name_media_id: string | null;
  avatar_media_id: string | null;
  share_media_id: string | null;
  cta_card_media_id: string | null;
  cta_figure_media_id: string | null;
  cta_figure_light_media_id: string | null;
  cta_ticker_logo_media_id: string | null;
  cta_center_logo_media_id: string | null;
  cta_ticker_logo_media_ids: string;
  cta_card_scale: number;
  cta_card_offset_x: number;
  cta_card_offset_y: number;
  cta_figure_scale: number;
  cta_figure_offset_x: number;
  cta_figure_offset_y: number;
  cta_ticker_logo_scale: number;
  cta_ticker_logo_offset_x: number;
  cta_ticker_logo_offset_y: number;
  cta_center_logo_scale: number;
  cta_center_logo_offset_x: number;
  cta_center_logo_offset_y: number;
  hero_main_video_media_id: string | null;
  hero_side1_video_media_id: string | null;
  hero_side2_video_media_id: string | null;
  hero_side3_video_media_id: string | null;
  social_links: Array<{ label: string; url: string }>;
};

type MediaAssetRow = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  alt_text: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sscyl.top";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ toast?: string }> }) {
  const { toast } = await searchParams;
  const serviceSupabase = createSupabaseServiceClient();

  await runHeroVideosMigration().catch(() => {});
  await runCtaTransformMigration().catch(() => {});
  await runCenterLogoMigration().catch(() => {});
  await runNameMediaMigration().catch(() => {});
  await runCtaFigureLightMigration().catch(() => {});

  await new Promise(resolve => setTimeout(resolve, 1500));

  const SETTINGS_TEXT_KEYS = [
    "cta_card_scale",
    "cta_card_offset_x",
    "cta_card_offset_y",
    "cta_figure_scale",
    "cta_figure_offset_x",
    "cta_figure_offset_y",
    "cta_ticker_logo_scale",
    "cta_ticker_logo_offset_x",
    "cta_ticker_logo_offset_y",
    "cta_ticker_logo_media_ids",
    "cta_center_logo_scale",
    "cta_center_logo_offset_x",
    "cta_center_logo_offset_y",
    "cta_figure_light_media_id",
  ] as const;

  let data: SettingsRow | null = null;

  try {
    const { data: baseData, error } = await serviceSupabase
      .from("site_settings")
      .select("*")
      .single();

    if (!error && baseData) {
      const row = baseData as Record<string, unknown>;
      const heroIds = {
        hero_main_video_media_id: (row.hero_main_video_media_id as string | null) ?? null,
        hero_side1_video_media_id: (row.hero_side1_video_media_id as string | null) ?? null,
        hero_side2_video_media_id: (row.hero_side2_video_media_id as string | null) ?? null,
        hero_side3_video_media_id: (row.hero_side3_video_media_id as string | null) ?? null,
      };
      const ctaCenterLogoId = (row.cta_center_logo_media_id as string | null) ?? null;

      const ctaTransform = {
        cta_card_scale: 1,
        cta_card_offset_x: 0,
        cta_card_offset_y: 0,
        cta_figure_scale: 1,
        cta_figure_offset_x: 0,
        cta_figure_offset_y: 0,
        cta_ticker_logo_scale: 1,
        cta_ticker_logo_offset_x: 0,
        cta_ticker_logo_offset_y: 0,
        cta_center_logo_scale: 1,
        cta_center_logo_offset_x: 0,
        cta_center_logo_offset_y: 0,
      };
      let tickerLogoIdsRaw = "";
      let figureLightMediaIdFallback: string | null = null;

      {
        const { data: textData, error: textErr } = await serviceSupabase
          .from("text_content")
          .select("key,content")
          .in("key", SETTINGS_TEXT_KEYS as unknown as string[])
          .eq("is_active", true)
          .is("deleted_at", null);
        if (!textErr && textData) {
          for (const item of textData) {
            if (item.key === "cta_ticker_logo_media_ids") {
              tickerLogoIdsRaw = item.content ?? "";
            } else if (item.key === "cta_figure_light_media_id") {
              const val = (item.content ?? "").trim();
              figureLightMediaIdFallback = val.length > 0 ? val : null;
            } else {
              const num = Number(item.content);
              if (!isNaN(num)) {
                (ctaTransform as Record<string, number>)[item.key] = num;
              }
            }
          }
        }
      }

      data = {
        name: (row.name as string) ?? "",
        nickname: (row.nickname as string) ?? "",
        default_theme: ((row.default_theme as string) ?? "dark") as SettingsRow["default_theme"],
        font_preset: (row.font_preset as string) ?? "default",
        seo_title: (row.seo_title as string) ?? "",
        seo_description: (row.seo_description as string) ?? "",
        logo_media_id: (row.logo_media_id as string | null) ?? null,
        name_media_id: (row.name_media_id as string | null) ?? null,
        avatar_media_id: (row.avatar_media_id as string | null) ?? null,
        share_media_id: (row.share_media_id as string | null) ?? null,
        cta_card_media_id: (row.cta_card_media_id as string | null) ?? null,
        cta_figure_media_id: (row.cta_figure_media_id as string | null) ?? null,
        cta_figure_light_media_id: (row.cta_figure_light_media_id as string | null) ?? figureLightMediaIdFallback,
        cta_ticker_logo_media_id: (row.cta_ticker_logo_media_id as string | null) ?? null,
        cta_center_logo_media_id: ctaCenterLogoId,
        cta_ticker_logo_media_ids: tickerLogoIdsRaw,
        ...ctaTransform,
        ...heroIds,
        social_links: (row.social_links as SettingsRow["social_links"]) ?? [],
      } as SettingsRow;
    }
  } catch (err) {
    console.error("[Admin Settings] Failed to fetch settings:", err);
  }

  const { data: rawMedia } = await serviceSupabase
    .from("media_assets")
    .select("id,storage_key,mime_type,original_name,alt_text")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const mediaAssets = (rawMedia ?? []) as MediaAssetRow[];
  const fallback: SettingsRow = {
    name: siteSettings.name,
    nickname: siteSettings.logo,
    default_theme: "dark",
    font_preset: "default",
    seo_title: `${siteSettings.name} | ${siteSettings.title}`,
    seo_description: siteSettings.description,
    logo_media_id: null,
    name_media_id: null,
    avatar_media_id: null,
    share_media_id: null,
    cta_card_media_id: null,
    cta_figure_media_id: null,
    cta_figure_light_media_id: null,
    cta_ticker_logo_media_id: null,
    cta_center_logo_media_id: null,
    cta_ticker_logo_media_ids: "",
    cta_card_scale: 1,
    cta_card_offset_x: 0,
    cta_card_offset_y: 0,
    cta_figure_scale: 1,
    cta_figure_offset_x: 0,
    cta_figure_offset_y: 0,
    cta_ticker_logo_scale: 1,
    cta_ticker_logo_offset_x: 0,
    cta_ticker_logo_offset_y: 0,
    cta_center_logo_scale: 1,
    cta_center_logo_offset_x: 0,
    cta_center_logo_offset_y: 0,
    hero_main_video_media_id: null,
    hero_side1_video_media_id: null,
    hero_side2_video_media_id: null,
    hero_side3_video_media_id: null,
    social_links: siteSettings.socialLinks.map((link: { label: string; href: string }) => ({
      label: link.label,
      url: link.href,
    })),
  } satisfies SettingsRow;

  const settings = data ?? fallback;
  const socialLinks =
    settings.social_links && settings.social_links.length > 0
      ? settings.social_links
      : [{ label: "", url: "" }];

  const shareAsset = mediaAssets.find((a) => a.id === settings.share_media_id);
  const shareImageUrl = shareAsset
    ? buildPublicMediaUrl(shareAsset.storage_key)
    : undefined;
  const qrDataUrl = await QRCode.toDataURL(BASE_URL, {
    width: 128,
    margin: 2,
    color: {
      dark: "#ffffff",
      light: "#050505",
    },
  });

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Site settings
      </p>
      <h2 className="mt-2 text-2xl font-semibold">网站设置</h2>
      <p className="mt-1.5 text-xs text-white/48">
        控制站点名称、SEO 和全局社交链接；这些内容会用于前台头部和页面元信息。
      </p>

      <form
        action={saveSiteSettings}
        className="mt-5 grid gap-4 rounded-lg border border-white/10 bg-white/[0.025] p-4"
      >
        <SectionHeader title="基础信息" desc="站点名称、主题、字体等显示在前台头部的核心信息。" />
        <div className="grid gap-3 md:grid-cols-[1.1fr_1fr]">
          <SettingsMediaField
            label="站点名称图片（可选）"
            name="name_media_id"
            assets={mediaAssets}
            defaultValue={settings.name_media_id ?? ""}
            hint="导航栏左侧名称图片，上传后替换文字显示"
          />
          <div className="grid gap-3 md:grid-cols-2 content-start">
            <Field label="站点名称" name="name" defaultValue={settings.name} />
            <Field label="简称" name="nickname" defaultValue={settings.nickname} short />
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-white/58">默认主题</span>
              <select
                name="default_theme"
                defaultValue={settings.default_theme}
                className="h-9 w-full rounded-md border border-white/10 bg-black/20 px-2.5 text-sm outline-none focus:border-cyan"
              >
                <option value="dark">深色</option>
                <option value="light">浅色</option>
              </select>
            </label>
            <Field label="字体预设" name="font_preset" defaultValue={settings.font_preset} short />
          </div>
        </div>

        <SectionDivider />

        <SectionHeader title="图标与分享图" desc="导航栏 Logo、头像和社交分享缩略图。" />
        <div className="grid gap-3 md:grid-cols-3">
          <SettingsMediaField
            label="站点 Logo"
            name="logo_media_id"
            assets={mediaAssets}
            defaultValue={settings.logo_media_id ?? ""}
            hint="导航栏左侧图标"
          />
          <SettingsMediaField
            label="头像（导航栏右侧）"
            name="avatar_media_id"
            assets={mediaAssets}
            defaultValue={settings.avatar_media_id ?? ""}
            circular
            hint="导航栏右侧圆形头像"
          />
          <SettingsMediaField
            label="分享缩略图"
            name="share_media_id"
            assets={mediaAssets}
            defaultValue={settings.share_media_id ?? ""}
            hint="社交分享卡片，建议 1200×630"
          />
        </div>

        <SectionDivider />

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <SectionHeader
            title="作品终场图片"
            desc="复合设计板块底部 CTA 区域：背景卡在下、人物图在上叠加；人物图支持深色/浅色模式分别上传，浅色不上传复用深色。"
            noMargin
          />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <SettingsMediaField
                label="终场背景卡（下层）"
                name="cta_card_media_id"
                assets={mediaAssets}
                defaultValue={settings.cta_card_media_id ?? ""}
                hint="底层卡片/背景图"
              />
              <div className="flex items-end gap-1.5">
                <NumberField label="缩放" name="cta_card_scale" defaultValue={settings.cta_card_scale} step="0.05" min="0.1" max="5" />
                <NumberField label="X" name="cta_card_offset_x" defaultValue={settings.cta_card_offset_x} step="1" min="-500" max="500" />
                <NumberField label="Y" name="cta_card_offset_y" defaultValue={settings.cta_card_offset_y} step="1" min="-500" max="500" />
              </div>
            </div>
            <div className="grid gap-2">
              <SettingsMediaField
                label="人物图 · 深色"
                name="cta_figure_media_id"
                assets={mediaAssets}
                defaultValue={settings.cta_figure_media_id ?? ""}
                hint="深色模式上层人物，PNG 透明底"
              />
              <div className="flex items-end gap-1.5">
                <NumberField label="缩放" name="cta_figure_scale" defaultValue={settings.cta_figure_scale} step="0.05" min="0.1" max="5" />
                <NumberField label="X" name="cta_figure_offset_x" defaultValue={settings.cta_figure_offset_x} step="1" min="-500" max="500" />
                <NumberField label="Y" name="cta_figure_offset_y" defaultValue={settings.cta_figure_offset_y} step="1" min="-500" max="500" />
              </div>
            </div>
            <div className="grid gap-2 content-start">
              <SettingsMediaField
                label="人物图 · 浅色"
                name="cta_figure_light_media_id"
                assets={mediaAssets}
                defaultValue={settings.cta_figure_light_media_id ?? ""}
                hint="浅色模式人物，不上传复用深色"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <TickerLogosField
              label="终场滚动条幅图"
              name="cta_ticker_logo_media_ids"
              assets={mediaAssets}
              defaultValue={settings.cta_ticker_logo_media_ids ?? ""}
              hint="横向滚动条幅中重复出现的 logo/图案，建议 PNG 透明底，可多选"
            />
            <div className="flex items-end gap-1.5">
              <NumberField label="缩放" name="cta_ticker_logo_scale" defaultValue={settings.cta_ticker_logo_scale} step="0.05" min="0.1" max="5" />
              <NumberField label="X" name="cta_ticker_logo_offset_x" defaultValue={settings.cta_ticker_logo_offset_x} step="1" min="-500" max="500" />
              <NumberField label="Y" name="cta_ticker_logo_offset_y" defaultValue={settings.cta_ticker_logo_offset_y} step="1" min="-500" max="500" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.3fr)_1fr]">
            <SettingsMediaField
              label="终场中心 Logo"
              name="cta_center_logo_media_id"
              assets={mediaAssets}
              defaultValue={settings.cta_center_logo_media_id ?? ""}
              hint="居中显示的大 Logo，替换默认「无限进步」"
            />
            <div className="grid content-start gap-2">
              <p className="text-[11px] font-medium text-white/50">位置调整</p>
              <div className="flex items-end gap-1.5">
                <NumberField label="缩放" name="cta_center_logo_scale" defaultValue={settings.cta_center_logo_scale} step="0.01" min="0.1" max="3" />
                <NumberField label="X" name="cta_center_logo_offset_x" defaultValue={settings.cta_center_logo_offset_x} step="1" min="-200" max="200" />
                <NumberField label="Y" name="cta_center_logo_offset_y" defaultValue={settings.cta_center_logo_offset_y} step="1" min="-200" max="200" />
              </div>
              <p className="text-[10px] leading-tight text-white/30">X/Y 为相对中心的偏移量，单位像素</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <SectionHeader
            title="首页 Hero 视频"
            desc="第一屏 4 个卡片的背景视频。支持拖拽上传或从媒体库选择，MP4/WEBM/OGG/MOV。不上传显示渐变占位色。"
            noMargin
          />
          <div className="mt-4 grid gap-3">
            <SettingsVideoField
              label="主卡片视频（大卡片 · 16:9）"
              name="hero_main_video_media_id"
              assets={mediaAssets}
              defaultValue={settings.hero_main_video_media_id ?? ""}
              hint="大卡片背景视频，第一屏最显眼的位置"
              aspectRatio="video"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <SettingsVideoField
                label="小卡片 1 · 左上（1:1）"
                name="hero_side1_video_media_id"
                assets={mediaAssets}
                defaultValue={settings.hero_side1_video_media_id ?? ""}
                hint="左上浮动小卡片"
                aspectRatio="square"
              />
              <SettingsVideoField
                label="小卡片 2 · 左侧（1:1）"
                name="hero_side2_video_media_id"
                assets={mediaAssets}
                defaultValue={settings.hero_side2_video_media_id ?? ""}
                hint="左侧浮动小卡片"
                aspectRatio="square"
              />
            </div>
            <SettingsVideoField
              label="小卡片 3 · 右下宽卡（2:1）"
              name="hero_side3_video_media_id"
              assets={mediaAssets}
              defaultValue={settings.hero_side3_video_media_id ?? ""}
              hint="右下浮动宽卡片"
              aspectRatio="wide"
            />
          </div>
        </div>

        <SectionDivider />

        <SectionHeader title="SEO 与社交" desc="页面元信息和社交链接。" />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="SEO 标题" name="seo_title" defaultValue={settings.seo_title} />
          <Field label="SEO 描述" name="seo_description" defaultValue={settings.seo_description} />
        </div>

        <section className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">分享卡片预览</h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            {shareImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shareImageUrl}
                alt="分享缩略图"
                className="h-20 w-36 rounded-md border border-white/10 object-cover"
              />
            ) : (
              <span className="grid h-20 w-36 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
                未选择分享图
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {settings.name}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-white/58">
                {settings.seo_description || settings.seo_title}
              </p>
              <p className="mt-1.5 break-all font-mono text-[10px] text-white/34">
                {shareImageUrl ?? "无分享图 URL"}
              </p>
            </div>
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="站点二维码"
                className="h-24 w-24 rounded-md border border-white/10"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">社交链接</h3>
          <div className="mt-3 grid gap-2">
            {socialLinks.concat([{ label: "", url: "" }]).map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  name="social_label"
                  defaultValue={link.label}
                  placeholder="名称"
                  className="h-9 w-28 shrink-0 rounded-md border border-white/10 bg-black/20 px-2.5 text-sm outline-none focus:border-cyan"
                />
                <input
                  name="social_url"
                  defaultValue={link.url}
                  placeholder="https://..."
                  className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-sm outline-none focus:border-cyan"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-end gap-2 pt-1">
          <SaveButton saved={toast === "设置保存成功"}>保存设置</SaveButton>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  short = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  short?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-white/58">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required
        className={`${short ? "" : ""} h-9 w-full rounded-md border border-white/10 bg-black/20 px-2.5 text-sm outline-none focus:border-cyan`}
      />
    </label>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
  step = "1",
  min,
  max,
}: {
  label: string;
  name: string;
  defaultValue: number;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-medium text-white/50">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        step={step}
        min={min}
        max={max}
        className="h-8 w-20 rounded-md border border-white/10 bg-black/30 px-2 text-sm text-white outline-none focus:border-cyan"
      />
    </label>
  );
}

function SectionHeader({
  title,
  desc,
  noMargin = false,
}: {
  title: string;
  desc?: string;
  noMargin?: boolean;
}) {
  return (
    <div className={noMargin ? "" : "mb-1"}>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white/85">{title}</h3>
      </div>
      {desc ? <p className="mt-0.5 text-[11px] leading-snug text-white/40">{desc}</p> : null}
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px w-full bg-white/8" />;
}
