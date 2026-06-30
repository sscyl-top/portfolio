"use client";

import { useCallback, useState, useTransition } from "react";
import { UploadCloud, X, FileImage, FileVideo, FileText, Loader2 } from "lucide-react";

import { uploadMediaFiles, type UploadResult } from "@/lib/cms/upload-media";
import { createWorkFromMedia, suggestSlug } from "@/app/admin/(protected)/works/actions";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB（与服务端 /api/media/upload 限制一致）

export function WorkQuickUploader() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [year, setYear] = useState("");
  const [uploaded, setUploaded] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isBusy = isUploading || isPending;

  const handleTitleBlur = async () => {
    if (!title.trim() || slug.trim()) return;
    setIsSuggesting(true);
    try {
      const suggested = await suggestSlug(title);
      setSlug(suggested);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const oversizeNames: string[] = [];
    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) {
        oversizeNames.push(file.name);
        continue;
      }
      validFiles.push(file);
    }

    if (oversizeNames.length > 0) {
      setError(`以下文件超过 100MB 限制：${oversizeNames.join("、")}`);
      return;
    }

    if (validFiles.length === 0) {
      setError("仅支持 JPG/PNG/GIF/WEBP/MP4/WEBM/PDF 格式");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const results = await uploadMediaFiles(validFiles, (p) => setProgress({ ...p }));
      setUploaded((prev) => [...prev, ...results]);

      // 若还没填标题，尝试用第一个文件名作为标题
      setTitle((prev) => {
        if (prev.trim()) return prev;
        const first = results[0];
        if (!first) return prev;
        const base = first.original_name.replace(/\.[^.]+$/, "");
        return base;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removeUploaded = (id: string) => {
    setUploaded((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    void handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <form
      action={(formData) => startTransition(() => createWorkFromMedia(formData))}
      className="mt-6 rounded-md border border-white/10 bg-white/[0.035] p-4"
    >
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white/80">
        <UploadCloud className="h-4 w-4 text-cyan" />
        快速创建作品
      </h3>
      <p className="mb-4 text-xs text-white/40">
        拖拽上传图片/视频/PDF，填写标题后即可一键生成作品草稿。
      </p>

      {/* 拖拽上传区 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative grid min-h-[140px] place-items-center rounded-md border-2 border-dashed border-white/15 bg-black/20 transition hover:border-cyan/40 hover:bg-black/30"
      >
        <label className="grid cursor-pointer place-items-center gap-2 p-6 text-center">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-cyan" />
          ) : (
            <UploadCloud className="h-8 w-8 text-white/30" />
          )}
          <span className="text-sm text-white/55">
            {isUploading ? "正在上传…" : "拖拽文件到此处，或点击选择"}
          </span>
          <span className="text-[10px] text-white/30">
            支持 JPG / PNG / GIF / WEBP / MP4 / WEBM / PDF，可多选，单文件最大 100MB
          </span>
          <input
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => void handleFiles(e.target.files)}
            disabled={isBusy}
          />
        </label>
      </div>

      {/* 上传进度与预览 */}
      {uploaded.length > 0 || Object.keys(progress).length > 0 ? (
        <ul className="mt-4 space-y-2">
          {uploaded.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileIcon mimeType={item.mime_type} />
                <span className="truncate text-xs text-white/70">{item.original_name}</span>
              </div>
              <input type="hidden" name="media_ids" value={item.id} />
              <button
                type="button"
                onClick={() => removeUploaded(item.id)}
                className="rounded p-1 text-white/30 hover:bg-white/10 hover:text-white/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {Object.entries(progress)
            .filter(([name]) => !uploaded.some((u) => u.original_name === name))
            .map(([name, pct]) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2"
              >
                <span className="truncate text-xs text-white/50">{name}</span>
                <span className="font-mono text-[10px] text-cyan">{pct >= 0 ? `${pct}%` : "失败"}</span>
              </li>
            ))}
        </ul>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}

      {/* 元数据 */}
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.8fr_0.35fr_auto]">
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="作品标题"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
        />
        <div className="relative">
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-slug"
            className="min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 font-mono text-sm outline-none focus:border-cyan"
          />
          {isSuggesting ? (
            <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-white/30" />
          ) : null}
        </div>
        <input
          name="year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="年份"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
        />
        <button
          type="submit"
          disabled={isBusy || uploaded.length === 0}
          className="min-h-10 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white disabled:opacity-40"
        >
          {isPending ? "创建中…" : "创建草稿"}
        </button>
      </div>
    </form>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("video/")) return <FileVideo className="h-4 w-4 text-red-400" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-orange-400" />;
  return <FileImage className="h-4 w-4 text-green-400" />;
}
