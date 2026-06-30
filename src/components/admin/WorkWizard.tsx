"use client";

import { useCallback, useState, useTransition } from "react";
import {
  UploadCloud,
  X,
  FileImage,
  FileVideo,
  FileText,
  Loader2,
  ArrowUp,
  ArrowDown,
  Crop,
  Check,
  ChevronRight,
  ChevronLeft,
  ImagePlus,
} from "lucide-react";

import { uploadMediaFiles, type UploadResult } from "@/lib/cms/upload-media";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { createWorkFromWizard, suggestSlug } from "@/app/admin/(protected)/works/actions";
import { ImageCropper } from "@/components/admin/ImageCropper";
import { uploadMediaBlob } from "@/lib/cms/upload-media";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
];

export type WizardCategory = { id: string; name: string };
export type WizardTag = { id: string; name: string };

type WizardMedia = UploadResult & { previewUrl?: string };

type Props = {
  categories: WizardCategory[];
  tags: WizardTag[];
  presetSection?: "all" | "composite" | "representative";
  representativeSlot?: number;
};

export function WorkWizard({ categories, tags, presetSection = "all", representativeSlot }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mediaList, setMediaList] = useState<WizardMedia[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // metadata
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [year, setYear] = useState("");
  const [client, setClient] = useState("");
  const [summary, setSummary] = useState("");
  const [palette, setPalette] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"draft" | "published" | "private">("published");

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // crop state
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);

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

    const validFiles = Array.from(files).filter((file) => ACCEPTED_TYPES.includes(file.type));
    if (validFiles.length === 0) {
      setError("仅支持 JPG/PNG/GIF/WEBP/MP4/WEBM/PDF 格式");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const results = await uploadMediaFiles(validFiles, (p) => setProgress({ ...p }));
      setMediaList((prev) => [
        ...prev,
        ...results.map((r) => ({
          ...r,
          previewUrl: r.mime_type.startsWith("image/") ? buildPublicMediaUrl(r.storage_key) : undefined,
        })),
      ]);

      setTitle((prev) => {
        if (prev.trim()) return prev;
        const first = results[0];
        if (!first) return prev;
        return first.original_name.replace(/\.[^.]+$/, "");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
      setProgress({});
    }
  }, []);

  const removeMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const moveMedia = (index: number, direction: -1 | 1) => {
    setMediaList((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (croppingIndex === null) return;
    setIsUploading(true);
    try {
      const filename = `cropped-${Date.now()}.jpg`;
      const result = await uploadMediaBlob(croppedBlob, filename, (p) => setProgress({ ...p }));
      setMediaList((prev) =>
        prev.map((item, i) =>
          i === croppingIndex
            ? {
                ...result,
                previewUrl: result.mime_type.startsWith("image/")
                  ? buildPublicMediaUrl(result.storage_key)
                  : undefined,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "裁剪上传失败");
    } finally {
      setIsUploading(false);
      setProgress({});
      setCroppingIndex(null);
    }
  };

  const canGoNext = !isUploading && mediaList.length > 0;
  const canSubmit = title.trim() && slug.trim() && !isBusy;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const formData = new FormData();
    formData.set("title", title);
    formData.set("slug", slug);
    formData.set("subtitle", subtitle);
    formData.set("year", year);
    formData.set("client", client);
    formData.set("summary", summary);
    formData.set("palette", palette);
    formData.set("status", status);
    mediaList.forEach((m) => formData.append("media_ids", m.id));
    selectedCategoryIds.forEach((id) => formData.append("category_ids", id));
    selectedTagIds.forEach((id) => formData.append("tag_ids", id));

    if (presetSection === "composite") {
      formData.set("is_composite", "true");
    }
    if (presetSection === "representative" && representativeSlot) {
      formData.set("is_representative", "true");
      formData.set("representative_order", String(representativeSlot));
    }

    startTransition(() => {
      createWorkFromWizard(formData);
    });
  };

  return (
    <section className="mt-6 rounded-md border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-4 flex items-center gap-2">
        <StepBadge step={1} current={step} label="上传媒体" />
        <ChevronRight className="h-4 w-4 text-white/20" />
        <StepBadge step={2} current={step} label="填写信息" />
        <ChevronRight className="h-4 w-4 text-white/20" />
        <StepBadge step={3} current={step} label="创建作品" />
      </div>

      {step === 1 ? (
        <Step1Media
          mediaList={mediaList}
          isUploading={isUploading}
          progress={progress}
          error={error}
          onFiles={handleFiles}
          onRemove={removeMedia}
          onMove={moveMedia}
          onCrop={setCroppingIndex}
        />
      ) : step === 2 ? (
        <Step2Metadata
          title={title}
          setTitle={setTitle}
          slug={slug}
          setSlug={setSlug}
          subtitle={subtitle}
          setSubtitle={setSubtitle}
          year={year}
          setYear={setYear}
          client={client}
          setClient={setClient}
          summary={summary}
          setSummary={setSummary}
          palette={palette}
          setPalette={setPalette}
          status={status}
          setStatus={setStatus}
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          setSelectedCategoryIds={setSelectedCategoryIds}
          tags={tags}
          selectedTagIds={selectedTagIds}
          setSelectedTagIds={setSelectedTagIds}
          isSuggesting={isSuggesting}
          onTitleBlur={handleTitleBlur}
        />
      ) : (
        <Step3Summary mediaList={mediaList} title={title} slug={slug} isPending={isPending} />
      )}

      <div className="mt-5 flex justify-between border-t border-white/5 pt-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s === 2 ? 1 : 2))}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/12 px-4 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            上一步
          </button>
        ) : (
          <span />
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
            disabled={!canGoNext || isBusy}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan px-5 py-2 text-sm font-medium text-black transition hover:bg-white disabled:opacity-40"
          >
            下一步
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan px-5 py-2 text-sm font-medium text-black transition hover:bg-white disabled:opacity-40"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            创建作品
          </button>
        )}
      </div>

      {croppingIndex !== null && mediaList[croppingIndex]?.previewUrl ? (
        <ImageCropper
          imageSrc={mediaList[croppingIndex].previewUrl!}
          onCropComplete={handleCropComplete}
          onClose={() => setCroppingIndex(null)}
        />
      ) : null}
    </section>
  );
}

