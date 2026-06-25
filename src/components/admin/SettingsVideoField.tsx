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
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<{ id: string; url: string; original_name: string; mime_type: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const selected = assets.find((a) => a.id === value);
  const previewUrl = uploadedPreview ? uploadedPreview.url : (selected ? buildPublicMediaUrl(selected.storage_key) : undefined);
  const previewName = uploadedPreview ? uploadedPreview.original_name : selected?.original_name;
  const previewMime = uploadedPreview ? uploadedPreview.mime_type : selected?.mime_type;

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

  const triggerFileSelect = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED_VIDEO_TYPES;
    input.style.position = "fixed";
    input.style.top = "-9999px";
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        void handleUpload(target.files);
      }
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  }, [handleUpload]);

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
    <div className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>

      <div
        ref={dropZoneRef}
        data-media-upload-zone
        className={`relative rounded-md border transition-all ${
          isDragging
            ? "border-cyan bg-cyan/10 z-[60]"
            : "border-white/10 bg-white/[0.035]"
        }`}
      >
        {previewUrl ? (
          <button
            type="button"
            onClick={triggerFileSelect}
            className="block w-full cursor-pointer p-3 text-left transition hover:bg-white/[0.03]"
          >
            <div className="flex items-start gap-3">
              <div
                className={`relative shrink-0 w-40 ${ASPECT_CLASS[aspectRatio]} overflow-hidden rounded border border-white/20 bg-black/30`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <video
                  ref={videoRef}
                  src={previewUrl}
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 grid place-items-center bg-black/20 transition pointer-events-none">
                  <Play className="h-6 w-6 text-white/70 fill-white/40" />
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="truncate text-xs text-white/60">{previewName}</p>
                <p className="mt-0.5 text-[10px] text-white/30">{previewMime}</p>
                <p className="mt-2 text-[10px] text-white/25">
                  鼠标悬停预览播放 · 点击替换视频
                </p>
              </div>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={triggerFileSelect}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 p-6 transition hover:bg-white/[0.06]"
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-cyan" />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10">
                <Film className="h-6 w-6 text-white/40" />
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-white/50">
                {isUploading ? "上传中..." : "点击或拖拽视频到此处上传"}
              </p>
              <p className="mt-0.5 text-[10px] text-white/25">
                支持 MP4 / WEBM / OGG / MOV，最大 10GB
              </p>
            </div>
          </button>
        )}
      </div>

      <input type="hidden" name={name} value={value} />

      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => { setValue(e.target.value); setUploadedPreview(null); }}
          className="min-h-9 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
        >
          <option value="">从媒体库选择已上传的视频</option>
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
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60 transition hover:border-cyan/30 hover:text-cyan disabled:opacity-40"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          上传
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => { setValue(""); setUploadedPreview(null); }}
            className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/40 transition hover:border-red-300/30 hover:text-red-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {hint ? <p className="text-[10px] text-white/30">{hint}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
