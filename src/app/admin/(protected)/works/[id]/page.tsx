import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { listWorkVersions } from "@/lib/cms/versions";
import type { WorkVersionListItem } from "@/lib/cms/versions";
import { VisualBlockEditor } from "@/components/admin/VisualBlockEditor";
import { VersionHistoryPanel } from "@/components/admin/VersionHistoryPanel";
import { Toast } from "@/components/admin/Toast";
import { ToastHandler } from "@/components/admin/ToastHandler";
import { CollapsibleSection } from "@/components/admin/CollapsibleSection";

import {
  clearPrivatePreviewLink,
  deleteWork,
  generatePrivatePreviewLink,
  updateWork,
  updateWorkMedia,
  updateWorkTaxonomy,
} from "../actions";

type WorkEditorRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  year: string;
  client: string;
  status: "draft" | "published" | "private";
  palette: string[];
  is_representative: boolean;
  representative_order: number | null;
  is_composite: boolean;
  composite_order: number | null;
  sort_order: number;
  cover_media_id: string | null;
  hover_media_id: string | null;
  share_media_id: string | null;
  seo_title: string;
  seo_description: string;
  scheduled_publish_at: string | null;
  updated_at: string;
};

type WorkBlockRow = {
  id: string;
  block_type: "text" | "media" | "gallery" | "video" | "pdf" | "before_after";
  sort_order: number;
  is_visible: boolean;
  payload: Record<string, unknown>;
};

type TaxonomyOptionRow = {
  id: string;
  name: string;
  slug: string;
  sort_order?: number;
};

type WorkCategoryRow = {
  category_id: string;
};

type WorkTagRow = {
  tag_id: string;
};

type MediaOptionRow = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  alt_text: string;
};

