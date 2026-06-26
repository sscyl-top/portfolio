"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { UploadCloud, Loader2, X, Image as ImageIcon, Film } from "lucide-react";

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
  accept?: string;
  hint?: string;
  autoSave?: boolean;
  compact?: boolean;
};

const ACCEPTED_MEDIA_TYPES = "image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/ogg,video/quicktime,application/pdf";

export function WorkMediaSelect({
  name,
  label,
  assets,
  defaultValue,
  accept = ACCEPTED_MEDIA_TYPES,
  hint,
  autoSave = false,
  compact = false,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const selected = assets.find((a) => a.id === value);
  const previewUrl = selected ? buildPublicMediaUrl(selected.storage_key) : undefined;
  const isGif = selected?.mime_type === "image/gif";
  const isVideo = selected?.mime_type?.startsWith("video/");

  const submitForm = useCallback(() => {
    if (!autoSave) return;
    const form = inputRef.current?.form;
    if (form) {
      form.requestSubmit();
    }
  }, [autoSave]);

  const handleValueChange = useCallback((newValue: string) => {
    setValue(newValue);
    if (autoSave) {
      setTimeout(() => submitForm(), 0);
    }
  }, [autoSave, submitForm]);

  const handleUpload = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const file = Array.isArray(files) ? files[0] : files[0];

    const isValidType = file.type.startsWith("image/") || 
                        file.type.startsWith("video/") || 
                        file.type === "application/pdf";
    if (!isValidType) {
      setError("请选择支持的媒体格式（图片/视频/PDF）");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const results = await uploadMediaFiles([file], () => {});
      const result = results[0];
      if (!result) {
        setIsUploading(false);
        return;
      }
      
      setValue(result.id);
      setIsUploading(false);

      const form = inputRef.current?.form;
      if (form && autoSave) {
        const hiddenInput = form.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
        if (hiddenInput) {
          hiddenInput.value = result.id;
        }
        form.requestSubmit();
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
      setIsUploading(false);
    }
  }, [autoSave, name]);

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

  const getFileIcon = () => {
    if (isVideo) return <Film className="h-5 w-5 text-white/40" />;
    return <ImageIcon className="h-5 w-5 text-white/40" />;
  };

  return (
    <div className="grid min-w-0 gap-1.5 text-sm">
      <span className={`text-white/58 ${compact ? "text-[11px]" : ""}`}>{label}</span>

      <div
        ref={dropZoneRef}
        data-media-upload-zone
        className={`relative rounded-md border transition-all ${
          isDragging
            ? "border-cyan bg-cyan/10 z-[60]"
            : "border-white/10 bg-white/[0.035]"
        }`}
      >
        {previewUrl && selected ? (
          <div className={compact ? "p-1.5" : "p-2.5"}>
            <div className="flex items-start gap-2">
              {isVideo ? (
                <video
                  src={previewUrl}
                  muted
                  playsInline
                  className={`flex-shrink-0 rounded object-cover border border-white/10 ${compact ? "h-12 w-16" : "h-14 w-20"}`}
                />
              ) : isGif ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={selected.alt_text || selected.original_name || label}
                  className={`flex-shrink-0 rounded object-cover border border-white/10 ${compact ? "h-12 w-16" : "h-14 w-20"}`}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={selected.alt_text || selected.original_name || label}
                  className={`flex-shrink-0 rounded object-cover border border-white/10 ${compact ? "h-12 w-16" : "h-14 w-20"}`}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className={`truncate text-white/60 ${compact ? "text-[11px]" : "text-xs"}`}>{selected.original_name}</p>
                <p className={`text-white/30 ${compact ? "text-[9px] mt-0" : "text-[10px] mt-0.5"}`}>{selected.mime_type}</p>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`flex w-full flex-col items-center justify-center gap-1 transition hover:bg-white/[0.06] ${compact ? "p-2" : "p-4"}`}
          >
            {isUploading ? (
              <Loader2 className={`animate-spin text-cyan ${compact ? "h-4 w-4" : "h-6 w-6"}`} />
            ) : (
              <div className={`grid place-items-center rounded-full bg-white/10 ${compact ? "h-7 w-7" : "h-10 w-10"}`}>
                {compact ? (
                  isVideo ? <Film className="h-3.5 w-3.5 text-white/40" /> : <ImageIcon className="h-3.5 w-3.5 text-white/40" />
                ) : getFileIcon()}
              </div>
            )}
            <div className="text-center">
              <p className={`text-white/50 ${compact ? "text-[10px]" : "text-xs"}`}>
                {isUploading ? "上传中..." : compact ? "点击或拖拽上传" : "点击或拖拽文件到此处上传"}
              </p>
              {!compact && (
                <p className="mt-0.5 text-[10px] text-white/25">
                  支持 PNG / JPG / GIF / WEBP / SVG / MP4 / PDF
                </p>
              )}
            </div>
          </button>
        )}
      </div>

      <input type="hidden" name={name} value={value} />

      <div className="flex min-w-0 items-center gap-1">
        <select
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          className={`min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-1.5 outline-none focus:border-cyan ${compact ? "h-7 text-[10px]" : "min-h-8 px-2 text-xs"}`}
        >
          <option value="">从媒体库选择</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.original_name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-black/20 text-white/60 transition hover:border-cyan/30 hover:text-cyan disabled:opacity-40 ${compact ? "h-7 px-1.5 text-[10px]" : "h-8 px-2 text-xs"}`}
        >
          {isUploading ? <Loader2 className="animate-spin h-3 w-3" /> : <UploadCloud className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />}
          {compact ? "" : "上传"}
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => handleValueChange("")}
            className={`grid shrink-0 place-items-center rounded-md border border-white/10 bg-black/20 text-white/40 transition hover:border-red-300/30 hover:text-red-300 ${compact ? "h-7 w-7" : "h-8 w-8"}`}
          >
            <X className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => void handleUpload(e.target.files)}
      />

      {hint ? <p className={`text-white/30 ${compact ? "text-[9px]" : "text-[10px]"}`}>{hint}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
