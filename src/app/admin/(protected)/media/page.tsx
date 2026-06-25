import { Save, Search, Trash2, X } from "lucide-react";

import { SaveButton } from "@/components/admin/SaveButton";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteMediaAsset, updateMediaAltText } from "./actions";
import { UploadForm } from "./UploadForm";

type MediaAssetRow = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  byte_size: number;
  alt_text: string;
  width: number | null;
  height: number | null;
  created_at: string;
};


export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; sort?: string; toast?: string; id?: string }>;
}) {
  const { search = "", type = "", sort = "newest", toast, id } = await searchParams;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("media_assets")
    .select(
      "id,storage_key,mime_type,original_name,byte_size,alt_text,width,height,created_at",
    )
    .is("deleted_at", null);

  // apply ordering
  if (sort === "name") {
    query = query.order("original_name", { ascending: true });
  } else if (sort === "size") {
    query = query.order("byte_size", { ascending: false });
  } else if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else {
    // default: newest first
    query = query.order("created_at", { ascending: false });
  }

  if (search) {
    query = query.ilike("original_name", `%${search}%`);
  }
  if (type === "image") {
    query = query.like("mime_type", "image/%");
  } else if (type === "video") {
    query = query.like("mime_type", "video/%");
  } else if (type === "other") {
    query = query.not("mime_type", "like", "image/%").not("mime_type", "like", "video/%");
  }

  const { data, error } = await query;
  const assets = (data ?? []) as MediaAssetRow[];
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
      <h2 className="mt-3 text-3xl font-semibold">媒体库</h2>
      <p className="mt-3 text-sm text-white/48">
        上传图片、视频或 PDF，文件会进入 Supabase Storage 的 portfolio-media
        bucket。
      </p>

      <UploadForm />

      <SearchBar search={search} type={type} sort={sort} />

      {error ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          媒体读取失败：{error.message}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-white/38">
            {assets.length} / {total ?? 0} 个文件
            {(search || type) ? "（已筛选）" : ""}
          </p>
          <MediaList assets={assets} search={search} type={type} toast={toast} savedId={id} />
        </>
      )}
    </div>
  );
}

function SearchBar({ search, type, sort }: { search: string; type: string; sort: string }) {
  return (
    <form className="mt-4 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-0 max-w-xs">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
        />
        <input
          name="search"
          defaultValue={search}
          placeholder="搜索文件名……"
          className="h-10 w-full rounded-md border border-white/10 bg-black/20 pl-10 pr-3 text-sm outline-none focus:border-cyan"
        />
      </div>
      <select
        name="type"
        defaultValue={type}
        className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      >
        <option value="">全部类型</option>
        <option value="image">图片</option>
        <option value="video">视频</option>
        <option value="other">其他</option>
      </select>
      <select
        name="sort"
        defaultValue={sort}
        className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      >
        <option value="newest">最新优先</option>
        <option value="oldest">最早优先</option>
        <option value="name">名称 A-Z</option>
        <option value="size">大小 ↓</option>
      </select>
      <button className="inline-flex h-10 items-center gap-1.5 rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
        筛选
      </button>
      {(search || type || sort !== "newest") ? (
        <a
          href="/admin/media"
          className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm text-white/45 transition hover:text-white"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          清除
        </a>
      ) : null}
    </form>
  );
}

function MediaList({
  assets,
  search,
  type,
  toast,
  savedId,
}: {
  assets: MediaAssetRow[];
  search: string;
  type: string;
  toast?: string;
  savedId?: string;
}) {
  if (assets.length === 0) {
    const hint =
      search || type ? "没有匹配的媒体文件。" : "暂无媒体文件。";
    return (
      <div className="mt-6 grid min-h-64 place-items-center border-y border-white/10 text-sm text-white/38">
        {hint}
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-3">
      {assets.map((asset) => (
        <MediaRow key={asset.id} asset={asset} saved={toast === "alt-saved" && savedId === asset.id} />
      ))}
    </div>
  );
}

function MediaRow({ asset, saved }: { asset: MediaAssetRow; saved?: boolean }) {
  const isImage = asset.mime_type.startsWith("image/");
  const isVideo = asset.mime_type.startsWith("video/");
  const publicUrl = buildPublicMediaUrl(asset.storage_key);

  return (
    <article className="grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[7rem_minmax(0,1fr)_auto]">
      <MediaPreview
        publicUrl={publicUrl}
        isImage={isImage}
        isVideo={isVideo}
        alt={asset.alt_text || asset.original_name}
      />

      <div className="min-w-0">
        <p className="truncate font-medium text-white">{asset.original_name}</p>
        <p className="mt-1 break-all font-mono text-xs text-white/34">
          {asset.storage_key}
        </p>
        <p className="mt-2 font-mono text-xs text-white/38">
          {asset.mime_type}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
          {" · "}
          {formatBytes(asset.byte_size)}
        </p>

        <form
          id={`alt-${asset.id}`}
          action={updateMediaAltText}
          className="mt-3 flex items-center gap-2"
        >
          <input type="hidden" name="id" value={asset.id} />
          <input
            name="alt_text"
            defaultValue={asset.alt_text}
            maxLength={500}
            placeholder="替代文本（用于无障碍与 SEO）"
            className="min-h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
          />
          <SaveButton
            variant="cyan"
            size="sm"
            saved={saved}
            className="min-h-9 shrink-0 border-cyan/30 px-3 text-xs text-cyan hover:bg-cyan/10"
          >
            <Save aria-hidden="true" className="h-3.5 w-3.5" />
            保存
          </SaveButton>
        </form>
      </div>

      <form action={deleteMediaAsset} className="md:self-start">
        <input type="hidden" name="id" value={asset.id} />
        <button
          type="submit"
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-300/25 px-3 text-xs text-red-200 transition hover:bg-red-300/10"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          删除
        </button>
      </form>
    </article>
  );
}

function MediaPreview({
  publicUrl,
  isImage,
  isVideo,
  alt,
}: {
  publicUrl: string;
  isImage: boolean;
  isVideo: boolean;
  alt: string;
}) {
  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={publicUrl}
        alt={alt}
        loading="lazy"
        className="size-28 rounded-md border border-white/10 object-cover"
      />
    );
  }

  if (isVideo) {
    return (
      <video
        src={publicUrl}
        muted
        playsInline
        className="size-28 rounded-md border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="grid size-28 place-items-center rounded-md border border-white/10 bg-black/30 font-mono text-[10px] uppercase text-white/40">
      file
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}