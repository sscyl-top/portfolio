"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { Plus, UploadCloud, Loader2, X } from "lucide-react";

import { uploadMediaFiles } from "@/lib/cms/upload-media";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

type MediaAsset = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  alt_text: string;
};

type Props = {
  name: string;
  label: string;
  assets: MediaAsset[];
  defaultValue: string;
  hint?: string;
};

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml";

function parseIds(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function joinIds(ids: string[]): string {
  return ids.join(",");
}

type UploadedLogo = {
  id: string;
  url: string;
  original_name: string;
  mime_type: string;
};

export function TickerLogosField({
  name,
  label,
  assets,
  defaultValue,
  hint,
}: Props) {
  const [ids, setIds] = useState<string[]>(() => parseIds(defaultValue));
  const [uploadedLogos, setUploadedLogos] = useState<Record<string, UploadedLogo>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAssets = useMemo(() => {
    return ids
      .map((id) => {
        const uploaded = uploadedLogos[id];
        if (uploaded) return { id, url: uploaded.url, name: uploaded.original_name, mime: uploaded.mime_type, fromUpload: true };
        const asset = assets.find((a) => a.id === id);
        if (!asset) return null;
        return { id, url: buildPublicMediaUrl(asset.storage_key), name: asset.original_name, mime: asset.mime_type, fromUpload: false };
      })
      .filter((x): x is { id: string; url: string; name: string; mime: string; fromUpload: boolean } => x !== null);
  }, [ids, assets, uploadedLogos]);

  const availableLibraryAssets = useMemo(() => {
    return assets
      .filter((a) => a.mime_type.startsWith("image/") && !ids.includes(a.id));
  }, [assets, ids]);

  const addId = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeId = useCallback((id: string) => {
    setIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const triggerFileSelect = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleUpload = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setError("请选择图片格式文件（PNG/JPG/GIF/WEBP/SVG）");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const results = await uploadMediaFiles(imageFiles, () => {});
      const newUploaded: Record<string, UploadedLogo> = {};
      const newIds: string[] = [];
      for (const r of results) {
        if (!r) continue;
        newUploaded[r.id] = {
          id: r.id,
          url: buildPublicMediaUrl(r.storage_key),
          original_name: r.original_name,
          mime_type: r.mime_type,
        };
        newIds.push(r.id);
      }
      setUploadedLogos((prev) => ({ ...prev, ...newUploaded }));
      setIds((prev) => [...prev, ...newIds]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  }, []);

  return (
    <div className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>

      <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
        {selectedAssets.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            {selectedAssets.map((item) => (
              <div
                key={item.id}
                className="group relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-[repeating-conic-gradient(#222_0%_25%,#2a2a2a_0%_50%)] bg-[length:10px_10px]"
                title={item.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.name}
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => removeId(item.id)}
                  className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/80 transition hover:bg-red-500/80 hover:text-white group-hover:flex"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setShowLibraryPicker((v) => !v)}
              className="flex h-20 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded border border-dashed border-white/15 text-white/30 transition hover:border-cyan/40 hover:text-cyan/70"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[10px]">添加</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLibraryPicker((v) => !v)}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 py-6 text-white/40 transition hover:text-cyan/70"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-xs">还没有添加 logo，点击添加</p>
            <p className="text-[10px] text-white/25">
              支持 PNG / JPG / GIF / WEBP / SVG，建议 PNG 透明底
            </p>
          </button>
        )}

        {showLibraryPicker ? (
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={triggerFileSelect}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60 transition hover:border-cyan/30 hover:text-cyan disabled:opacity-40"
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                {isUploading ? "上传中..." : "上传新图片"}
              </button>
              <span className="text-[10px] text-white/30">或从媒体库选择：</span>
            </div>

            {availableLibraryAssets.length > 0 ? (
              <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                {availableLibraryAssets.map((asset) => {
                  const url = buildPublicMediaUrl(asset.storage_key);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => { addId(asset.id); setShowLibraryPicker(false); }}
                      className="group relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-[repeating-conic-gradient(#222_0%_25%,#2a2a2a_0%_50%)] bg-[length:8px_8px] transition hover:border-cyan/50"
                      title={asset.original_name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={asset.original_name} className="max-h-full max-w-full object-contain" />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-[9px] text-white/70 opacity-0 transition group-hover:opacity-100">
                        {asset.original_name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-[10px] text-white/25">媒体库中没有其他可选图片</p>
            )}
          </div>
        ) : null}
      </div>

      <input type="hidden" name={name} value={joinIds(ids)} />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        className="sr-only"
        onChange={(e) => {
          void handleUpload(e.target.files);
          e.target.value = "";
          setShowLibraryPicker(false);
        }}
      />

      {hint ? <p className="text-[10px] text-white/30">{hint}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
