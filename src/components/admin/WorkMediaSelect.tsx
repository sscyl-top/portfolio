"use client";

import { useRef, useState, useCallback } from "react";
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
};

const ACCEPTED_MEDIA_TYPES = "image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/ogg,video/quicktime,application/pdf";

export function WorkMediaSelect({
  name,
  label,
  assets,
  defaultValue,
  accept = ACCEPTED_MEDIA_TYPES,
  hint,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = assets.find((a) => a.id === value);
  const previewUrl = selected ? buildPublicMediaUrl(selected.storage_key) : undefined;
  const isGif = selected?.mime_type === "image/gif";
  const isVideo = selected?.mime_type.startsWith("video/");

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
      if (!result) return;
      setValue(result.id);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const getFileIcon = () => {
    if (isVideo) return <Film className="h-5 w-5 text-white/40" />;
    return <ImageIcon className="h-5 w-5 text-white/40" />;
  };

  return (
    <div className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-md border transition-all ${
          isDragging
            ? "border-cyan bg-cyan/10"
            : "border-white/10 bg-white/[0.035]"
        }`}
      >
        {previewUrl && selected ? (
          <div className="p-3">
            <div className="flex items-start gap-3">
              {isVideo ? (
                <video
                  src={previewUrl}
                  muted
                  playsInline
                  className="h-20 w-28 flex-shrink-0 rounded object-cover border border-white/10"
                />
              ) : isGif ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={selected.alt_text || selected.original_name || label}
                  className="h-20 w-28 flex-shrink-0 rounded object-cover border border-white/10"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={selected.alt_text || selected.original_name || label}
                  className="h-20 w-28 flex-shrink-0 rounded object-cover border border-white/10"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs text-white/60">{selected.original_name}</p>
                <p className="mt-0.5 text-[10px] text-white/30">{selected.mime_type}</p>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 p-4 transition hover:bg-white/[0.06]"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-cyan" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
                {getFileIcon()}
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-white/50">
                {isUploading ? "上传中..." : "点击或拖拽文件到此处上传"}
              </p>
              <p className="mt-0.5 text-[10px] text-white/25">
                支持 PNG / JPG / GIF / WEBP / SVG / MP4 / PDF
              </p>
            </div>
          </button>
        )}
      </div>

      <input type="hidden" name={name} value={value} />

      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-9 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
        >
          <option value="">从媒体库选择已上传的文件</option>
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
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60 transition hover:border-cyan/30 hover:text-cyan disabled:opacity-40"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          上传
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/40 transition hover:border-red-300/30 hover:text-red-300"
          >
            <X className="h-3.5 w-3.5" />
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

      {hint ? <p className="text-[10px] text-white/30">{hint}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
