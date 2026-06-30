"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { UploadCloud, Loader2, X, Film, Play } from "lucide-react";

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
  aspectRatio?: "video" | "square" | "wide";
  compact?: boolean;
};

const ACCEPTED_VIDEO_TYPES = "video/mp4,video/webm,video/ogg,video/quicktime";

const ASPECT_CLASS: Record<NonNullable<Props["aspectRatio"]>, string> = {
  video: "aspect-video",
  square: "aspect-square",
  wide: "aspect-[2/1]",
};

export function SettingsVideoField({
  name,
  label,
  assets,
  defaultValue,
  hint,
  aspectRatio = "video",
  compact = false,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<{ id: string; url: string; original_name: string; mime_type: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const selected = assets.find((a) => a.id === value);
  const previewUrl = uploadedPreview ? uploadedPreview.url : (selected ? buildPublicMediaUrl(selected.storage_key) : undefined);
  const previewName = uploadedPreview ? uploadedPreview.original_name : selected?.original_name;
  const previewMime = uploadedPreview ? uploadedPreview.mime_type : selected?.mime_type;

  const ctrlH = "h-8";

  const triggerFileSelect = useCallback(() => {
    hiddenInputRef.current?.click();
  }, []);

  const handleUpload = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const file = Array.isArray(files) ? files[0] : files[0];

    if (!file.type.startsWith("video/")) {
      setError("请选择视频格式文件（MP4/WEBM/OGG/MOV）");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const results = await uploadMediaFiles([file], () => {});
      const result = results[0];
      if (!result) return;
      setValue(result.id);
      setUploadedPreview({
        id: result.id,
        url: buildPublicMediaUrl(result.storage_key),
        original_name: result.original_name,
        mime_type: result.mime_type,
      });
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

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-white/58">{label}</span>

      <div
        ref={dropZoneRef}
        data-media-upload-zone
        className={`overflow-hidden rounded-md border transition-all ${
          isDragging
            ? "border-cyan bg-cyan/10 z-[60]"
            : "border-white/10 bg-white/[0.035]"
        }`}
      >
        <button
          type="button"
          onClick={triggerFileSelect}
          className="relative block w-full cursor-pointer overflow-hidden bg-black/30 transition hover:brightness-110"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {previewUrl ? (
            <div className={`w-full ${ASPECT_CLASS[aspectRatio]} p-0`}>
              <video
                ref={videoRef}
                src={previewUrl}
                muted
                playsInline
                loop
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20 transition">
                <Play className="h-7 w-7 text-white/80 fill-white/50" />
              </div>
            </div>
          ) : (
            <div className={`w-full ${ASPECT_CLASS[aspectRatio]} grid place-items-center`}>
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-cyan" />
              ) : (
                <div className="text-center">
                  <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white/10">
                    <Film className="h-4 w-4 text-white/40" />
                  </div>
                  <p className="mt-1.5 text-xs text-white/45">点击或拖拽上传视频</p>
                  <p className="mt-0.5 text-[10px] text-white/25">MP4 / WEBM / OGG / MOV</p>
                </div>
              )}
            </div>
          )}
        </button>

        <div className={`flex items-center gap-1 border-t border-white/8 bg-black/20 px-2 py-1.5`}>
          <select
            value={value}
            onChange={(e) => { setValue(e.target.value); setUploadedPreview(null); }}
            className={`${ctrlH} min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 text-[11px] outline-none focus:border-cyan`}
          >
            <option value="">从媒体库选择</option>
            {assets
              .filter((a) => a.mime_type.startsWith("video/"))
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.original_name}
                </option>
              ))}
          </select>

          <button
            type="button"
            onClick={triggerFileSelect}
            disabled={isUploading}
            className={`inline-flex ${ctrlH} shrink-0 items-center gap-1 rounded border border-white/10 bg-black/30 px-2 text-[11px] text-white/60 transition hover:border-cyan/30 hover:text-cyan disabled:opacity-40`}
          >
            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
            上传
          </button>

          {value ? (
            <button
              type="button"
              onClick={() => { setValue(""); setUploadedPreview(null); }}
              className={`${ctrlH} shrink-0 rounded border border-white/10 bg-black/30 px-1.5 text-white/40 transition hover:border-red-300/30 hover:text-red-300`}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      <input type="hidden" name={name} value={value} readOnly />
      <input
        ref={hiddenInputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES}
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
