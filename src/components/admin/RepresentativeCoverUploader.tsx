"use client";

import { useCallback, useState, useTransition } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { uploadMediaFiles } from "@/lib/cms/upload-media";
import { updateRepresentativeCover, clearRepresentativeCover } from "@/app/admin/(protected)/works/actions";

const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
];

export function RepresentativeCoverUploader({ workId }: { workId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isBusy = isUploading || isPending;

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_MEDIA_TYPES.includes(file.type)) {
        setError("仅支持 JPG / PNG / GIF / WEBP 图片或 MP4 / WEBM 视频");
        return;
      }

      setError(null);
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const results = await uploadMediaFiles([file], (progress) => {
          const pct = Object.values(progress)[0] || 0;
          setUploadProgress(pct);
        });

        if (results[0]?.id) {
          const formData = new FormData();
          formData.append("work_id", workId);
          formData.append("media_id", results[0].id);

          startTransition(() => {
            updateRepresentativeCover(formData)
              .then((result) => {
                if (result && result.success === false) {
                  setError(result.error || "保存封面失败");
                } else {
                  router.refresh();
                }
              })
              .catch((err) => {
                setError(err instanceof Error ? err.message : "保存封面失败");
              });
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "上传失败");
      } finally {
        setIsUploading(false);
      }
    },
    [workId, router],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClear = () => {
    if (!confirm("确定要移除该作品的竖版专属封面吗？")) return;
    const formData = new FormData();
    formData.append("work_id", workId);
    startTransition(() => {
      clearRepresentativeCover(formData)
        .then((result) => {
          if (result && result.success === false) {
            setError(result.error || "移除封面失败");
          } else {
            router.refresh();
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "移除封面失败");
        });
    });
  };

  return (
    <div className="space-y-2">
      {isUploading ? (
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-cyan" />
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          <span className="font-mono text-[10px] text-cyan">{uploadProgress}%</span>
        </div>
      ) : isPending ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-cyan/30 bg-cyan/10 px-3 py-2 text-xs text-cyan">
          <Loader2 className="h-4 w-4 animate-spin" />
          保存中…
        </div>
      ) : (
        <div className="flex gap-2">
          <label
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 bg-black/20 px-2 py-2 text-[11px] text-white/50 transition hover:border-cyan/40 hover:bg-cyan/5 hover:text-cyan"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            点击或拖拽上传
            <input
              type="file"
              accept={ACCEPTED_MEDIA_TYPES.join(",")}
              className="sr-only"
              onChange={handleFileInput}
              disabled={isBusy}
            />
          </label>
          <button
            type="button"
            onClick={handleClear}
            disabled={isBusy}
            className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-white/40 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-400 disabled:opacity-40"
            title="移除竖版封面"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {error ? (
        <div className="flex gap-1 rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[10px] leading-relaxed text-red-300">
          <X className="h-3 w-3 shrink-0 mt-0.5" />
          <p className="whitespace-pre-line break-words">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
