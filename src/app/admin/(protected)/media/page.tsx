import { Upload } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { uploadMediaAsset } from "./actions";

type MediaAssetRow = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  byte_size: number;
  alt_text: string;
  created_at: string;
};

export default async function AdminMediaPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("id,storage_key,mime_type,original_name,byte_size,alt_text,created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const assets = (data ?? []) as MediaAssetRow[];

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

      <form
        action={uploadMediaAsset}
        className="mt-6 grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <input
          name="file"
          type="file"
          required
          accept="image/*,video/*,application/pdf"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/62 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
        />
        <input
          name="alt_text"
          placeholder="替代文本"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
        />
        <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          <Upload aria-hidden="true" className="h-4 w-4" />
          上传
        </button>
      </form>

      {error ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          媒体读取失败：{error.message}
        </p>
      ) : (
        <MediaList assets={assets} />
      )}
    </div>
  );
}

function MediaList({ assets }: { assets: MediaAssetRow[] }) {
  if (assets.length === 0) {
    return (
      <div className="mt-6 grid min-h-64 place-items-center border-y border-white/10 text-sm text-white/38">
        暂无媒体文件。
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-3">
      {assets.map((asset) => (
        <article
          key={asset.id}
          className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm md:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="font-medium text-white">{asset.original_name}</p>
            <p className="mt-1 break-all font-mono text-xs text-white/34">
              {asset.storage_key}
            </p>
            <p className="mt-2 text-white/50">{asset.alt_text || "无替代文本"}</p>
          </div>
          <div className="font-mono text-xs text-white/38 md:text-right">
            <p>{asset.mime_type}</p>
            <p className="mt-1">{formatBytes(asset.byte_size)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
