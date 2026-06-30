"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { UploadCloud, Loader2, X } from "lucide-react";

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
  compact?: boolean;
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
  compact = false,
}: Props) {
  const [ids, setIds] = useState<string[]>(() => parseIds(defaultValue));
  const [uploadedLogos, setUploadedLogos] = useState<Record<string, UploadedLogo>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const thumbSize = compact ? "h-16 w-20" : "h-20 w-24";
  const p = compact ? "p-3" : "p-4";
  const emptyP = compact ? "p-5" : "p-8";

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

  useEffect(() => {
    const el = dropZoneRef.current;
    if (!el) return;

    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();
      document.body.setAttribute("data-media-dragging", "true");
      setIsDragging(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();
      document.body.setAttribute("data-media-dragging", "true");
      setIsDragging(true);
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return;
      document.body.removeAttribute("data-media-dragging");
      setIsDragging(false);
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.removeAttribute("data-media-dragging");
      setIsDragging(false);
      if (e.dataTransfer?.files) {
        void handleUpload(e.dataTransfer.files);
      }
    };

    el.addEventListener("dragenter", onDragEnter);
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);

    return () => {
      el.removeEventListener("dragenter", onDragEnter);
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, [handleUpload]);

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-white/58">{label}</span>

      <div
        ref={dropZoneRef}
        data-media-upload-zone
        className={`relative rounded-md border transition-all cursor-pointer ${
          isDragging
            ? "border-cyan bg-cyan/10 z-[60]"
            : "border-white/10 bg-white/[0.035] hover:bg-white/[0.05]"
        }`}
        onClick={triggerFileSelect}
      >
        {selectedAssets.length > 0 ? (
          <div className={p}>
            <div className="flex flex-wrap items-center gap-2">
              {selectedAssets.map((item) => (
                <div
                  key={item.id}
                  className={`group relative flex ${thumbSize} shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-[repeating-conic-gradient(#222_0%_25%,#2a2a2a_0%_50%)] bg-[length:8px_8px]`}
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
                    onClick={(e) => { e.stopPropagation(); removeId(item.id); }}
                    className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/80 transition hover:bg-red-500/80 hover:text-white group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-center">
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5 text-white/30" />
              )}
              <span className="text-[10px] text-white/30">
                {isUploading ? "上传中..." : "点击或拖拽继续添加"}
              </span>
            </div>
          </div>
        ) : (
          <div className={`flex w-full flex-col items-center justify-center gap-2 ${emptyP}`}>
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-cyan" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
                <UploadCloud className="h-5 w-5 text-white/40" />
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-white/50">
                {isUploading ? "上传中..." : "点击或拖拽上传图片"}
              </p>
              <p className="mt-0.5 text-[10px] text-white/25">
                PNG / JPG / GIF / WEBP / SVG，建议透明底，可多选
              </p>
            </div>
          </div>
        )}
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
        }}
      />

      {hint ? <p className="text-[10px] leading-tight text-white/30">{hint}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
