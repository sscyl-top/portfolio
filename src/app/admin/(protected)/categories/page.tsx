import { Eye, EyeOff, Plus, Save, Trash2, FolderOpen, Tag as TagIcon } from "lucide-react";

import { SaveButton } from "@/components/admin/SaveButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  updateCategory,
  updateTag,
} from "./actions";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
};

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ toast?: string; id?: string }> }) {
  const { toast, id } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [
    { data: categories, error: categoryError },
    { data: tags, error: tagError },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,sort_order,is_visible")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("tags")
      .select("id,name,slug")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
            Taxonomy
          </p>
          <h2 className="mt-2 text-2xl font-semibold">分类与标签</h2>
          <p className="mt-1.5 text-xs text-white/48">
            分类控制作品筛选和前台显示顺序；标签用于作品细分。
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/34">
            Active
          </p>
          <p className="mt-0.5 text-xs text-white/64">
            {(categories ?? []).length} 分类 / {(tags ?? []).length} 标签
          </p>
        </div>
      </div>

      {categoryError || tagError ? (
        <p className="mt-4 rounded-md border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-200">
          读取失败：{categoryError?.message ?? tagError?.message}
        </p>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <CategoryPanel categories={(categories ?? []) as CategoryRow[]} toast={toast} savedId={id} />
          <TagPanel tags={(tags ?? []) as TagRow[]} toast={toast} savedId={id} />
        </div>
      )}
    </div>
  );
}

const inputCls = "h-9 w-full rounded-md border border-white/10 bg-black/20 px-2.5 text-sm outline-none focus:border-cyan";
const btnSm = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md";

function CategoryPanel({ categories, toast, savedId }: { categories: CategoryRow[]; toast?: string; savedId?: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-cyan/10">
          <FolderOpen className="h-4 w-4 text-cyan" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/85">作品分类</h3>
          <p className="text-[11px] text-white/40">{categories.length} 项 · 控制前台筛选与排序</p>
        </div>
      </div>

      <form action={createCategory} className="mt-4 flex flex-wrap items-center gap-1.5">
        <input name="name" required maxLength={80} placeholder="分类名称" className={`${inputCls} min-w-0 flex-1`} />
        <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="url-slug" className={`${inputCls} w-32 font-mono text-xs`} />
        <input name="sort_order" type="number" defaultValue={categories.length} className={`${inputCls} w-16 text-center font-mono`} aria-label="排序" />
        <label className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs text-white/62">
          <input name="is_visible" type="checkbox" defaultChecked className="size-3.5 accent-cyan" />
          可见
        </label>
        <SaveButton className={`${btnSm} px-3`}><Plus aria-hidden="true" className="h-3.5 w-3.5" />新增</SaveButton>
      </form>

      <div className="mt-3 space-y-1.5">
        {categories.length === 0 ? (
          <p className="grid h-32 place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/30">
            暂无分类
          </p>
        ) : (
          categories.map((category) => (
            <CategoryRow key={category.id} category={category} saved={toast === "category-saved" && savedId === category.id} />
          ))
        )}
      </div>
    </section>
  );
}

