import { Search, X } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { MediaBatchClient, type MediaAssetRow } from "./MediaBatchClient";
import { UploadForm } from "./UploadForm";

// site_settings 中引用 media_assets 的列名
const SETTINGS_MEDIA_FIELDS = [
  "logo_media_id",
  "name_media_id",
  "avatar_media_id",
  "share_media_id",
  "cta_card_media_id",
  "cta_figure_media_id",
  "cta_figure_light_media_id",
  "cta_ticker_logo_media_id",
  "cta_center_logo_media_id",
  "hero_main_video_media_id",
  "hero_side1_video_media_id",
  "hero_side2_video_media_id",
  "hero_side3_video_media_id",
] as const;

// works 中引用 media_assets 的列名
const WORKS_MEDIA_FIELDS = [
  "cover_media_id",
  "hover_media_id",
  "representative_cover_media_id",
  "share_media_id",
] as const;

// text_content 中存储 media_id 后备值的 key 列表
const TEXT_MEDIA_KEYS = [
  ...SETTINGS_MEDIA_FIELDS,
  "cta_ticker_logo_media_ids",
] as unknown as string[];

/** 按 mime_type 归类到前台二级分类 */
function getCategoryFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    type?: string;
    sort?: string;
    toast?: string;
    id?: string;
    view?: "grid" | "list";
    scope?: string;
    category?: string;
  }>;
}) {
  const {
    search = "",
    type = "",
    sort = "newest",
    toast,
    id,
    scope = "all",
    category = "",
  } = await searchParams;

  // 迁移在 actions.ts 保存失败重试逻辑中处理，不在页面加载时执行
  // （每次访问都执行 DDL 迁移是性能瓶颈根源）
  const supabase = await createSupabaseServerClient();

  // 并行查询：媒体列表 + 作品引用的 media_id（前台）+ 设置引用的 media_id（后台）
  // 注意：只 select 已确定存在的列，避免 content_hash 列尚未迁移时整个查询失败
  let mediaQuery = supabase
    .from("media_assets")
    .select(
      "id,storage_key,mime_type,original_name,byte_size,alt_text,width,height,created_at",
    )
    .is("deleted_at", null);

  if (sort === "name") {
    mediaQuery = mediaQuery.order("original_name", { ascending: true });
  } else if (sort === "size") {
    mediaQuery = mediaQuery.order("byte_size", { ascending: false });
  } else if (sort === "oldest") {
    mediaQuery = mediaQuery.order("created_at", { ascending: true });
  } else {
    mediaQuery = mediaQuery.order("created_at", { ascending: false });
  }

  if (search) {
    mediaQuery = mediaQuery.ilike("original_name", `%${search}%`);
  }
  if (type === "image") {
    mediaQuery = mediaQuery.like("mime_type", "image/%");
  } else if (type === "video") {
    mediaQuery = mediaQuery.like("mime_type", "video/%");
  } else if (type === "other") {
    mediaQuery = mediaQuery
      .not("mime_type", "like", "image/%")
      .not("mime_type", "like", "video/%");
  }

  const [mediaResult, worksResult, settingsResult, textResult] = await Promise.all([
    mediaQuery,
    // 查询作品引用的 media_id（前台）
    supabase
      .from("works")
      .select(WORKS_MEDIA_FIELDS.join(","))
      .is("deleted_at", null),
    // 查询 site_settings 引用的 media_id（后台）
    supabase.from("site_settings").select("*").single(),
    // 查询 text_content 中 media_id 后备值（后台）
    supabase
      .from("text_content")
      .select("key,content")
      .in("key", TEXT_MEDIA_KEYS)
      .eq("is_active", true)
      .is("deleted_at", null),
  ]);

  const { data, error } = mediaResult;
  const allAssets = (data ?? []) as MediaAssetRow[];

  // 构建"前台" media_id 集合（被作品引用）
  const frontMediaIds = new Set<string>();
  for (const row of (worksResult.data ?? []) as unknown as Array<Record<string, string | null>>) {
    for (const field of WORKS_MEDIA_FIELDS) {
      const mid = row[field];
      if (mid) frontMediaIds.add(mid);
    }
  }

  // 构建"后台" media_id 集合（被 site_settings 引用，含 text_content 后备）
  const backMediaIds = new Set<string>();
  if (settingsResult.data) {
    const settingsRow = settingsResult.data as Record<string, unknown>;
    for (const field of SETTINGS_MEDIA_FIELDS) {
      const mid = settingsRow[field];
      if (typeof mid === "string" && mid) backMediaIds.add(mid);
    }
  }
  if (textResult.data) {
    for (const item of textResult.data as Array<{ key: string; content: string | null }>) {
      if (item.key === "cta_ticker_logo_media_ids") {
        // 逗号分隔的 media_id 列表
        const ids = String(item.content ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const mid of ids) backMediaIds.add(mid);
      } else {
        const val = String(item.content ?? "").trim();
        if (val) backMediaIds.add(val);
      }
    }
  }

  // 按 scope 筛选：front=仅前台，back=仅后台，all=全部
  let assets = allAssets;
  if (scope === "front") {
    assets = allAssets.filter((a) => frontMediaIds.has(a.id));
  } else if (scope === "back") {
    assets = allAssets.filter((a) => backMediaIds.has(a.id));
  }

  // 按 category 筛选（前台时生效）：png/jpg/gif/video/audio/pdf/other
  if (scope === "front" && category) {
    assets = assets.filter((a) => getCategoryFromMime(a.mime_type) === category);
  }

  const totalQuery = supabase
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  const { count: total } = await totalQuery;

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Media library
      </p>
      <h2 className="mt-2 text-2xl font-semibold">媒体库</h2>
      <p className="mt-1.5 text-xs text-white/48">
        上传图片、视频或 PDF，文件会进入 Supabase Storage 的 portfolio-media bucket。拖拽文件到页面任意位置即可上传。相同内容的文件自动去重，仅存储一份。
      </p>

      <UploadForm />

      <SearchBar search={search} type={type} sort={sort} scope={scope} category={category} />

      {error ? (
        <p className="mt-4 rounded-md border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-200">
          媒体读取失败：{error.message}
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-white/38">
            {assets.length} / {total ?? 0} 个文件
            {(search || type || scope !== "all" || category) ? "（已筛选）" : ""}
            {scope === "front" ? " · 前台媒体" : ""}
            {scope === "back" ? " · 后台媒体" : ""}
          </p>
          <MediaBatchClient assets={assets} toast={toast} savedId={id} />
        </>
      )}
    </div>
  );
}

