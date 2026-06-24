import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";

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

export default async function AdminCategoriesPage() {
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
            Taxonomy
          </p>
          <h2 className="mt-3 text-3xl font-semibold">分类与标签</h2>
          <p className="mt-3 text-sm text-white/48">
            分类控制作品筛选和前台显示顺序；标签用于作品细分。
          </p>
        </div>
        <div className="rounded-md border border-white/10 px-3 py-2 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/34">
            Active
          </p>
          <p className="mt-1 text-sm text-white/64">
            {(categories ?? []).length} 分类 / {(tags ?? []).length} 标签
          </p>
        </div>
      </div>

      {categoryError || tagError ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          读取失败：{categoryError?.message ?? tagError?.message}
        </p>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.58fr)]">
          <CategoryPanel categories={(categories ?? []) as CategoryRow[]} />
          <TagPanel tags={(tags ?? []) as TagRow[]} />
        </div>
      )}
    </div>
  );
}

function CategoryPanel({ categories }: { categories: CategoryRow[] }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-white/80">作品分类</h3>
        <span className="font-mono text-xs text-white/34">
          {categories.length} items
        </span>
      </div>

      <form
        action={createCategory}
        className="mt-3 grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_6rem_auto]"
      >
        <input
          name="name"
          required
          maxLength={80}
          placeholder="分类名称"
          className={fieldClassName}
        />
        <input
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="url-slug"
          className={`${fieldClassName} font-mono`}
        />
        <input
          name="sort_order"
          type="number"
          defaultValue={categories.length}
          className={fieldClassName}
          aria-label="排序"
        />
        <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/62">
          <input
            name="is_visible"
            type="checkbox"
            defaultChecked
            className="size-4 accent-cyan"
          />
          可见
        </label>
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          <Plus aria-hidden="true" className="h-4 w-4" />
          新增
        </button>
      </form>

      <div className="mt-4 overflow-x-auto border-y border-white/10">
        {categories.length === 0 ? (
          <p className="grid min-h-48 place-items-center text-sm text-white/38">
            暂无分类。可以先到作品页导入当前作品。
          </p>
        ) : (
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="font-mono text-[10px] uppercase text-white/36">
              <tr>
                <th className="py-3 pr-3 font-normal">Order</th>
                <th className="px-3 py-3 font-normal">Name</th>
                <th className="px-3 py-3 font-normal">Slug</th>
                <th className="px-3 py-3 font-normal">Visibility</th>
                <th className="py-3 pl-3 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {categories.map((category) => (
                <CategoryRowEditor key={category.id} category={category} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function CategoryRowEditor({ category }: { category: CategoryRow }) {
  return (
    <tr className="align-middle">
      <td className="py-3 pr-3">
        <form id={`category-${category.id}`} action={updateCategory}>
          <input type="hidden" name="id" value={category.id} />
          <input
            name="sort_order"
            type="number"
            defaultValue={category.sort_order}
            className="min-h-10 w-20 rounded-md border border-white/10 bg-black/20 px-3 font-mono text-sm outline-none focus:border-cyan"
            aria-label={`${category.name} 排序`}
          />
        </form>
      </td>
      <td className="px-3 py-3">
        <input
          form={`category-${category.id}`}
          name="name"
          required
          maxLength={80}
          defaultValue={category.name}
          className={fieldClassName}
        />
      </td>
      <td className="px-3 py-3">
        <input
          form={`category-${category.id}`}
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={category.slug}
          className={`${fieldClassName} font-mono`}
        />
      </td>
      <td className="px-3 py-3">
        <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/62">
          <input
            form={`category-${category.id}`}
            name="is_visible"
            type="checkbox"
            defaultChecked={category.is_visible}
            className="size-4 accent-cyan"
          />
          {category.is_visible ? (
            <Eye aria-hidden="true" className="h-4 w-4 text-cyan" />
          ) : (
            <EyeOff aria-hidden="true" className="h-4 w-4 text-white/36" />
          )}
          {category.is_visible ? "可见" : "隐藏"}
        </label>
      </td>
      <td className="py-3 pl-3">
        <div className="flex justify-end gap-2">
          <button
            form={`category-${category.id}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-cyan/30 px-3 text-sm text-cyan transition hover:bg-cyan/10"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            保存
          </button>
          <form action={deleteCategory}>
            <input type="hidden" name="id" value={category.id} />
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-300/25 px-3 text-sm text-red-200 transition hover:bg-red-300/10">
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              删除
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function TagPanel({ tags }: { tags: TagRow[] }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-white/80">标签</h3>
        <span className="font-mono text-xs text-white/34">
          {tags.length} items
        </span>
      </div>

      <form
        action={createTag}
        className="mt-3 grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <input
          name="name"
          required
          maxLength={80}
          placeholder="标签名称"
          className={fieldClassName}
        />
        <input
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="url-slug"
          className={`${fieldClassName} font-mono`}
        />
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          <Plus aria-hidden="true" className="h-4 w-4" />
          新增
        </button>
      </form>

      <div className="mt-4 grid gap-3">
        {tags.length === 0 ? (
          <p className="grid min-h-48 place-items-center border-y border-white/10 text-sm text-white/38">
            暂无标签。
          </p>
        ) : (
          tags.map((tag) => <TagRowEditor key={tag.id} tag={tag} />)
        )}
      </div>
    </section>
  );
}

function TagRowEditor({ tag }: { tag: TagRow }) {
  return (
    <article className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <form
        id={`tag-${tag.id}`}
        action={updateTag}
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <input type="hidden" name="id" value={tag.id} />
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={tag.name}
          className={fieldClassName}
        />
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={tag.slug}
          className={`${fieldClassName} font-mono`}
        />
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-cyan/30 px-3 text-sm text-cyan transition hover:bg-cyan/10">
          <Save aria-hidden="true" className="h-4 w-4" />
          保存
        </button>
      </form>
      <form action={deleteTag} className="mt-2 flex justify-end">
        <input type="hidden" name="id" value={tag.id} />
        <button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-300/25 px-3 text-xs text-red-200 transition hover:bg-red-300/10">
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          删除
        </button>
      </form>
    </article>
  );
}

const fieldClassName =
  "min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan";
