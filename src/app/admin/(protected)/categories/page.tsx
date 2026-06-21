import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const [{ data: categories, error: categoryError }, { data: tags }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id,name,slug,sort_order,is_visible")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
      supabase
        .from("tags")
        .select("id,name,slug")
        .is("deleted_at", null)
        .order("name", { ascending: true }),
    ]);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Taxonomy
      </p>
      <h2 className="mt-3 text-3xl font-semibold">分类与标签</h2>
      <p className="mt-3 text-sm text-white/48">
        分类控制作品筛选和前台显示顺序；标签用于作品细分。
      </p>

      {categoryError ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          分类读取失败：{categoryError.message}
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.7fr]">
          <CategoryList categories={(categories ?? []) as CategoryRow[]} />
          <TagList tags={(tags ?? []) as TagRow[]} />
        </div>
      )}
    </div>
  );
}

function CategoryList({ categories }: { categories: CategoryRow[] }) {
  return (
    <section>
      <h3 className="text-sm font-medium text-white/80">作品分类</h3>
      <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
        {categories.length === 0 ? (
          <p className="py-8 text-sm text-white/38">
            暂无分类。可以先到作品页导入当前作品。
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="grid gap-3 py-3 text-sm md:grid-cols-[3rem_1fr_auto]"
            >
              <span className="font-mono text-white/34">
                {category.sort_order}
              </span>
              <div>
                <p className="text-white">{category.name}</p>
                <p className="mt-1 font-mono text-xs text-white/34">
                  {category.slug}
                </p>
              </div>
              <span className="text-white/48">
                {category.is_visible ? "前台可见" : "已隐藏"}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TagList({ tags }: { tags: TagRow[] }) {
  return (
    <section>
      <h3 className="text-sm font-medium text-white/80">标签</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="border-y border-white/10 py-8 text-sm text-white/38">
            暂无标签。
          </p>
        ) : (
          tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/58"
            >
              {tag.name}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
