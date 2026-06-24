import QRCode from "qrcode";

import { siteSettings } from "@/data/portfolio";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { SettingsMediaField } from "@/components/admin/SettingsMediaField";
import { saveSiteSettings } from "./actions";

type SettingsRow = {
  name: string;
  nickname: string;
  default_theme: "dark" | "light" | "system";
  font_preset: string;
  seo_title: string;
  seo_description: string;
  logo_media_id: string | null;
  avatar_media_id: string | null;
  share_media_id: string | null;
  cta_card_media_id: string | null;
  cta_figure_media_id: string | null;
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

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: rawMedia }] = await Promise.all([
    supabase
      .from("site_settings")
      .select(
        "name,nickname,default_theme,font_preset,seo_title,seo_description,logo_media_id,avatar_media_id,share_media_id,cta_card_media_id,cta_figure_media_id,social_links",
      )
      .single(),
    supabase
      .from("media_assets")
      .select("id,storage_key,mime_type,original_name,alt_text")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  const mediaAssets = (rawMedia ?? []) as MediaAssetRow[];
  const fallback: SettingsRow = {
    name: siteSettings.name,
    nickname: siteSettings.logo,
    default_theme: "dark",
    font_preset: "default",
    seo_title: `${siteSettings.name} | ${siteSettings.title}`,
    seo_description: siteSettings.description,
    logo_media_id: null,
    avatar_media_id: null,
    share_media_id: null,
    cta_card_media_id: null,
    cta_figure_media_id: null,
    social_links: siteSettings.socialLinks.map((link) => ({
      label: link.label,
      url: link.href,
    })),
  };
  const settings = (data as SettingsRow | null) ?? fallback;
  const socialLinks =
    settings.social_links.length > 0
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
      <h2 className="mt-3 text-3xl font-semibold">网站设置</h2>
      <p className="mt-3 text-sm text-white/48">
        控制站点名称、SEO 和全局社交链接；这些内容会用于前台头部和页面元信息。
      </p>

      {error && error.code !== "PGRST116" ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          设置读取失败：{error.message}
        </p>
      ) : null}

      <form
        action={saveSiteSettings}
        className="mt-6 grid gap-5 rounded-md border border-white/10 bg-white/[0.035] p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="站点名称" name="name" defaultValue={settings.name} />
          <Field
            label="简称"
            name="nickname"
            defaultValue={settings.nickname}
          />
          <label className="grid gap-2 text-sm">
            <span className="text-white/58">默认主题</span>
            <select
              name="default_theme"
              defaultValue={settings.default_theme}
              className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
            >
              <option value="dark">深色</option>
              <option value="light">浅色</option>
              <option value="system">跟随系统</option>
            </select>
          </label>
          <Field
            label="字体预设"
            name="font_preset"
            defaultValue={settings.font_preset}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SettingsMediaField
            label="站点 Logo"
            name="logo_media_id"
            assets={mediaAssets}
            defaultValue={settings.logo_media_id ?? ""}
            hint="导航栏左侧图标，支持 PNG/JPG/GIF/WEBP/SVG"
          />
          <SettingsMediaField
            label="头像（导航栏右侧）"
            name="avatar_media_id"
            assets={mediaAssets}
            defaultValue={settings.avatar_media_id ?? ""}
            circular
            hint="导航栏右侧圆形头像，点击进入后台/简历，支持 PNG/JPG/GIF/WEBP/SVG"
          />
          <SettingsMediaField
            label="分享缩略图"
            name="share_media_id"
            assets={mediaAssets}
            defaultValue={settings.share_media_id ?? ""}
            hint="社交分享卡片缩略图，建议 1200×630"
          />
        </div>

        <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-medium text-white/70">作品终场图片（复合设计板块底部CTA区域）</h3>
          <p className="mt-1 text-xs text-white/40">两张不同层级的图片：背景卡在下层，人物图在上层叠加。支持 PNG 透明底 / JPG / GIF 动图 / WEBP。</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SettingsMediaField
              label="终场背景卡（下层）"
              name="cta_card_media_id"
              assets={mediaAssets}
              defaultValue={settings.cta_card_media_id ?? ""}
              hint="底层卡片/背景图，建议带透明或半透明设计"
            />
            <SettingsMediaField
              label="终场人物图（上层）"
              name="cta_figure_media_id"
              assets={mediaAssets}
              defaultValue={settings.cta_figure_media_id ?? ""}
              hint="上层人物/主体图，建议 PNG 透明底"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="SEO 标题"
            name="seo_title"
            defaultValue={settings.seo_title}
          />
          <Field
            label="SEO 描述"
            name="seo_description"
            defaultValue={settings.seo_description}
          />
        </div>

        <section className="rounded-md border border-white/10 bg-black/20 p-4">
          <h3 className="text-sm font-medium text-white/80">分享卡片预览</h3>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            {shareImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shareImageUrl}
                alt="分享缩略图"
                className="h-24 w-40 rounded-md border border-white/10 object-cover"
              />
            ) : (
              <span className="grid h-24 w-40 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
                未选择分享图
              </span>
            )}
            <div className="flex-1">
              <p className="text-base font-semibold text-white">
                {settings.name}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-white/58">
                {settings.seo_description || settings.seo_title}
              </p>
              <p className="mt-2 break-all font-mono text-[10px] text-white/34">
                {shareImageUrl ?? "无分享图 URL"}
              </p>
            </div>
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="站点二维码"
                className="h-28 w-28 rounded-md border border-white/10"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-white/80">社交链接</h3>
          <div className="mt-3 grid gap-3">
            {socialLinks.concat([{ label: "", url: "" }]).map((link, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[0.45fr_1fr]">
                <input
                  name="social_label"
                  defaultValue={link.label}
                  placeholder="名称"
                  className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
                />
                <input
                  name="social_url"
                  defaultValue={link.url}
                  placeholder="https://..."
                  className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button className="min-h-10 rounded-md bg-cyan px-5 text-sm font-medium text-black transition hover:bg-white">
            保存设置
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required
        className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
    </label>
  );
}
