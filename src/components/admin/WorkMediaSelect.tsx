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
      <span className={`min-h-[16px] leading-snug text-white/58 ${compact ? "text-[11px]" : ""}`}>{label}</span>

      <div
        ref={dropZoneRef}
        data-media-upload-zone
        className={`relative rounded-md border transition-all ${
          isDragging
            ? "border-cyan bg-cyan/10 z-[60]"
            : "border-white/10 bg-white/[0.035]"
        } ${compact ? "h-[132px]" : "h-[180px]"}`}
      >
        {previewUrl && selected ? (
          <div className={`flex h-full w-full items-center justify-center ${compact ? "p-2" : "p-3"}`}>
            {isVideo ? (
              <video
                src={previewUrl}
                muted
                playsInline
                className={`max-h-full max-w-full rounded border border-white/10 object-contain ${compact ? "max-h-[116px]" : "max-h-[156px]"}`}
              />
            ) : isGif ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={selected.alt_text || selected.original_name || label}
                className={`max-h-full max-w-full rounded border border-white/10 object-contain bg-black/20 ${compact ? "max-h-[116px]" : "max-h-[156px]"}`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={selected.alt_text || selected.original_name || label}
                className={`max-h-full max-w-full rounded border border-white/10 object-contain bg-black/20 ${compact ? "max-h-[116px]" : "max-h-[156px]"}`}
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`flex h-full w-full flex-col items-center justify-center gap-1 transition hover:bg-white/[0.06] ${compact ? "p-2" : "p-4"}`}
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

      <p className={`flex h-5 items-center truncate px-0.5 text-white/50 ${compact ? "text-[10px]" : "text-[11px]"}`} title={selected?.original_name}>
        {selected ? (selected.original_name.length > 25 ? selected.original_name.slice(0, 22) + "..." : selected.original_name) : ""}
      </p>

      <div className="flex min-w-0 items-center gap-1">
        <select
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          className={`min-w-0 flex-1 truncate rounded-md border border-white/10 bg-black/20 px-1.5 outline-none focus:border-cyan ${compact ? "h-7 text-[10px]" : "min-h-8 px-2 text-xs"}`}
          style={{ textOverflow: "ellipsis" }}
        >
          <option value="">从媒体库选择</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id} title={asset.original_name}>
              {asset.original_name.length > 30 ? asset.original_name.slice(0, 27) + "..." : asset.original_name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          title="上传新文件"
          className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-white/10 bg-black/20 text-white/60 transition hover:border-cyan/30 hover:text-cyan disabled:opacity-40 ${compact ? "h-7 w-7" : "h-8 px-2 text-xs"}`}
        >
          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />}
          {compact ? "" : "上传"}
        </button>

        <button
          type="button"
          onClick={() => value && handleValueChange("")}
          title={value ? "移除" : "未选择文件"}
          disabled={!value}
          className={`grid shrink-0 place-items-center rounded-md border border-white/10 bg-black/20 transition ${value ? "text-white/40 hover:border-red-300/30 hover:text-red-300" : "text-white/15 cursor-not-allowed"} ${compact ? "h-7 w-7" : "h-8 w-8"}`}
        >
          <X className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </button>
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
