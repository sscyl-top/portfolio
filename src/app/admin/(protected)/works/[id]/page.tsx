import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { MediaPicker } from "@/components/admin/MediaPicker";

import { SlugInput } from "./SlugInput";
import { BlockListWrapper } from "./BlockListWrapper";

import {
  createTextBlock,
  clearPrivatePreviewLink,
  deleteWork,
  deleteWorkBlock,
  generatePrivatePreviewLink,
  updateTextBlock,
  updateWork,
  createGalleryBlock,
  createMediaBlock,
  createVideoBlock,
  createBeforeAfterBlock,
  updateMediaBlock,
  updateVideoBlock,
  updateBeforeAfterBlock,
  updateGalleryBlock,
  updateWorkMedia,
  updateWorkTaxonomy,
  createPdfBlock,
  updatePdfBlock,
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
  searchParams: Promise<{ privatePreview?: string }>;
}) {
  const { id } = await params;
  const { privatePreview } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [
    { data: work },
    { data: blocks },
    { data: categories },
    { data: tags },
    { data: mediaAssets },
    { data: workCategories },
    { data: workTags },
  ] = await Promise.all([
    supabase
      .from("works")
      .select(
        "id,slug,title,subtitle,summary,year,client,status,palette,is_representative,representative_order,is_composite,composite_order,sort_order,cover_media_id,hover_media_id,share_media_id,seo_title,seo_description,updated_at",
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
  ]);

  if (!work) notFound();

  const workRow = work as WorkEditorRow;
  const blockRows = (blocks ?? []) as WorkBlockRow[];
  const categoryRows = (categories ?? []) as TaxonomyOptionRow[];
  const mediaRows = (mediaAssets ?? []) as MediaOptionRow[];
  const tagRows = (tags ?? []) as TaxonomyOptionRow[];
  const selectedCategoryIds = new Set(
    ((workCategories ?? []) as WorkCategoryRow[]).map((item) => item.category_id),
  );
  const selectedTagIds = new Set(
    ((workTags ?? []) as WorkTagRow[]).map((item) => item.tag_id),
  );

  return (
    <div>
      <Link
        href="/admin/works"
        className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回作品列表
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
            Work editor
          </p>
          <h2 className="mt-3 text-3xl font-semibold">{workRow.title}</h2>
          <p className="mt-3 font-mono text-xs text-white/38">{workRow.slug}</p>
        </div>
        <form action={deleteWork}>
          <input type="hidden" name="id" value={workRow.id} />
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-300/20 px-4 text-sm text-red-200 transition hover:bg-red-300/10">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            删除
          </button>
        </form>
      </div>

      <WorkForm work={workRow} />
      <PrivatePreviewForm previewPath={privatePreview} work={workRow} />
      <MediaForm mediaAssets={mediaRows} work={workRow} />
      <TaxonomyForm
        categories={categoryRows}
        selectedCategoryIds={selectedCategoryIds}
        selectedTagIds={selectedTagIds}
        tags={tagRows}
        work={workRow}
      />
      <BlockEditor work={workRow} blocks={blockRows} mediaAssets={mediaRows} />
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
    <section className="mt-6 grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5">
      <div>
        <h3 className="text-xl font-semibold text-white">私密预览</h3>
        <p className="mt-2 text-sm text-white/45">
          生成带 token 的预览链接，作品不会进入公开列表；新链接会替换旧链接。
        </p>
      </div>

      {previewUrl ? (
        <div className="rounded-md border border-cyan/25 bg-cyan/10 p-4">
          <p className="text-sm text-cyan">新的私密链接只显示这一次：</p>
          <code className="mt-2 block break-all rounded-md bg-black/30 p-3 text-xs text-white/72">
            {previewUrl}
          </code>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <form action={clearPrivatePreviewLink}>
          <input type="hidden" name="work_id" value={work.id} />
          <input type="hidden" name="work_slug" value={work.slug} />
          <button className="min-h-10 rounded-md border border-white/12 px-4 text-sm text-white/58 transition hover:border-white/30 hover:text-white">
            清除私密链接
          </button>
        </form>
        <form action={generatePrivatePreviewLink}>
          <input type="hidden" name="work_id" value={work.id} />
          <input type="hidden" name="work_slug" value={work.slug} />
          <button className="min-h-10 rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
            生成私密链接
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
      className="mt-6 grid gap-5 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <div>
        <h3 className="text-xl font-semibold text-white">作品媒体</h3>
        <p className="mt-2 text-sm text-white/45">
          从媒体库选择封面、悬停预览和分享图；素材先到媒体库上传。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MediaSelect
          label="封面媒体"
          name="cover_media_id"
          assets={mediaAssets}
          defaultValue={work.cover_media_id ?? ""}
          selectedAsset={selectedCover ?? null}
        />
        <MediaSelect
          label="悬停媒体"
          name="hover_media_id"
          assets={mediaAssets}
          defaultValue={work.hover_media_id ?? ""}
          selectedAsset={selectedHover ?? null}
        />
        <MediaSelect
          label="分享媒体"
          name="share_media_id"
          assets={mediaAssets}
          defaultValue={work.share_media_id ?? ""}
          selectedAsset={selectedShare ?? null}
        />
      </div>

      <div className="flex justify-end">
        <button className="min-h-10 rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
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

function WorkForm({ work }: { work: WorkEditorRow }) {
  return (
    <form
      action={updateWork}
      className="mt-6 grid gap-5 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="id" value={work.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="标题" name="title" defaultValue={work.title} required />
        <SlugInput defaultValue={work.slug} />
        <Field label="副标题" name="subtitle" defaultValue={work.subtitle} />
        <Field label="年份" name="year" defaultValue={work.year} />
        <Field label="客户" name="client" defaultValue={work.client} />
        <Field
          label="排序"
          name="sort_order"
          type="number"
          defaultValue={String(work.sort_order)}
        />
      </div>

      <label className="grid gap-2 text-sm">
        <span className="text-white/58">摘要</span>
        <textarea
          name="summary"
          defaultValue={work.summary}
          rows={4}
          className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
        />
      </label>

      <PaletteEditor palette={work.palette} />

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="text-white/58">状态</span>
          <select
            name="status"
            defaultValue={work.status}
            className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
          >
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="private">私密</option>
          </select>
        </label>
        <CheckField
          label="代表作"
          name="is_representative"
          defaultChecked={work.is_representative}
        />
        <Field
          label="代表作排序"
          name="representative_order"
          type="number"
          defaultValue={work.representative_order?.toString() ?? ""}
        />
        <CheckField
          label="复合设计"
          name="is_composite"
          defaultChecked={work.is_composite}
        />
        <Field
          label="复合设计排序"
          name="composite_order"
          type="number"
          defaultValue={work.composite_order?.toString() ?? ""}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="SEO 标题" name="seo_title" defaultValue={work.seo_title} />
        <Field
          label="SEO 描述"
          name="seo_description"
          defaultValue={work.seo_description}
        />
      </div>

      <div className="flex justify-end">
        <button className="min-h-10 rounded-md bg-cyan px-5 text-sm font-medium text-black transition hover:bg-white">
          保存作品
        </button>
      </div>
    </form>
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
    <form
      action={updateWorkTaxonomy}
      className="mt-6 grid gap-5 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <div>
        <h3 className="text-xl font-semibold text-white">分类与标签</h3>
        <p className="mt-2 text-sm text-white/45">
          控制作品归属、列表筛选和前台标签展示。
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-medium text-white/75">作品分类</legend>
          <div className="mt-3 grid gap-2">
            {categories.length === 0 ? (
              <p className="border-y border-white/10 py-6 text-sm text-white/38">
                暂无分类。可以先到“分类与标签”导入或创建分类。
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
          <legend className="text-sm font-medium text-white/75">标签</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="border-y border-white/10 py-6 text-sm text-white/38">
                暂无标签。
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
        <button className="min-h-10 rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
          保存分类与标签
        </button>
      </div>
    </form>
  );
}

function BlockEditor({
  blocks,
  mediaAssets,
  work,
}: {
  blocks: WorkBlockRow[];
  mediaAssets: MediaOptionRow[];
  work: WorkEditorRow;
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">内容块</h3>
          <p className="mt-2 text-sm text-white/45">
            当前版本支持文本块、媒体块与图库块编辑；视频和 PDF 块会继续接入。
          </p>
        </div>
      </div>

      <form
        action={createTextBlock}
        className="mt-4 grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
      >
        <input type="hidden" name="work_id" value={work.id} />
        <input type="hidden" name="work_slug" value={work.slug} />
        <div className="grid gap-4 md:grid-cols-[1fr_8rem_auto]">
          <Field label="标题" name="heading" defaultValue="" required />
          <Field
            label="排序"
            name="sort_order"
            type="number"
            defaultValue={String(blocks.length)}
          />
          <label className="flex min-h-10 items-center gap-3 self-end rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/68">
            <input
              name="is_visible"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 accent-cyan"
            />
            可见
          </label>
        </div>
        <label className="grid gap-2 text-sm">
          <span className="text-white/58">正文</span>
          <textarea
            name="body"
            required
            rows={5}
            className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
          />
        </label>
        <div className="flex justify-end">
          <button className="min-h-10 rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
            新增文本块
          </button>
        </div>
      </form>

      
      <form
        action={createMediaBlock}
        className="mt-4 grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
      >
        <input type="hidden" name="work_id" value={work.id} />
        <input type="hidden" name="work_slug" value={work.slug} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">新增媒体块</span>
          <span className="font-mono text-[10px] uppercase text-white/28">media</span>
        </div>
        <MediaPicker
          assets={mediaAssets}
          mode="single"
          fieldName="media_id"
        />
        <div className="flex flex-wrap items-end gap-3">
          <Field label="排序" name="sort_order" type="number" defaultValue={String(blocks.length)} />
          <CheckField label="可见" name="is_visible" defaultChecked />
          <button className="min-h-10 self-end rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
            添加媒体块
          </button>
        </div>
        <Field label="说明文字" name="caption" defaultValue="" />
      </form>
      <form
        action={createGalleryBlock}
        className="mt-4 grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
      >
        <input type="hidden" name="work_id" value={work.id} />
        <input type="hidden" name="work_slug" value={work.slug} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">新增图库块</span>
          <span className="font-mono text-[10px] uppercase text-white/28">gallery</span>
        </div>
        <MediaPicker
          assets={mediaAssets}
          mode="multi"
          fieldName="media_ids"
        />
        <div className="flex flex-wrap items-end gap-3">
          <Field label="排序" name="sort_order" type="number" defaultValue={String(blocks.length)} />
          <CheckField label="可见" name="is_visible" defaultChecked />
          <button className="min-h-10 self-end rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
            添加图库块
          </button>
        </div>
        <Field label="说明文字" name="caption" defaultValue="" />
      </form>
      <form
        action={createVideoBlock}
        className="mt-4 grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
      >
        <input type="hidden" name="work_id" value={work.id} />
        <input type="hidden" name="work_slug" value={work.slug} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">新增视频块</span>
          <span className="font-mono text-[10px] uppercase text-white/28">video</span>
        </div>
        <MediaPicker
          assets={mediaAssets}
          mode="single"
          fieldName="media_id"
        />
        <div className="flex flex-wrap items-end gap-3">
          <Field label="排序" name="sort_order" type="number" defaultValue={String(blocks.length)} />
          <CheckField label="可见" name="is_visible" defaultChecked />
          <button className="min-h-10 self-end rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
            添加视频块
          </button>
        </div>
        <Field label="说明文字" name="caption" defaultValue="" />
      </form>
      <form
        action={createBeforeAfterBlock}
        className="mt-4 grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
      >
        <input type="hidden" name="work_id" value={work.id} />
        <input type="hidden" name="work_slug" value={work.slug} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">新增 Before/After 块</span>
          <span className="font-mono text-[10px] uppercase text-white/28">before_after</span>
        </div>
        <p className="text-sm text-white/38">
          先选 After（修改后），再选 Before（修改前）。前台会渲染为左右对比滑块。
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <span className="mb-2 block text-sm text-white/58">Before（修改前）</span>
            <MediaPicker
              assets={mediaAssets}
              mode="single"
              fieldName="before_media_id"
            />
          </div>
          <div>
            <span className="mb-2 block text-sm text-white/58">After（修改后）</span>
            <MediaPicker
              assets={mediaAssets}
              mode="single"
              fieldName="after_media_id"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="排序" name="sort_order" type="number" defaultValue={String(blocks.length)} />
          <CheckField label="可见" name="is_visible" defaultChecked />
          <button className="min-h-10 self-end rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
            添加 Before/After 块
          </button>
        </div>
        <Field label="说明文字" name="caption" defaultValue="" />
      </form>
      <form
        action={createPdfBlock}
        className="mt-4 grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
      >
        <input type="hidden" name="work_id" value={work.id} />
        <input type="hidden" name="work_slug" value={work.slug} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">新增 PDF 块</span>
          <span className="font-mono text-[10px] uppercase text-white/28">pdf</span>
        </div>
        <MediaPicker
          assets={mediaAssets}
          mode="single"
          fieldName="media_id"
        />
        <div className="flex flex-wrap items-end gap-3">
          <Field label="排序" name="sort_order" type="number" defaultValue={String(blocks.length)} />
          <CheckField label="可见" name="is_visible" defaultChecked />
          <button className="min-h-10 self-end rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10">
            添加 PDF 块
          </button>
        </div>
        <Field label="说明文字" name="caption" defaultValue="" />
      </form>
      {blocks.length === 0 ? (
        <div className="mt-4 grid min-h-40 place-items-center border-y border-white/10 text-sm text-white/38">
          暂无内容块。
        </div>
      ) : (
        <BlockListWrapper
          blocks={blocks}
          workId={work.id}
          workSlug={work.slug}
          renderBlock={(id) => {
            const block = blocks.find((b) => b.id === id);
            if (!block) return null;
            if (block.block_type === "text") {
              return <TextBlockForm block={block} work={work} />;
            }
            if (block.block_type === "media") {
              return <MediaBlockCard block={block} mediaAssets={mediaAssets} work={work} />;
            }
            if (block.block_type === "gallery") {
              return <GalleryBlockCard block={block} mediaAssets={mediaAssets} work={work} />;
            }
            if (block.block_type === "video") {
              return <VideoBlockCard block={block} mediaAssets={mediaAssets} work={work} />;
            }
            if (block.block_type === "before_after") {
              return <BeforeAfterBlockCard block={block} mediaAssets={mediaAssets} work={work} />;
            }
            if (block.block_type === "pdf") {
              return <PdfBlockCard block={block} mediaAssets={mediaAssets} work={work} />;
            }
            return (
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm text-white/50">
                {block.block_type} 块暂未开放编辑。
              </div>
            );
          }}
        />
      )}
    </section>
  );
}

function TextBlockForm({
  block,
  work,
}: {
  block: WorkBlockRow;
  work: WorkEditorRow;
}) {
  const heading = String(block.payload.heading ?? "");
  const body = String(block.payload.body ?? "");

  return (
    <form
      action={updateTextBlock}
      className="grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="block_id" value={block.id} />
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <div className="grid gap-4 md:grid-cols-[1fr_8rem_auto_auto]">
        <Field label="标题" name="heading" defaultValue={heading} required />
        <Field
          label="排序"
          name="sort_order"
          type="number"
          defaultValue={String(block.sort_order)}
        />
        <CheckField
          label="可见"
          name="is_visible"
          defaultChecked={block.is_visible}
        />
        <button className="min-h-10 self-end rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          保存块
        </button>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="text-white/58">正文</span>
        <textarea
          name="body"
          defaultValue={body}
          rows={5}
          className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
        />
      </label>
      <div className="flex justify-end">
        <button
          formAction={deleteWorkBlock}
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-300/20 px-4 text-xs text-red-200 transition hover:bg-red-300/10"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          删除块
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
    </label>
  );
}


function GalleryBlockCard({
  block,
  mediaAssets,
  work,
}: {
  block: WorkBlockRow;
  mediaAssets: MediaOptionRow[];
  work: WorkEditorRow;
}) {
  const mediaIds: string[] = Array.isArray(block.payload.media_ids)
    ? block.payload.media_ids
    : [];
  const caption = String(block.payload.caption ?? "");
  const assets = mediaIds
    .map((id) => mediaAssets.find((a) => a.id === id))
    .filter((a): a is MediaOptionRow => Boolean(a));

  return (
    <form
      action={updateGalleryBlock}
      className="grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="block_id" value={block.id} />
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80">图库块</span>
          <span className="font-mono text-xs text-white/34">
            {mediaIds.length} 张素材
          </span>
        </div>
      </div>
      {assets.length === 0 ? (
        <span className="grid h-40 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
          未选择媒体或已删除
        </span>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {assets.map((asset) => (
            <MediaSelectPreview
              key={asset.id}
              storageKey={asset.storage_key}
              mimeType={asset.mime_type}
              alt={asset.alt_text || asset.original_name}
              name={asset.original_name}
            />
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[1fr_8rem_auto_auto]">
        <MediaPicker
          assets={mediaAssets}
          mode="multi"
          fieldName="media_ids"
          defaultValue={mediaIds}
        />
        <Field
          label="排序"
          name="sort_order"
          type="number"
          defaultValue={String(block.sort_order)}
        />
        <CheckField
          label="可见"
          name="is_visible"
          defaultChecked={block.is_visible}
        />
        <button className="min-h-10 self-end rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          保存块
        </button>
      </div>
      <Field label="说明文字" name="caption" defaultValue={caption} />
      <div className="flex justify-end">
        <button
          formAction={deleteWorkBlock}
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-300/20 px-4 text-xs text-red-200 transition hover:bg-red-300/10"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          删除块
        </button>
      </div>
    </form>
  );
}
function CheckField({
  label,
  name,
  defaultChecked,
  value = "on",
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
  value?: string;
}) {
  return (
    <label className="flex min-h-10 items-center gap-3 self-end rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/68">
      <input
        name={name}
        type="checkbox"
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-cyan"
      />
      {label}
    </label>
  );
}
function MediaBlockCard({
  block,
  mediaAssets,
  work,
}: {
  block: WorkBlockRow;
  mediaAssets: MediaOptionRow[];
  work: WorkEditorRow;
}) {
  const mediaId = String(block.payload.media_id ?? "");
  const caption = String(block.payload.caption ?? "");
  const asset = mediaAssets.find((a) => a.id === mediaId);

  return (
    <form
      action={updateMediaBlock}
      className="grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="block_id" value={block.id} />
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80">媒体块</span>
          <span className="font-mono text-[10px] uppercase text-white/28">media</span>
        </div>
        {!asset ? (
          <span className="font-mono text-xs text-red-200/60">
            绑定媒体已删除
          </span>
        ) : null}
      </div>
      {asset ? (
        <MediaSelectPreview
          storageKey={asset.storage_key}
          mimeType={asset.mime_type}
          alt={asset.alt_text || asset.original_name}
          name={asset.original_name}
        />
      ) : (
        <span className="grid h-40 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
          未选择媒体
        </span>
      )}
      <div className="grid gap-4 md:grid-cols-[1fr_8rem_auto_auto]">
        <MediaPicker
          assets={mediaAssets}
          mode="single"
          fieldName="media_id"
          defaultValue={mediaId ? [mediaId] : []}
        />
        <Field
          label="排序"
          name="sort_order"
          type="number"
          defaultValue={String(block.sort_order)}
        />
        <CheckField
          label="可见"
          name="is_visible"
          defaultChecked={block.is_visible}
        />
        <button className="min-h-10 self-end rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          保存块
        </button>
      </div>
      <Field label="说明文字" name="caption" defaultValue={caption} />
      <div className="flex justify-end">
        <button
          formAction={deleteWorkBlock}
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-300/20 px-4 text-xs text-red-200 transition hover:bg-red-300/10"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          删除块
        </button>
      </div>
    </form>
  );
}

function VideoBlockCard({
  block,
  mediaAssets,
  work,
}: {
  block: WorkBlockRow;
  mediaAssets: MediaOptionRow[];
  work: WorkEditorRow;
}) {
  const mediaId = String(block.payload.media_id ?? "");
  const caption = String(block.payload.caption ?? "");
  const asset = mediaAssets.find((a) => a.id === mediaId);

  return (
    <form
      action={updateVideoBlock}
      className="grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="block_id" value={block.id} />
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80">视频块</span>
          <span className="font-mono text-[10px] uppercase text-white/28">video</span>
        </div>
        {!asset ? (
          <span className="font-mono text-xs text-red-200/60">
            绑定媒体已删除
          </span>
        ) : null}
      </div>
      {asset ? (
        <MediaSelectPreview
          storageKey={asset.storage_key}
          mimeType={asset.mime_type}
          alt={asset.alt_text || asset.original_name}
          name={asset.original_name}
        />
      ) : (
        <span className="grid h-40 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
          未选择媒体
        </span>
      )}
      <div className="grid gap-4 md:grid-cols-[1fr_8rem_auto_auto]">
        <MediaPicker
          assets={mediaAssets}
          mode="single"
          fieldName="media_id"
          defaultValue={mediaId ? [mediaId] : []}
        />
        <Field
          label="排序"
          name="sort_order"
          type="number"
          defaultValue={String(block.sort_order)}
        />
        <CheckField
          label="可见"
          name="is_visible"
          defaultChecked={block.is_visible}
        />
        <button className="min-h-10 self-end rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          保存块
        </button>
      </div>
      <Field label="说明文字" name="caption" defaultValue={caption} />
      <div className="flex justify-end">
        <button
          formAction={deleteWorkBlock}
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-300/20 px-4 text-xs text-red-200 transition hover:bg-red-300/10"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          删除块
        </button>
      </div>
    </form>
  );
}

function BeforeAfterBlockCard({
  block,
  mediaAssets,
  work,
}: {
  block: WorkBlockRow;
  mediaAssets: MediaOptionRow[];
  work: WorkEditorRow;
}) {
  const beforeMediaId = String(block.payload.before_media_id ?? "");
  const afterMediaId = String(block.payload.after_media_id ?? "");
  const caption = String(block.payload.caption ?? "");
  const beforeAsset = mediaAssets.find((a) => a.id === beforeMediaId);
  const afterAsset = mediaAssets.find((a) => a.id === afterMediaId);

  return (
    <form
      action={updateBeforeAfterBlock}
      className="grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="block_id" value={block.id} />
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80">Before/After 块</span>
          <span className="font-mono text-[10px] uppercase text-white/28">before_after</span>
        </div>
        {(!beforeAsset || !afterAsset) ? (
          <span className="font-mono text-xs text-red-200/60">
            绑定媒体已删除
          </span>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <span className="mb-2 block text-xs text-white/48">Before（修改前）</span>
          {beforeAsset ? (
            <MediaSelectPreview
              storageKey={beforeAsset.storage_key}
              mimeType={beforeAsset.mime_type}
              alt={beforeAsset.alt_text || beforeAsset.original_name}
              name={beforeAsset.original_name}
            />
          ) : (
            <span className="grid h-28 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
              未选择
            </span>
          )}
        </div>
        <div>
          <span className="mb-2 block text-xs text-white/48">After（修改后）</span>
          {afterAsset ? (
            <MediaSelectPreview
              storageKey={afterAsset.storage_key}
              mimeType={afterAsset.mime_type}
              alt={afterAsset.alt_text || afterAsset.original_name}
              name={afterAsset.original_name}
            />
          ) : (
            <span className="grid h-28 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
              未选择
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <MediaPicker
          assets={mediaAssets}
          mode="single"
          fieldName="before_media_id"
          defaultValue={beforeMediaId ? [beforeMediaId] : []}
        />
        <MediaPicker
          assets={mediaAssets}
          mode="single"
          fieldName="after_media_id"
          defaultValue={afterMediaId ? [afterMediaId] : []}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-[8rem_auto_auto]">
        <Field
          label="排序"
          name="sort_order"
          type="number"
          defaultValue={String(block.sort_order)}
        />
        <CheckField
          label="可见"
          name="is_visible"
          defaultChecked={block.is_visible}
        />
        <button className="min-h-10 self-end rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          保存块
        </button>
      </div>
      <Field label="说明文字" name="caption" defaultValue={caption} />
      <div className="flex justify-end">
        <button
          formAction={deleteWorkBlock}
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-300/20 px-4 text-xs text-red-200 transition hover:bg-red-300/10"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          删除块
        </button>
      </div>
    </form>
  );
}

function PdfBlockCard({
  block,
  mediaAssets,
  work,
}: {
  block: WorkBlockRow;
  mediaAssets: MediaOptionRow[];
  work: WorkEditorRow;
}) {
  const mediaId = String(block.payload.media_id ?? "");
  const caption = String(block.payload.caption ?? "");
  const asset = mediaAssets.find((a) => a.id === mediaId);

  return (
    <form
      action={updatePdfBlock}
      className="grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="block_id" value={block.id} />
      <input type="hidden" name="work_id" value={work.id} />
      <input type="hidden" name="work_slug" value={work.slug} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80">PDF 块</span>
          <span className="font-mono text-[10px] uppercase text-white/28">pdf</span>
        </div>
        {!asset ? (
          <span className="font-mono text-xs text-red-200/60">
            绑定媒体已删除
          </span>
        ) : null}
      </div>
      {asset ? (
        <MediaSelectPreview
          storageKey={asset.storage_key}
          mimeType={asset.mime_type}
          alt={asset.alt_text || asset.original_name}
          name={asset.original_name}
        />
      ) : (
        <span className="grid h-40 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/26">
          未选择 PDF
        </span>
      )}
      <div className="grid gap-4 md:grid-cols-[1fr_8rem_auto_auto]">
        <MediaPicker
          assets={mediaAssets}
          mode="single"
          fieldName="media_id"
          defaultValue={mediaId ? [mediaId] : []}
        />
        <Field
          label="排序"
          name="sort_order"
          type="number"
          defaultValue={String(block.sort_order)}
        />
        <CheckField
          label="可见"
          name="is_visible"
          defaultChecked={block.is_visible}
        />
        <button className="min-h-10 self-end rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          保存块
        </button>
      </div>
      <Field label="说明文字" name="caption" defaultValue={caption} />
      <div className="flex justify-end">
        <button
          formAction={deleteWorkBlock}
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-300/20 px-4 text-xs text-red-200 transition hover:bg-red-300/10"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          删除块
        </button>
      </div>
    </form>
  );
}