export default async function AdminWorkEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ privatePreview?: string; toast?: string }>;
}) {
  const { id } = await params;
  const { privatePreview, toast } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [
    { data: work },
    { data: blocks },
    { data: categories },
    { data: tags },
    { data: mediaAssets },
    { data: workCategories },
    { data: workTags },
    versions,
  ] = await Promise.all([
    supabase
      .from("works")
      .select(
        "id,slug,title,subtitle,summary,year,client,status,palette,is_representative,representative_order,is_composite,composite_order,sort_order,cover_media_id,hover_media_id,share_media_id,seo_title,seo_description,scheduled_publish_at,updated_at",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("work_blocks")
      .select("id,block_type,sort_order,is_visible,payload")
      .eq("work_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("categories")
      .select("id,name,slug,sort_order")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("tags")
      .select("id,name,slug")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("media_assets")
      .select("id,storage_key,mime_type,original_name,alt_text")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("work_categories").select("category_id").eq("work_id", id),
    supabase.from("work_tags").select("tag_id").eq("work_id", id),
    listWorkVersions(supabase, id),
  ]);

  if (!work) notFound();

  const workRow = work as WorkEditorRow;
  const blockRows = (blocks ?? []) as WorkBlockRow[];
  const categoryRows = (categories ?? []) as TaxonomyOptionRow[];
  const mediaRows = (mediaAssets ?? []) as MediaOptionRow[];
  const tagRows = (tags ?? []) as TaxonomyOptionRow[];
  const versionRows = (versions ?? []) as WorkVersionListItem[];
  const selectedCategoryIds = new Set(
    ((workCategories ?? []) as WorkCategoryRow[]).map((item) => item.category_id),
  );
  const selectedTagIds = new Set(
    ((workTags ?? []) as WorkTagRow[]).map((item) => item.tag_id),
  );

  return (
    <div>
      {toast ? <ToastHandler message={toast} /> : null}

      {/* 顶栏：返回 + 删除 */}
      <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
        <Link
          href="/admin/works"
          className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回作品列表
        </Link>
        <form action={deleteWork}>
          <input type="hidden" name="id" value={workRow.id} />
          <button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-300/20 px-3 text-xs text-red-300 transition hover:bg-red-300/10">
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            删除作品
          </button>
        </form>
      </div>

      {/* 主布局：红框（编辑区，约束宽度）| 蓝框（辅助选项，填满剩余空间） */}
      <div className="mt-8 flex gap-8 lg:gap-10">
        {/* ═══ 红框：标题 + 文案 + 内容编辑器（统一编辑画布，max-w 约束） ═══ */}
        <div className="min-w-0 space-y-6" style={{ maxWidth: 960 }}>
          {/* 标题输入（站酷风格） */}
          <div>
            <div className="flex items-end gap-4">
              <input
                id="work-title"
                name="title"
                defaultValue={workRow.title}
                required
                placeholder="输入作品名称"
                className="flex-1 border-0 bg-transparent pb-2 text-3xl font-light text-white outline-none placeholder:text-white/22 focus:outline-none md:text-4xl"
                form="mainWorkForm"
              />
              <span className="shrink-0 pb-2 font-mono text-xs text-white/22 tabular-nums">{(workRow.title ?? "").length}</span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/40">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px]">+</span>
              可以直接输入文字，在这里介绍你的作品
            </p>
          </div>

          {/* 设计说明文案 */}
          <label className="block">
            <span className="sr-only">设计说明</span>
            <textarea
              name="summary"
              defaultValue={workRow.summary}
              rows={4}
              placeholder="可对文字和图片进行自由排版，点击下方 ⊕ 可选择你需要的功能（图片 / 视频 / 文本 / 图库）"
              className="w-full resize-y rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-white/70 outline-none placeholder:text-white/20 focus:border-cyan/30"
              form="mainWorkForm"
            />
          </label>

          {/* 内容块编辑器 — 核心自由排版区域 */}
          <VisualBlockEditor
            workId={workRow.id}
            workSlug={workRow.slug}
            initialBlocks={blockRows}
            mediaAssets={mediaRows}
          />

          {/* 隐藏表单字段（title 和 summary 已在上面通过 form 关联提交） */}
          <form id="mainWorkForm" action={updateWork} className="sr-only">
            <input type="hidden" name="id" value={workRow.id} />
            <input type="hidden" name="slug" value={workRow.slug} />
            <input type="hidden" name="subtitle" defaultValue={workRow.subtitle} />
            <input type="hidden" name="year" defaultValue={workRow.year} />
            <input type="hidden" name="client" defaultValue={workRow.client} />
            <input type="hidden" name="sort_order" defaultValue={String(workRow.sort_order)} />
            <input type="hidden" name="status" defaultValue={workRow.status} />
            <input type="hidden" name="scheduled_publish_at" defaultValue={workRow.scheduled_publish_at ?? ""} />
            <input type="hidden" name="is_representative" defaultChecked={workRow.is_representative} />
            <input type="hidden" name="is_composite" defaultChecked={workRow.is_composite} />
            <input type="hidden" name="seo_title" defaultValue={workRow.seo_title} />
            <input type="hidden" name="seo_description" defaultValue={workRow.seo_description} />
            {workRow.palette.length > 0 && (
              <input type="hidden" name="palette" defaultValue={workRow.palette.join(", ")} />
            )}
            <button type="submit">保存</button>
          </form>
        </div>

        {/* ═══ 蓝框：所有辅助选项（flex-1 填满红框右侧剩余空间） ═══ */}
        <div className="min-w-0 flex-1 space-y-4" style={{ maxWidth: 360 }}>
          {/* 私密预览 */}
          <PrivatePreviewForm previewPath={privatePreview} work={workRow} />
          {/* 媒体选择 */}
          <MediaForm mediaAssets={mediaRows} work={workRow} />
          {/* 分类与标签（折叠） */}
          <CollapsibleSection
            title="分类与标签"
            action={
              <span className="text-[10px] text-white/30">
                {selectedCategoryIds.size + selectedTagIds.size} 项已选
              </span>
            }
          >
            <TaxonomyForm
              categories={categoryRows}
              selectedCategoryIds={selectedCategoryIds}
              selectedTagIds={selectedTagIds}
              tags={tagRows}
              work={workRow}
            />
          </CollapsibleSection>
          {/* 更多设置（折叠） */}
          <CollapsibleSection title="更多设置" description="Slug、年份、客户、状态、SEO 等">
            <SettingsPanel work={workRow} />
          </CollapsibleSection>
          {/* 版本历史（折叠） */}
          <VersionHistoryPanel
            workId={workRow.id}
            workSlug={workRow.slug}
            versions={versionRows}
          />
        </div>
      </div>
    </div>
  );
}

function PrivatePreviewForm({
  previewPath,
  work,
}: {
  previewPath?: string;
  work: WorkEditorRow;
}) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const previewUrl = previewPath ? `${origin}${previewPath}` : null;

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.035] p-4">
      <h3 className="text-sm font-semibold text-white/80">私密预览</h3>

      {previewUrl ? (
        <div className="mt-2 rounded-md border border-cyan/25 bg-cyan/10 p-2.5">
          <p className="text-xs text-cyan">私密链接（仅显示一次）</p>
          <code className="mt-1 block break-all rounded-md bg-black/30 p-2 text-[10px] text-white/72">
            {previewUrl}
          </code>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={clearPrivatePreviewLink}>
          <input type="hidden" name="work_id" value={work.id} />
          <input type="hidden" name="work_slug" value={work.slug} />
          <button className="min-h-8 rounded-md border border-white/12 px-3 text-xs text-white/58 transition hover:border-white/30 hover:text-white">
            清除链接
          </button>
        </form>
        <form action={generatePrivatePreviewLink}>
          <input type="hidden" name="work_id" value={work.id} />
          <input type="hidden" name="work_slug" value={work.slug} />
          <button className="min-h-8 rounded-md border border-cyan/35 px-3 text-xs text-cyan transition hover:bg-cyan/10">
            生成链接
          </button>
        </form>
      </div>
    </section>
  );
}

function MediaForm({
  mediaAssets,
  work,
}: {
  mediaAssets: MediaOptionRow[];
  work: WorkEditorRow;
}) {
  const assetById = new Map(mediaAssets.map((a) => [a.id, a]));
  const selectedCover = work.cover_media_id
    ? assetById.get(work.cover_media_id)
    : null;
  const selectedHover = work.hover_media_id
    ? assetById.get(work.hover_media_id)
    : null;
  const selectedShare = work.share_media_id
    ? assetById.get(work.share_media_id)
    : null;

  return (
    <form
      action={updateWorkMedia}
      className="rounded-md border border-white/10 bg-white/[0.035] p-4"
    >
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <h3 className="text-sm font-semibold text-white/80">作品媒体</h3>

      <div className="mt-3 grid gap-3">
        <MediaSelect
          label="封面"
          name="cover_media_id"
          assets={mediaAssets}
          defaultValue={work.cover_media_id ?? ""}
          selectedAsset={selectedCover ?? null}
        />
        <MediaSelect
          label="悬停预览"
          name="hover_media_id"
          assets={mediaAssets}
          defaultValue={work.hover_media_id ?? ""}
          selectedAsset={selectedHover ?? null}
        />
        <MediaSelect
          label="分享图"
          name="share_media_id"
          assets={mediaAssets}
          defaultValue={work.share_media_id ?? ""}
          selectedAsset={selectedShare ?? null}
        />
      </div>

      <div className="mt-3 flex justify-end">
        <button className="min-h-8 rounded-md border border-cyan/35 px-3 text-xs text-cyan transition hover:bg-cyan/10">
          保存媒体
        </button>
      </div>
    </form>
  );
}
function MediaSelect({
  assets,
  defaultValue,
  label,
  name,
  selectedAsset,
}: {
  assets: MediaOptionRow[];
  defaultValue: string;
  label: string;
  name: string;
  selectedAsset: MediaOptionRow | null;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>

      {selectedAsset ? (
        <MediaSelectPreview
          storageKey={selectedAsset.storage_key}
          mimeType={selectedAsset.mime_type}
          alt={selectedAsset.alt_text || selectedAsset.original_name}
          name={selectedAsset.original_name}
        />
      ) : (
        <span className="grid h-28 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
          未选择
        </span>
      )}

      <select
        name={name}
        defaultValue={defaultValue}
        className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      >
        <option value="">未选择</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.original_name}
          </option>
        ))}
      </select>
      {assets.length === 0 ? (
        <span className="text-xs text-white/34">媒体库暂无素材。</span>
      ) : null}
    </div>
  );
}