function StepBadge({ step, current, label }: { step: number; current: number; label: string }) {
  const active = step === current;
  const done = current > step;
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-cyan/20 text-cyan"
          : done
            ? "bg-white/10 text-white/70"
            : "text-white/35"
      }`}
    >
      {done ? <Check className="h-3 w-3" /> : <span className="font-mono">{step}</span>}
      {label}
    </span>
  );
}

function Step1Media({
  mediaList,
  isUploading,
  progress,
  error,
  onFiles,
  onRemove,
  onMove,
  onCrop,
}: {
  mediaList: WizardMedia[];
  isUploading: boolean;
  progress: Record<string, number>;
  error: string | null;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onCrop: (index: number) => void;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white/80">
        <ImagePlus className="h-4 w-4 text-cyan" />
        第一步：上传媒体
      </h3>
      <p className="mb-4 text-xs text-white/40">
        拖拽或点击上传图片/视频/PDF，可多选；支持裁剪、排序。
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
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
            onChange={(e) => onFiles(e.target.files)}
            disabled={isUploading}
          />
        </label>
      </div>

      {mediaList.length > 0 || Object.keys(progress).length > 0 ? (
        <ul className="mt-4 space-y-2">
          {mediaList.map((item, index) => (
            <li
              key={`${item.id}-${index}`}
              className="flex items-center gap-3 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2"
            >
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt={item.original_name}
                  className="h-12 w-12 rounded-md border border-white/10 object-cover"
                />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-md border border-white/10 bg-black/20">
                  <FileIcon mimeType={item.mime_type} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-white/70">{item.original_name}</p>
                <p className="text-[10px] text-white/30">{formatBytes(item.byte_size)}</p>
              </div>
              <div className="flex items-center gap-1">
                {item.mime_type.startsWith("image/") ? (
                  <button
                    type="button"
                    onClick={() => onCrop(index)}
                    className="rounded p-1.5 text-white/30 hover:bg-white/10 hover:text-white/70"
                    title="裁剪"
                  >
                    <Crop className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  className="rounded p-1.5 text-white/30 hover:bg-white/10 hover:text-white/70 disabled:opacity-20"
                  title="上移"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === mediaList.length - 1}
                  className="rounded p-1.5 text-white/30 hover:bg-white/10 hover:text-white/70 disabled:opacity-20"
                  title="下移"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="rounded p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                  title="移除"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
          {Object.entries(progress)
            .filter(([name]) => !mediaList.some((u) => u.original_name === name))
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
    </div>
  );
}

function Step2Metadata({
  title,
  setTitle,
  slug,
  setSlug,
  subtitle,
  setSubtitle,
  year,
  setYear,
  client,
  setClient,
  summary,
  setSummary,
  palette,
  setPalette,
  status,
  setStatus,
  categories,
  selectedCategoryIds,
  setSelectedCategoryIds,
  tags,
  selectedTagIds,
  setSelectedTagIds,
  isSuggesting,
  onTitleBlur,
}: {
  title: string;
  setTitle: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  subtitle: string;
  setSubtitle: (v: string) => void;
  year: string;
  setYear: (v: string) => void;
  client: string;
  setClient: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
  palette: string;
  setPalette: (v: string) => void;
  status: "draft" | "published" | "private";
  setStatus: (v: "draft" | "published" | "private") => void;
  categories: WizardCategory[];
  selectedCategoryIds: Set<string>;
  setSelectedCategoryIds: (s: Set<string>) => void;
  tags: WizardTag[];
  selectedTagIds: Set<string>;
  setSelectedTagIds: (s: Set<string>) => void;
  isSuggesting: boolean;
  onTitleBlur: () => void;
}) {
  const toggleCategory = (id: string) => {
    const next = new Set(selectedCategoryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCategoryIds(next);
  };

  const toggleTag = (id: string) => {
    const next = new Set(selectedTagIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTagIds(next);
  };

  return (
    <div>
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white/80">
        <Check className="h-4 w-4 text-cyan" />
        第二步：作品信息
      </h3>
      <p className="mb-4 text-xs text-white/40">填写标题、分类、标签、配色方案等元数据。</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative">
          <label className="grid gap-2 text-sm">
            <span className="text-white/58">标题 *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              placeholder="作品标题"
              className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
            />
          </label>
          {isSuggesting ? (
            <Loader2 className="absolute right-3 top-[34px] h-4 w-4 animate-spin text-white/30" />
          ) : null}
        </div>
        <label className="grid gap-2 text-sm">
          <span className="text-white/58">URL Slug *</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-slug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 font-mono text-sm outline-none focus:border-cyan"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-white/58">副标题</span>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="一句话说明"
            className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-white/58">年份</span>
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2026"
            className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-white/58">客户 / 品牌</span>
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="客户名称"
            className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-white/58">默认状态</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published" | "private")}
            className={`min-h-10 rounded-md border px-3 text-sm font-medium outline-none transition ${
              status === "published"
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : status === "draft"
                  ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                  : "border-slate-400/40 bg-slate-400/10 text-slate-300"
            }`}
          >
            <option value="draft" className="bg-neutral-900 text-yellow-300">草稿</option>
            <option value="published" className="bg-neutral-900 text-emerald-300">已发布</option>
            <option value="private" className="bg-neutral-900 text-slate-300">私密</option>
          </select>
        </label>
      </div>

      <label className="mt-4 grid gap-2 text-sm">
        <span className="text-white/58">摘要</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="作品简要介绍…"
          className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
        />
      </label>

      <label className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-white/58">配色方案</span>
          <span className="font-mono text-[10px] uppercase text-white/28">逗号分隔的 hex 值，例如 #FF6B35, #1A1A2E</span>
        </div>
        <input
          value={palette}
          onChange={(e) => setPalette(e.target.value)}
          placeholder="#FF6B35, #1A1A2E"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 font-mono text-sm outline-none focus:border-cyan"
        />
      </label>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-medium text-white/75">作品分类</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <p className="text-xs text-white/38">暂无分类</p>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    selectedCategoryIds.has(cat.id)
                      ? "border-cyan/40 bg-cyan/15 text-cyan"
                      : "border-white/10 text-white/55 hover:border-white/25 hover:text-white/80"
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-white/75">标签</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="text-xs text-white/38">暂无标签</p>
            ) : (
              tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    selectedTagIds.has(tag.id)
                      ? "border-cyan/40 bg-cyan/15 text-cyan"
                      : "border-white/10 text-white/55 hover:border-white/25 hover:text-white/80"
                  }`}
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function Step3Summary({
  mediaList,
  title,
  slug,
  isPending,
}: {
  mediaList: WizardMedia[];
  title: string;
  slug: string;
  isPending: boolean;
}) {
  return (
    <div>
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white/80">
        <Check className="h-4 w-4 text-cyan" />
        第三步：确认创建
      </h3>
      <p className="mb-4 text-xs text-white/40">确认后将创建作品草稿并跳转到编辑器继续排版。</p>

      <div className="rounded-md border border-white/10 bg-black/20 p-4">
        <div className="grid gap-3 text-sm">
          <div className="flex gap-3">
            <span className="w-16 shrink-0 text-white/40">标题</span>
            <span className="text-white/80">{title || "（未填写）"}</span>
          </div>
          <div className="flex gap-3">
            <span className="w-16 shrink-0 text-white/40">Slug</span>
            <span className="font-mono text-white/80">{slug || "（未填写）"}</span>
          </div>
          <div className="flex gap-3">
            <span className="w-16 shrink-0 text-white/40">媒体</span>
            <span className="text-white/80">{mediaList.length} 个文件</span>
          </div>
        </div>
      </div>

      {isPending ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-cyan">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          正在创建作品…
        </p>
      ) : null}
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("video/")) return <FileVideo className="h-5 w-5 text-red-400" />;
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-orange-400" />;
  return <FileImage className="h-5 w-5 text-green-400" />;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