function CategoryRow({ category, saved }: { category: CategoryRow; saved?: boolean }) {
  const formId = `cat-${category.id}`;
  return (
    <form id={formId} action={updateCategory} className="flex flex-wrap items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 transition hover:border-white/18 hover:bg-white/[0.04]">
      <input type="hidden" name="id" value={category.id} />
      <input
        name="sort_order" type="number" defaultValue={category.sort_order}
        className="h-8 w-12 rounded border border-white/10 bg-black/25 px-1.5 text-center font-mono text-xs outline-none focus:border-cyan"
        aria-label={`${category.name} 排序`} form={formId}
      />
      <input
        name="name" required maxLength={80} defaultValue={category.name}
        className={`h-8 min-w-0 flex-1 rounded border border-white/10 bg-black/25 px-2 text-sm outline-none focus:border-cyan`} form={formId}
      />
      <input
        name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={category.slug}
        className={`h-8 w-28 rounded border border-white/10 bg-black/25 px-2 font-mono text-xs outline-none focus:border-cyan`} form={formId}
      />
      <label className="inline-flex h-8 items-center gap-1 rounded border border-white/10 bg-black/25 px-2 text-[11px] text-white/60">
        <input name="is_visible" type="checkbox" defaultChecked={category.is_visible} className="size-3.5 accent-cyan" form={formId} />
        {category.is_visible ? <Eye className="h-3 w-3 text-cyan" /> : <EyeOff className="h-3 w-3 text-white/35" />}
      </label>
      {saved ? <span className="rounded bg-green-400/90 px-1.5 py-0.5 text-[10px] font-medium text-black">已保存</span> : null}
      <SaveButton variant="outline" size="sm" form={formId} saved={saved} className="h-8 px-2 text-[11px]"><Save aria-hidden="true" className="h-3 w-3" />保存</SaveButton>
      <DeleteButton action={deleteCategory} id={category.id} />
    </form>
  );
}

function TagPanel({ tags, toast, savedId }: { tags: TagRow[]; toast?: string; savedId?: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-cyan/10">
          <TagIcon className="h-4 w-4 text-cyan" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/85">标签</h3>
          <p className="text-[11px] text-white/40">{tags.length} 项 · 作品细分关键词</p>
        </div>
      </div>

      <form action={createTag} className="mt-4 flex flex-wrap items-center gap-1.5">
        <input name="name" required maxLength={80} placeholder="标签名称" className={`${inputCls} min-w-0 flex-1`} />
        <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="url-slug" className={`${inputCls} w-40 font-mono text-xs`} />
        <SaveButton className={`${btnSm} px-3`}><Plus aria-hidden="true" className="h-3.5 w-3.5" />新增</SaveButton>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <p className="grid h-32 w-full place-items-center rounded-md border border-dashed border-white/10 text-xs text-white/30">
            暂无标签
          </p>
        ) : (
          tags.map((tag) => <TagChip key={tag.id} tag={tag} saved={toast === "tag-saved" && savedId === tag.id} />)
        )}
      </div>
    </section>
  );
}

function TagChip({ tag, saved }: { tag: TagRow; saved?: boolean }) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-white/10 bg-white/[0.03] transition hover:border-white/20">
      <form id={`tag-${tag.id}`} action={updateTag} className="flex items-center">
        <input type="hidden" name="id" value={tag.id} />
        <input
          name="name" required maxLength={80} defaultValue={tag.name}
          className="h-8 min-w-0 w-[92px] border-r border-white/8 bg-transparent px-2 text-xs text-white/80 outline-none focus:bg-black/30"
          form={`tag-${tag.id}`} title={tag.name}
        />
        <input
          name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={tag.slug}
          className="h-8 w-20 min-w-0 bg-transparent px-2 font-mono text-[10px] text-white/40 outline-none focus:bg-black/30 focus:text-white/70"
          form={`tag-${tag.id}`}
        />
      </form>
      {saved ? <span className="flex items-center bg-green-400/90 px-1.5 text-[10px] font-medium text-black">已保存</span> : null}
      <SaveButton variant="cyan" size="sm" form={`tag-${tag.id}`} saved={saved} className="h-8 rounded-none border-l border-white/10 px-2 text-[10px] text-cyan hover:bg-cyan/10"><Save className="h-3 w-3" /></SaveButton>
      <DeleteButton action={deleteTag} id={tag.id} />
    </div>
  );
}

function DeleteButton({ action: deleteAction, id }: { action: (formData: FormData) => void | Promise<void>; id: string }) {
  return (
    <form action={deleteAction}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="flex h-8 w-8 items-center justify-center text-white/30 transition hover:bg-red-500/20 hover:text-red-300" title="删除">
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