function MediaSelectPreview({
  storageKey,
  mimeType,
  alt,
  name,
}: {
  storageKey: string;
  mimeType: string;
  alt: string;
  name: string;
}) {
  const url = buildPublicMediaUrl(storageKey);

  if (mimeType.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        className="h-28 w-full rounded-md border border-white/10 object-cover"
      />
    );
  }

  if (mimeType.startsWith("video/")) {
    return (
      <video
        src={url}
        muted
        playsInline
        className="h-28 w-full rounded-md border border-white/10 object-cover"
      />
    );
  }

  return (
    <span className="grid h-28 place-items-center rounded-md border border-white/10 bg-black/30 text-xs text-white/40">
      {name || "file"}
    </span>
  );
}

/* ═══════ 蓝框组件：辅助面板（紧凑版） ═══════ */

/** 更多设置面板：Slug/年份/客户/状态/Palette/SEO 等 */
function SettingsPanel({ work }: { work: WorkEditorRow }) {
  return (
    <form action={updateWork} className="grid gap-4">
      <input type="hidden" name="id" value={work.id} />
      <input type="hidden" name="slug" value={work.slug} />

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="副标题" name="subtitle" defaultValue={work.subtitle} compact />
        <Field label="年份" name="year" defaultValue={work.year} compact />
        <Field label="客户" name="client" defaultValue={work.client} compact />
        <Field label="排序" name="sort_order" type="number" defaultValue={String(work.sort_order)} compact />
      </div>

      <PaletteEditor palette={work.palette} />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs">
          <span className="text-white/50">状态</span>
          <select
            name="status"
            defaultValue={work.status}
            className="min-h-8 rounded border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
          >
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="private">私密</option>
          </select>
        </label>
        <CheckField label="代表作" name="is_representative" defaultChecked={work.is_representative} compact />
        <CheckField label="复合设计" name="is_composite" defaultChecked={work.is_composite} compact />
        <Field label="SEO 标题" name="seo_title" defaultValue={work.seo_title} compact />
      </div>

      <Field label="SEO 描述" name="seo_description" defaultValue={work.seo_description} compact />

      <div className="flex justify-end pt-1">
        <button className="min-h-8 rounded-md bg-cyan px-4 text-xs font-medium text-black transition hover:bg-white">
          保存设置
        </button>
      </div>
    </form>
  );
}

