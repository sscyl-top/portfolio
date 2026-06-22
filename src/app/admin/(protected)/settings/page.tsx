import { siteSettings } from "@/data/portfolio";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { buildPublicMediaUrl } from "@/lib/cms/media-url";
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
  social_links: Array<{ label: string; url: string }>;
};

type MediaAssetRow = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  alt_text: string;
};

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: rawMedia }] = await Promise.all([
    supabase
      .from("site_settings")
      .select(
        "name,nickname,default_theme,font_preset,seo_title,seo_description,logo_media_id,avatar_media_id,social_links",
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

        <div className="grid gap-4 md:grid-cols-2">
          <MediaSelectField
            label="站点 Logo"
            name="logo_media_id"
            assets={mediaAssets}
            defaultValue={settings.logo_media_id ?? ""}
          />
          <MediaSelectField
            label="头像"
            name="avatar_media_id"
            assets={mediaAssets}
            defaultValue={settings.avatar_media_id ?? ""}
          />
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


function MediaSelectField({
  assets,
  defaultValue,
  label,
  name,
}: {
  assets: MediaAssetRow[];
  defaultValue: string;
  label: string;
  name: string;
}) {
  const selected = assets.find((a) => a.id === defaultValue);

  return (
    <label className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>
      {selected ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={buildPublicMediaUrl(selected.storage_key)}
          alt={selected.alt_text || selected.original_name}
          className="h-16 w-full rounded-md border border-white/10 object-contain"
        />
      ) : (
        <span className="grid h-16 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
          未选择
        </span>
      )}
      <select
        name={name}
        defaultValue={defaultValue}
        className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      >
        <option value="">未选择</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.original_name}
          </option>
        ))}
      </select>
    </label>
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
