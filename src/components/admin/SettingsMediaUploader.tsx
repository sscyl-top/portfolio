"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2, X } from "lucide-react";

import { uploadMediaFiles } from "@/lib/cms/upload-media";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

type Props = {
  name: string;
  label: string;
  currentMediaId: string | null;
  currentPreviewUrl?: string;
  accept?: string;
  onUploaded: (mediaId: string) => void;
};

export function SettingsMediaUploader({
  name,
  label,
  currentMediaId,
  currentPreviewUrl,
  accept = "image/*",
  onUploaded,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentPreviewUrl);
  const [mediaId, setMediaId] = useState<string | undefined>(currentMediaId ?? undefined);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setError(null);
    setIsUploading(true);

    try {
      const results = await uploadMediaFiles([file], () => {});
      const result = results[0];
      if (!result) return;

      setMediaId(result.id);
      setPreviewUrl(
        result.mime_type.startsWith("image/") ? buildPublicMediaUrl(result.storage_key) : undefined,
      );
      onUploaded(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const clear = () => {
    setMediaId(undefined);
    setPreviewUrl(undefined);
    onUploaded("");
  };

  return (
    <div className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>

      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={label}
          className="h-16 w-full rounded-md border border-white/10 object-contain"
        />
      ) : (
        <span className="grid h-16 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
          未选择
        </span>
      )}

      <input type="hidden" name={name} value={mediaId ?? ""} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60 transition hover:border-cyan/30 hover:text-cyan disabled:opacity-40"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          {isUploading ? "上传中…" : "直接上传"}
        </button>
        {mediaId ? (
          <button
            type="button"
            onClick={clear}
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
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
