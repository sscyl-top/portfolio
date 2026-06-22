"use client";

import { useState } from "react";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

type MediaOption = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  alt_text: string;
};

type Props = {
  assets: MediaOption[];
  mode?: "single" | "multi";
  /** Used as form field name "media_id" or "media_ids" */
  fieldName: string;
  /** Pre-selected IDs */
  defaultValue?: string[];
};

export function MediaPicker({
  assets,
  mode = "single",
  fieldName,
  defaultValue = [],
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultValue),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (mode === "single") {
        // Radio-like: only one at a time, click again to deselect
        if (next.has(id)) {
          next.clear();
        } else {
          next.clear();
          next.add(id);
        }
      } else {
        // Checkbox-like
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  };

  return (
    <div>
      {/* Hidden inputs for FormData submission */}
      {mode === "single" ? (
        <input
          type="hidden"
          name={fieldName}
          value={[...selected][0] ?? ""}
        />
      ) : (
        [...selected].map((id) => (
          <input key={id} type="hidden" name={fieldName} value={id} />
        ))
      )}

      {assets.length === 0 ? (
        <p className="border-y border-white/10 py-8 text-center text-sm text-white/34">
          媒体库暂无素材，请先上传。
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {assets.map((asset) => {
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

                {/* Selection overlay */}
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
                    {isSelected
                      ? mode === "single"
                        ? "已选"
                        : "✓"
                      : asset.original_name.slice(0, 10)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected.size > 0 ? (
        <p className="mt-2 text-xs text-white/38">
          已选 {selected.size} 项 ·{" "}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="underline transition hover:text-white"
          >
            清除选择
          </button>
        </p>
      ) : null}
    </div>
  );
}
