"use client";

import { useRef, useState } from "react";
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
};

export function SettingsMediaField({ name, label, assets, defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = assets.find((a) => a.id === value);
  const previewUrl = selected ? buildPublicMediaUrl(selected.storage_key) : undefined;

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setError(null);
    setIsUploading(true);

    try {
      const results = await uploadMediaFiles([file], () => {});
      const result = results[0];
      if (!result) return;
      setValue(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <label className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>

      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={selected?.alt_text || selected?.original_name || label}
          className="h-16 w-full rounded-md border border-white/10 object-contain"
        />
      ) : (
        <span className="grid h-16 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
          未选择
        </span>
      )}

      <input type="hidden" name={name} value={value} />

      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-10 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
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
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60 transition hover:border-cyan/30 hover:text-cyan disabled:opacity-40"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          {isUploading ? "上传中…" : "上传"}
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
        accept="image/*"
        className="sr-only"
        onChange={(e) => void handleUpload(e.target.files)}
      />

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </label>
  );
}
