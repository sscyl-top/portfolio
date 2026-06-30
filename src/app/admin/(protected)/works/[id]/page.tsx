import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listWorkVersions } from "@/lib/cms/versions";
import type { WorkVersionListItem } from "@/lib/cms/versions";
import { VisualBlockEditor } from "@/components/admin/VisualBlockEditor";
import { VersionHistoryPanel } from "@/components/admin/VersionHistoryPanel";
import { Toast } from "@/components/admin/Toast";
import { ToastHandler } from "@/components/admin/ToastHandler";
import { CollapsibleSection } from "@/components/admin/CollapsibleSection";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { WorkMediaSelect } from "@/components/admin/WorkMediaSelect";
import { DetachedResizablePanels } from "@/components/admin/DetachedResizablePanels";
import { AutoSaveForm } from "@/components/admin/AutoSaveForm";
import { SaveWorkCard } from "@/components/admin/SaveWorkCard";

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

  // 注意：work tables 迁移在 actions.ts 保存失败时重试

  let work: WorkEditorRow | null = null;
  let blocks: WorkBlockRow[] = [];
  let categories: TaxonomyOptionRow[] = [];
  let tags: TaxonomyOptionRow[] = [];
  let mediaAssets: MediaOptionRow[] = [];
  let workCategories: WorkCategoryRow[] = [];
  let workTags: WorkTagRow[] = [];
  let mediaNoGap = false;
  let versions: WorkVersionListItem[] = [];

  try {
    const [
      workResult,
      blocksResult,
      categoriesResult,
      tagsResult,
      mediaResult,
      workCategoriesResult,
      workTagsResult,
      mediaNoGapResult,
      versionsResult,
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
      supabase
        .from("text_content")
        .select("content")
        .eq("key", `work_media_no_gap_${id}`)
        .eq("page", "work_settings")
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
      listWorkVersions(supabase, id),
    ]);

    work = workResult.data as WorkEditorRow | null;
    blocks = (blocksResult.data ?? []) as WorkBlockRow[];
    categories = (categoriesResult.data ?? []) as TaxonomyOptionRow[];
    tags = (tagsResult.data ?? []) as TaxonomyOptionRow[];
    mediaAssets = (mediaResult.data ?? []) as MediaOptionRow[];
    workCategories = (workCategoriesResult.data ?? []) as WorkCategoryRow[];
    workTags = (workTagsResult.data ?? []) as WorkTagRow[];
    mediaNoGap = mediaNoGapResult.data?.content === "true";
    versions = versionsResult ?? [];
  } catch (err) {
    console.error("[WorkEditor] Failed to load work data:", err);
  }

  if (!work) notFound();

  const workRow = work as WorkEditorRow;
  const blockRows = blocks;
  const categoryRows = categories;
  const mediaRows = mediaAssets;
  const tagRows = tags;
  const versionRows = versions;
  const selectedCategoryIds = new Set(
    workCategories.map((item) => item.category_id),
  );
  const selectedTagIds = new Set(
    workTags.map((item) => item.tag_id),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {toast ? <ToastHandler message={toast} /> : null}

      {/* ══ 顶部工具栏：返回 + 删除 ══ */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/8 pb-4">
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

      {/* ══ 可拖拽分栏：中间编辑区(flex-1, 最大1420px与前台一致) + 右侧功能面板(固定宽度可拖拽) ══ */}
      <div className="mt-6 min-h-0 flex-1">
        <DetachedResizablePanels
          gap={18}
          panels={[
            {
              id: "admin-work-editor-content",
              storageKey: "admin-work-editor-content-width-v4",
              anchor: "left",
              offset: 0,
              defaultWidth: 1420,
              minWidth: 420,
              maxWidth: 1420,
              resizeEdge: "right",
              className: "h-full",
              children: (
                <div className="admin-scroll-area h-full overflow-x-hidden overflow-y-auto pr-5">
                  <div className="w-full rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 md:p-8">
                    <form id="mainWorkForm" action={updateWork}>
                      <input type="hidden" name="id" value={workRow.id} />
                      <input type="hidden" name="slug" value={workRow.slug} />
                      <input type="hidden" name="archive_on_save" value="1" />

                      <div className="border-b border-white/[0.06] pb-5">
                        <div className="flex items-end gap-4">
                          <input
                            id="work-title"
                            name="title"
                            defaultValue={workRow.title}
                            required
                            placeholder="输入作品名称"
                            className="flex-1 border-0 bg-transparent pb-1 text-3xl font-light text-white outline-none placeholder:text-white/22 focus:outline-none md:text-4xl"
                          />
                        </div>
                        <div className="mt-1">
                          <input
                            id="work-subtitle"
                            name="subtitle"
                            defaultValue={workRow.subtitle}
                            placeholder="副标题（卡片下方显示，如：从0到1构建科技品牌视觉体系）"
                            className="w-full border-0 bg-transparent pb-0 text-base text-white/55 outline-none placeholder:text-white/20 focus:outline-none md:text-lg"
                          />
                        </div>
                      </div>

                      <div className="pt-5">
                        <label className="block">
                          <span className="sr-only">设计说明</span>
                          <textarea
                            name="summary"
                            defaultValue={workRow.summary}
                            rows={3}
                            placeholder="可以直接输入文字，在这里介绍你的作品理念、设计思路或项目背景。"
                            className="w-full resize-y border-0 bg-transparent px-0 text-sm leading-relaxed text-white/65 outline-none placeholder:text-white/20 focus:outline-none"
                          />
                        </label>
                      </div>
                    </form>
                  </div>

                  <div className="-mx-0 mt-2 bg-[#181a1e] pt-4">
                    <VisualBlockEditor
                      workId={workRow.id}
                      workSlug={workRow.slug}
                      initialBlocks={blockRows}
                      mediaAssets={mediaRows}
                      embedded
                    />
                  </div>
                </div>
              ),
            },
            {
              id: "admin-work-editor-tools",
              storageKey: "admin-work-editor-tools-width-v4",
              anchor: "right",
              offset: 0,
              defaultWidth: 420,
              minWidth: 260,
              maxWidth: 620,
              resizeEdge: "left",
              className: "h-full",
              children: (
                <div className="admin-scroll-area h-full space-y-3 overflow-x-hidden overflow-y-auto pl-5 pr-3">
                  <div className="grid gap-3 xl:grid-cols-2">
                    <SaveWorkCard updatedAt={workRow.updated_at} />
                    <PrivatePreviewForm previewPath={privatePreview} work={workRow} />
                  </div>
                  <MediaForm mediaAssets={mediaRows} work={workRow} />
                  <CollapsibleSection
                    title="更多设置"
                    description="Slug、年份、客户、状态、SEO 等"
                    defaultOpen
                  >
                    <SettingsPanel work={workRow} mediaNoGap={mediaNoGap} />
                  </CollapsibleSection>
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
                  <VersionHistoryPanel
                    workId={workRow.id}
                    workSlug={workRow.slug}
                    versions={versionRows}
                  />
                </div>
              ),
            },
          ]}
        />
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
    <section className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <h3 className="text-sm font-semibold text-white/80">私密预览</h3>

      {previewUrl ? (
        <div className="mt-2 rounded-md border border-cyan/25 bg-cyan/10 p-2.5">
          <p className="text-xs text-cyan">私密链接（仅显示一次）</p>
          <code className="mt-1 block break-all rounded-md bg-black/30 p-2 text-[10px] text-white/72">
            {previewUrl}
          </code>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        <form action={clearPrivatePreviewLink}>
          <input type="hidden" name="work_id" value={work.id} />
          <input type="hidden" name="work_slug" value={work.slug} />
          <button className="min-h-8 w-full rounded-md border border-white/12 px-2.5 text-xs text-white/58 transition hover:border-white/30 hover:text-white">
            清除链接
          </button>
        </form>
        <form action={generatePrivatePreviewLink}>
          <input type="hidden" name="work_id" value={work.id} />
          <input type="hidden" name="work_slug" value={work.slug} />
          <button className="min-h-8 w-full rounded-md border border-cyan/35 px-2.5 text-xs text-cyan transition hover:bg-cyan/10">
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
  const isComposite = work.is_composite;

  return (
    <form
      action={updateWorkMedia}
      className="rounded-md border border-white/10 bg-white/[0.035] p-3"
    >
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <h3 className="text-sm font-semibold text-white/80">作品媒体</h3>

      <div className="mt-3">
        {isComposite ? (
          <div className="grid grid-cols-2 gap-2">
            <WorkMediaSelect
              label="封面"
              name="cover_media_id"
              assets={mediaAssets}
              defaultValue={work.cover_media_id ?? ""}
              compact
              autoSave
            />
            <WorkMediaSelect
              label="悬停预览图 (hover时显示，支持GIF)"
              name="hover_media_id"
              assets={mediaAssets}
              defaultValue={work.hover_media_id ?? ""}
              compact
              autoSave
            />
          </div>
        ) : (
          <WorkMediaSelect
            label="封面"
            name="cover_media_id"
            assets={mediaAssets}
            defaultValue={work.cover_media_id ?? ""}
            autoSave
          />
        )}
        {!isComposite && (
          <input type="hidden" name="hover_media_id" value="" />
        )}
        <input type="hidden" name="share_media_id" value="" />
      </div>
    </form>
  );
}

/* ═══════ 蓝框组件：辅助面板（紧凑版） ═══════ */

/** 更多设置面板：Slug/年份/客户/状态/Palette/SEO 等 */
function SettingsPanel({ work, mediaNoGap }: { work: WorkEditorRow; mediaNoGap: boolean }) {
  return (
    <AutoSaveForm action={updateWork} className="grid gap-4">
      <input type="hidden" name="id" value={work.id} />
      <input type="hidden" name="slug" value={work.slug} />

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="年份" name="year" defaultValue={work.year} compact />
        <Field label="客户" name="client" defaultValue={work.client} compact />
        <Field label="排序" name="sort_order" type="number" defaultValue={String(work.sort_order)} compact />
      </div>

      <PaletteEditor palette={work.palette} />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs">
          <span className="text-white/50">状态</span>
          <StatusSelect name="status" defaultValue={work.status as "draft" | "published" | "private"} />
        </label>
        <CheckField label="代表作" name="is_representative" defaultChecked={work.is_representative} compact />
        <CheckField label="早期作品" name="is_composite" defaultChecked={work.is_composite} compact />
        <CheckField label="图片无间距" name="media_no_gap" defaultChecked={mediaNoGap} compact />
        <Field label="SEO 标题" name="seo_title" defaultValue={work.seo_title} compact />
      </div>

      <Field label="SEO 描述" name="seo_description" defaultValue={work.seo_description} compact />
    </AutoSaveForm>
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
    <AutoSaveForm action={updateWorkTaxonomy} className="grid gap-4">
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />

      <div className="grid gap-4">
        <fieldset>
          <legend className="text-xs font-medium text-white/60 uppercase tracking-wider">分类</legend>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {categories.length === 0 ? (
              <p className="py-4 text-xs text-white/35 col-span-3">
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
                  compact
                />
              ))
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium text-white/60 uppercase tracking-wider">标签</legend>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {tags.length === 0 ? (
              <p className="py-4 text-xs text-white/35 col-span-4">
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
                  compact
                />
              ))
            )}
          </div>
        </fieldset>
      </div>
    </AutoSaveForm>
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
    <label className={`flex items-center gap-1.5 self-end rounded border border-white/10 bg-black/20 ${compact ? "min-h-7 px-1.5 text-xs text-white/60" : "min-h-10 gap-3 px-3 text-sm text-white/68"}`}>
      <input
        name={name}
        type="checkbox"
        value={value}
        defaultChecked={defaultChecked}
        className={`accent-cyan flex-shrink-0 ${compact ? "h-3 w-3" : "h-4 w-4"}`}
      />
      <span className="truncate">{label}</span>
    </label>
  );
}