function SearchBar({
  search,
  type,
  sort,
  scope,
  category,
}: {
  search: string;
  type: string;
  sort: string;
  scope: string;
  category: string;
}) {
  const inputH = "h-9";
  return (
    <form className="mt-4 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-0 max-w-xs">
        <Search
          aria-hidden="true"
          className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30"
        />
        <input
          name="search"
          defaultValue={search}
          placeholder="搜索文件名……"
          className={`${inputH} w-full rounded-md border border-white/10 bg-black/20 pl-8 pr-2.5 text-xs outline-none focus:border-cyan`}
        />
      </div>
      <select
        name="scope"
        defaultValue={scope}
        className={`${inputH} rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan`}
      >
        <option value="all">全部范围</option>
        <option value="front">前台媒体</option>
        <option value="back">后台媒体</option>
      </select>
      <select
        name="type"
        defaultValue={type}
        className={`${inputH} rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan`}
      >
        <option value="">全部类型</option>
        <option value="image">图片</option>
        <option value="video">视频</option>
        <option value="other">其他</option>
      </select>
      {scope === "front" ? (
        <select
          name="category"
          defaultValue={category}
          className={`${inputH} rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan`}
        >
          <option value="">全部分类</option>
          <option value="png">PNG 图片</option>
          <option value="jpg">JPG 图片</option>
          <option value="gif">GIF 动图</option>
          <option value="video">视频</option>
          <option value="audio">音频</option>
          <option value="pdf">PDF</option>
          <option value="other">其他</option>
        </select>
      ) : null}
      <select
        name="sort"
        defaultValue={sort}
        className={`${inputH} rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan`}
      >
        <option value="newest">最新优先</option>
        <option value="oldest">最早优先</option>
        <option value="name">名称 A-Z</option>
        <option value="size">大小 ↓</option>
      </select>
      <button className={`inline-flex ${inputH} items-center gap-1.5 rounded-md border border-cyan/35 px-3 text-xs text-cyan transition hover:bg-cyan/10`}>
        筛选
      </button>
      {(search || type || sort !== "newest" || scope !== "all" || category) ? (
        <a
          href="/admin/media"
          className={`inline-flex ${inputH} items-center gap-1 rounded-md px-2 text-xs text-white/45 transition hover:text-white`}
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
          清除
        </a>
      ) : null}
    </form>
  );
}

