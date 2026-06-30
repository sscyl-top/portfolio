import { Save, Search, Trash2, X, Film, FileText } from "lucide-react";

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
  searchParams: Promise<{ search?: string; type?: string; sort?: string; toast?: string; id?: string; view?: "grid" | "list" }>;
}) {
  const { search = "", type = "", sort = "newest", toast, id } = await searchParams;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("media_assets")
    .select(
      "id,storage_key,mime_type,original_name,byte_size,alt_text,width,height,created_at",
    )
    .is("deleted_at", null);

  if (sort === "name") {
    query = query.order("original_name", { ascending: true });
  } else if (sort === "size") {
    query = query.order("byte_size", { ascending: false });
  } else if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else {
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
      <h2 className="mt-2 text-2xl font-semibold">媒体库</h2>
      <p className="mt-1.5 text-xs text-white/48">
        上传图片、视频或 PDF，文件会进入 Supabase Storage 的 portfolio-media bucket。拖拽文件到页面任意位置即可上传。
      </p>

      <UploadForm />

      <SearchBar search={search} type={type} sort={sort} />

      {error ? (
        <p className="mt-4 rounded-md border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-200">
          媒体读取失败：{error.message}
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-white/38">
            {assets.length} / {total ?? 0} 个文件
            {(search || type) ? "（已筛选）" : ""}
          </p>
          <MediaGrid assets={assets} toast={toast} savedId={id} />
        </>
      )}
    </div>
  );
}

function SearchBar({ search, type, sort }: { search: string; type: string; sort: string }) {
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
        name="type"
        defaultValue={type}
        className={`${inputH} rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan`}
      >
        <option value="">全部类型</option>
        <option value="image">图片</option>
        <option value="video">视频</option>
        <option value="other">其他</option>
      </select>
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
      {(search || type || sort !== "newest") ? (
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

function MediaGrid({
  assets,
  toast,
  savedId,
}: {
  assets: MediaAssetRow[];
  toast?: string;
  savedId?: string;
}) {
  if (assets.length === 0) {
    return (
      <div className="mt-4 grid min-h-48 place-items-center rounded-lg border border-white/10 text-sm text-white/38">
        暂无媒体文件。
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <MediaCard key={asset.id} asset={asset} saved={toast === "alt-saved" && savedId === asset.id} />
      ))}
    </div>
  );
}

function MediaCard({ asset, saved }: { asset: MediaAssetRow; saved?: boolean }) {
  const isImage = asset.mime_type.startsWith("image/");
  const isVideo = asset.mime_type.startsWith("video/");
  const publicUrl = buildPublicMediaUrl(asset.storage_key);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="relative aspect-square w-full overflow-hidden bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#222_0%_50%)] bg-[length:10px_10px]">
        <MediaThumb publicUrl={publicUrl} isImage={isImage} isVideo={isVideo} alt={asset.alt_text || asset.original_name} />
        <form action={deleteMediaAsset} className="absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100">
          <input type="hidden" name="id" value={asset.id} />
          <button
            type="submit"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-red-200/90 backdrop-blur-sm transition hover:bg-red-500/80 hover:text-white"
            title="删除"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </form>
        {saved ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-green-400/90 px-1.5 py-0.5 text-[10px] font-medium text-black">
            已保存
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 p-2.5">
        <p className="truncate text-xs font-medium text-white/85" title={asset.original_name}>
          {asset.original_name}
        </p>
        <p className="font-mono text-[10px] text-white/35">
          {isImage ? "IMG" : isVideo ? "VID" : "FILE"}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
          {" · "}
          {formatBytes(asset.byte_size)}
        </p>

        <form id={`alt-${asset.id}`} action={updateMediaAltText} className="mt-0.5 flex items-center gap-1">
          <input type="hidden" name="id" value={asset.id} />
          <input
            name="alt_text"
            defaultValue={asset.alt_text}
            maxLength={500}
            placeholder="Alt 文本"
            className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-black/25 px-2 text-[11px] outline-none focus:border-cyan"
          />
          <SaveButton
            variant="cyan"
            size="sm"
            saved={saved}
            form={`alt-${asset.id}`}
            className="h-7 shrink-0 rounded border-cyan/30 px-1.5 text-[10px] text-cyan hover:bg-cyan/10"
          >
            <Save aria-hidden="true" className="h-3 w-3" />
          </SaveButton>
        </form>
      </div>
    </article>
  );
}

function MediaThumb({
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
        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
      />
    );
  }

  if (isVideo) {
    return (
      <>
        <video
          src={publicUrl}
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 grid place-items-center bg-black/30">
          <Film className="h-7 w-7 text-white/80" />
        </div>
      </>
    );
  }

  return (
    <div className="grid h-full w-full place-items-center text-white/30">
      <FileText className="h-8 w-8" />
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
