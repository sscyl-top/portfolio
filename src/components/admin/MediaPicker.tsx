"use client";

import { useMemo, useState } from "react";
import { Check, Filter, Search, X as XIcon } from "lucide-react";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { uploadMediaFiles } from "@/lib/cms/upload-media";
import { DragDropUpload } from "./DragDropUpload";

type MediaOption = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  alt_text: string;
};

type MediaType = "all" | "image" | "video" | "other";
type SortMode = "newest" | "oldest" | "name";

type Props = {
  assets: MediaOption[];
  mode?: "single" | "multi";
  /** Used as form field name "media_id" or "media_ids" */
  fieldName: string;
  /** Pre-selected IDs */
  defaultValue?: string[];
  /** Allow uploading new media directly in the picker */
  allowUpload?: boolean;
};

export function MediaPicker({
  assets,
  mode = "single",
  fieldName,
  defaultValue = [],
  allowUpload = false,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultValue),
  );
  const [search, setSearch] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadMessage, setUploadMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // --- filtering ---
  const filtered = useMemo(() => {
    let result = assets;

    // type filter
    if (mediaType === "image") {
      result = result.filter((a) => a.mime_type.startsWith("image/"));
    } else if (mediaType === "video") {
      result = result.filter((a) => a.mime_type.startsWith("video/"));
    } else if (mediaType === "other") {
      result = result.filter(
        (a) =>
          !a.mime_type.startsWith("image/") && !a.mime_type.startsWith("video/"),
      );
    }

    // text search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.original_name.toLowerCase().includes(q) ||
          (a.alt_text ?? "").toLowerCase().includes(q),
      );
    }

    // sort
    if (sortMode === "name") {
      result = [...result].sort((a, b) =>
        a.original_name.localeCompare(b.original_name),
      );
    }
    // "newest" = keep original order (DB returns created_at desc)
    // "oldest" = reverse
    if (sortMode === "oldest") {
      result = [...result].reverse();
    }

    return result;
  }, [assets, search, mediaType, sortMode]);

  const isFiltered = search !== "" || mediaType !== "all";

  // --- selection helpers ---
  const selectAll = () => {
    if (mode === "single") return;
    setSelected(new Set(filtered.map((a) => a.id)));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (mode === "single") {
        if (next.has(id)) {
          next.clear();
        } else {
          next.clear();
          next.add(id);
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  };

  // --- upload handler ---
  const handleUpload = async (files: File[]) => {
    setUploading(true);
    setUploadMessage(null);
    setUploadProgress({});

    try {
      const results = await uploadMediaFiles(files, (p) => setUploadProgress({ ...p }));

      if (mode === "single" && results.length > 0) {
        setSelected(new Set([results[0].id]));
      } else if (results.length > 0) {
        setSelected((prev) => {
          const next = new Set(prev);
          results.forEach((r) => next.add(r.id));
          return next;
        });
      }

      setUploadMessage({ type: "ok", text: `成功上传 ${files.length} 个文件` });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setUploadMessage({ type: "error", text: (err as Error).message });
      setUploading(false);
    }
  };

  // --- hidden inputs for FormData ---
  const hiddenInputs =
    mode === "single" ? (
      <input
        type="hidden"
        name={fieldName}
        value={[...selected][0] ?? ""}
      />
    ) : (
      [...selected].map((id) => (
        <input key={id} type="hidden" name={fieldName} value={id} />
      ))
    );

  return (
    <div>
      {hiddenInputs}

      {/* ── search + toolbar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* search */}
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文件名或描述……"
            className="h-9 w-full rounded-md border border-white/10 bg-black/20 pl-9 pr-8 text-xs outline-none placeholder:text-white/25 focus:border-cyan"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              <XIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* type filter */}
        <div className="relative">
          <Filter
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30"
          />
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as MediaType)}
            className="h-9 appearance-none rounded-md border border-white/10 bg-black/20 pl-7 pr-6 text-xs outline-none focus:border-cyan"
          >
            <option value="all">全部类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="other">其他</option>
          </select>
        </div>

        {/* sort */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
        >
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
          <option value="name">名称 A-Z</option>
        </select>

        {/* selection actions (multi only) */}
        {mode === "multi" ? (
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/50 transition hover:border-cyan/40 hover:text-cyan"
            >
              全选
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/50 transition hover:border-white/30 hover:text-white"
            >
              取消
            </button>
          </div>
        ) : null}
      </div>

      {/* ── upload area (when allowUpload) ── */}
      {allowUpload ? (
        <div className="mb-4">
          <DragDropUpload onUpload={handleUpload}>
            <div className="rounded-md border-2 border-dashed border-white/20 p-4 text-center transition-colors hover:border-white/40">
              <p className="text-sm text-white/70">
                {uploading ? "正在上传..." : "拖拽文件到此处，或点击上传"}
              </p>
              <p className="mt-1 text-xs text-white/30">
                支持图片、视频、PDF，单文件最大 10GB
              </p>
            </div>
          </DragDropUpload>

          {/* upload progress */}
          {uploading && Object.keys(uploadProgress).length > 0 ? (
            <div className="mt-3 space-y-2">
              {Object.entries(uploadProgress).map(([filename, pct]) => (
                <div key={filename}>
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{filename}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan transition-all duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* upload message */}
          {uploadMessage ? (
            <p
              className={`mt-3 rounded-md px-3 py-1.5 text-sm ${
                uploadMessage.type === "ok"
                  ? "bg-green-300/10 text-green-200"
                  : "bg-red-300/10 text-red-200"
              }`}
            >
              {uploadMessage.text}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── results summary ── */}
      <p className="mb-3 text-xs text-white/34">
        {filtered.length}{" "}
        {isFiltered ? `/ ${assets.length} 个结果` : "个素材"}
        {isFiltered ? "（已筛选）" : ""}
        {selected.size > 0 ? ` · 已选 ${selected.size} 项` : ""}
        {selected.size > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="ml-2 underline transition hover:text-white"
          >
            清除选择
          </button>
        ) : null}
      </p>

      {/* ── grid ── */}
      {filtered.length === 0 ? (
        <p className="border-y border-white/10 py-12 text-center text-sm text-white/34">
          {isFiltered ? "没有匹配的媒体文件。" : "媒体库暂无素材，请先上传。"}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {filtered.map((asset) => {
            const isSelected = selected.has(asset.id);
            const isImage = asset.mime_type.startsWith("image/");
            const isVideo = asset.mime_type.startsWith("video/");
            const url = buildPublicMediaUrl(asset.storage_key);

            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggle(asset.id)}
                className={`group relative aspect-square overflow-hidden rounded-md border-2 transition ${
                  isSelected
                    ? "border-cyan ring-1 ring-cyan/40"
                    : "border-white/10 hover:border-white/25"
                }`}
                title={asset.original_name}
              >
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={asset.alt_text || asset.original_name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : isVideo ? (
                  <video
                    src={url}
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center bg-black/30 font-mono text-[10px] uppercase text-white/40">
                    file
                  </span>
                )}

                {/* overlay badge */}
                <span
                  className={`absolute inset-0 flex items-end p-1.5 transition ${
                    isSelected
                      ? "bg-cyan/20"
                      : "bg-transparent group-hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      isSelected
                        ? "bg-cyan text-black"
                        : "bg-black/60 text-white/70"
                    }`}
                  >
                    {isSelected ? (
                      mode === "single" ? (
                        "已选"
                      ) : (
                        <Check aria-hidden="true" className="inline h-2.5 w-2.5" />
                      )
                    ) : (
                      asset.original_name.slice(0, 10)
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