/** 紧凑版字段 */
function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  compact = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  type?: string;
  compact?: boolean;
}) {
  return (
    <label className={`grid gap-1 ${compact ? "text-xs" : "text-sm"}`}>
      <span className="text-white/50">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className={`min-h-8 rounded border border-white/10 bg-black/20 px-2.5 ${compact ? "text-xs" : "text-sm"} outline-none focus:border-cyan`}
      />
    </label>
  );
}

function PaletteEditor({ palette }: { palette: string[] }) {
  const hexString = palette.join(", ");

  return (
    <label className="grid gap-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-white/58">色板 Palette</span>
        <span className="font-mono text-[10px] uppercase text-white/28">
          逗号分隔的 hex 值，例如 #FF6B35, #1A1A2E
        </span>
      </div>
      {palette.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {palette.map((color, i) => (
            <span
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded border border-white/15 text-[9px] font-mono text-white/60"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      ) : null}
      <textarea
        name="palette"
        defaultValue={hexString}
        rows={2}
        placeholder="#FF6B35, #1A1A2E, #E2E2E2"
        className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm font-mono outline-none focus:border-cyan"
      />
    </label>
  );
}

function TaxonomyForm({
  categories,
  selectedCategoryIds,
  selectedTagIds,
  tags,
  work,
}: {
  categories: TaxonomyOptionRow[];
  selectedCategoryIds: Set<string>;
  selectedTagIds: Set<string>;
  tags: TaxonomyOptionRow[];
  work: WorkEditorRow;
}) {
  return (
    <form action={updateWorkTaxonomy} className="grid gap-4">
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />

      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset>
          <legend className="text-xs font-medium text-white/60 uppercase tracking-wider">分类</legend>
          <div className="mt-2 grid gap-1.5">
            {categories.length === 0 ? (
              <p className="py-4 text-xs text-white/35">
                暂无分类
              </p>
            ) : (
              categories.map((category) => (
                <CheckField
                  key={category.id}
                  label={category.name}
                  name="category_ids"
                  value={category.id}
                  defaultChecked={selectedCategoryIds.has(category.id)}
                />
              ))
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium text-white/60 uppercase tracking-wider">标签</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.length === 0 ? (
              <p className="py-4 text-xs text-white/35">
                暂无标签
              </p>
            ) : (
              tags.map((tag) => (
                <CheckField
                  key={tag.id}
                  label={tag.name}
                  name="tag_ids"
                  value={tag.id}
                  defaultChecked={selectedTagIds.has(tag.id)}
                />
              ))
            )}
          </div>
        </fieldset>
      </div>

      <div className="flex justify-end">
        <button className="min-h-8 rounded-md border border-cyan/35 px-3 text-xs text-cyan transition hover:bg-cyan/10">
          保存
        </button>
      </div>
    </form>
  );
}

function toDatetimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function CheckField({
  label,
  name,
  defaultChecked,
  value = "on",
  compact = false,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
  value?: string;
  compact?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 self-end rounded border border-white/10 bg-black/20 px-2 ${compact ? "min-h-7 text-xs text-white/60" : "min-h-10 gap-3 px-3 text-sm text-white/68"}`}>
      <input
        name={name}
        type="checkbox"
        value={value}
        defaultChecked={defaultChecked}
        className={`accent-cyan ${compact ? "h-3 w-3" : "h-4 w-4"}`}
      />
      {label}
    </label>
  );
}

