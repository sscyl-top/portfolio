"use client";

import { useCallback, useState, useTransition } from "react";
import { Save, Trash2, Film, FileText, CheckSquare, Square, X } from "lucide-react";

import { SaveButton } from "@/components/admin/SaveButton";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

import { deleteMediaAsset, batchDeleteMediaAssets, updateMediaAltText } from "./actions";

export type MediaAssetRow = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  byte_size: number;
  alt_text: string;
  width: number | null;
  height: number | null;
  created_at: string;
  content_hash?: string | null;
};

type ServerAction = (formData: FormData) => Promise<void>;

export function MediaBatchClient({
  assets,
  toast,
  savedId,
}: {
  assets: MediaAssetRow[];
  toast?: string;
  savedId?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = assets.length > 0 && selected.size === assets.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === assets.length) return new Set();
      return new Set(assets.map((a) => a.id));
    });
  }, [assets]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const handleBatchDelete = useCallback(() => {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!window.confirm(`确认删除选中的 ${count} 个文件吗？（软删，可恢复）`)) return;
    const ids = Array.from(selected).join(",");
    const formData = new FormData();
    formData.set("ids", ids);
    startTransition(() => {
      batchDeleteMediaAssets(formData)
        .then(() => setSelected(new Set()))
        .catch((err) => {
          window.alert(`批量删除失败：${err?.message ?? err}`);
        });
    });
  }, [selected]);

  if (assets.length === 0) {
    return (
      <div className="mt-4 grid min-h-48 place-items-center rounded-lg border border-white/10 text-sm text-white/38">
        暂无媒体文件。
      </div>
    );
  }

  return (
    <>
      {/* 批量操作工具栏 */}
      <div className="sticky top-2 z-20 mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/60 px-2.5 py-1.5 backdrop-blur">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
          title={allSelected ? "取消全选" : "全选当前页"}
        >
          {allSelected ? (
            <CheckSquare aria-hidden="true" className="h-3.5 w-3.5 text-cyan" />
          ) : someSelected ? (
            <CheckSquare aria-hidden="true" className="h-3.5 w-3.5 text-cyan/60" />
          ) : (
            <Square aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {allSelected ? "取消全选" : "全选"}
        </button>

        {selected.size > 0 ? (
          <>
            <span className="text-xs text-cyan">
              已选 {selected.size} / {assets.length}
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs text-white/45 transition hover:text-white"
            >
              <X aria-hidden="true" className="h-3 w-3" />
              清除选择
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={pending}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-red-500/80 px-3 text-xs font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              title="批量软删选中文件"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              {pending ? "删除中…" : `批量删除（${selected.size}）`}
            </button>
          </>
        ) : (
          <span className="text-xs text-white/35">点击卡片左上角复选框选择多个文件</span>
        )}
      </div>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {assets.map((asset) => (
          <MediaCard
            key={asset.id}
            asset={asset}
            saved={toast === "alt-saved" && savedId === asset.id}
            selected={selected.has(asset.id)}
            onToggle={toggleOne}
            deleteAction={deleteMediaAsset}
          />
        ))}
      </div>
    </>
  );
}

function MediaCard({
  asset,
  saved,
  selected,
  onToggle,
  deleteAction,
}: {
  asset: MediaAssetRow;
  saved?: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  deleteAction: ServerAction;
}) {
  const isImage = asset.mime_type.startsWith("image/");
  const isVideo = asset.mime_type.startsWith("video/");
  const publicUrl = buildPublicMediaUrl(asset.storage_key);

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-lg border bg-white/[0.03] transition hover:bg-white/[0.05] ${
        selected
          ? "border-cyan/70 ring-1 ring-cyan/40"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#222_0%_50%)] bg-[length:10px_10px]">
        <MediaThumb
          publicUrl={publicUrl}
          isImage={isImage}
          isVideo={isVideo}
          alt={asset.alt_text || asset.original_name}
        />

        {/* 选择复选框 —— 始终可见，避免误操作 */}
        <label
          className="absolute left-1.5 top-1.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-black/60 backdrop-blur-sm transition hover:bg-black/80"
          title={selected ? "取消选择" : "选择"}
        >
          <input
            type="checkbox"
            className="peer sr-only"
            checked={selected}
            onChange={() => onToggle(asset.id)}
            aria-label={selected ? "取消选择" : "选择此文件"}
          />
          {selected ? (
            <CheckSquare aria-hidden="true" className="h-4 w-4 text-cyan" />
          ) : (
            <Square aria-hidden="true" className="h-4 w-4 text-white/55" />
          )}
        </label>

        {/* 单个删除按钮 —— hover 时显示，作为快捷方式 */}
        <form
          action={deleteAction}
          className="absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100"
        >
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
          <span className="absolute bottom-1.5 left-1.5 rounded bg-green-400/90 px-1.5 py-0.5 text-[10px] font-medium text-black">
            已保存
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 p-2.5">
        <p
          className="truncate text-xs font-medium text-white/85"
          title={asset.original_name}
        >
          {asset.original_name}
        </p>
        <p className="font-mono text-[10px] text-white/35">
          {isImage ? "IMG" : isVideo ? "VID" : "FILE"}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
          {" · "}
          {formatBytes(asset.byte_size)}
        </p>

        <form
          id={`alt-${asset.id}`}
          action={updateMediaAltText}
          className="mt-0.5 flex items-center gap-1"
        >
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
        className="h-full w-full object-contain p-2 transition duration-200 group-hover:scale-[1.03]"
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
