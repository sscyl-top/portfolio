import { createSupabaseServerClient } from "@/lib/supabase/server";

import { savePageSettings } from "./actions";
import { HomeSectionOrderEditor } from "./HomeSectionOrderEditor";

type PageRow = {
  id?: string;
  slug: "home" | "works" | "resume";
  title: string;
  modules: Array<PageModule>;
  seo_title: string;
  seo_description: string;
};

type PageModule = {
  id: string;
  type: string;
  sort_order: number;
  is_visible: boolean;
  settings: Record<string, unknown>;
};

const SECTION_ORDER_MODULE_ID = "home-section-order";

function getHomeSectionOrder(modules: PageModule[]): Array<"hero" | "capabilities"> {
  const sectionOrderModule = modules.find((m) => m.id === SECTION_ORDER_MODULE_ID);
  const sections = sectionOrderModule?.settings?.sections;
  const validSections: Array<"hero" | "capabilities"> = ["hero", "capabilities"];
  if (Array.isArray(sections)) {
    const filtered = sections.filter((s): s is "hero" | "capabilities" =>
      validSections.includes(s as "hero" | "capabilities"),
    );
    const remaining = validSections.filter((s) => !filtered.includes(s));
    return [...filtered, ...remaining];
  }
  return validSections;
}

const defaultPages: PageRow[] = [
  {
    slug: "home",
    title: "首页",
    modules: [],
    seo_title: "首页",
    seo_description: "",
  },
  {
    slug: "works",
    title: "作品",
    modules: [],
    seo_title: "全部作品",
    seo_description: "",
  },
  {
    slug: "resume",
    title: "简历",
    modules: [],
    seo_title: "简历",
    seo_description: "",
  },
];

const labels = {
  home: "首页",
  works: "作品页",
  resume: "简历页",
};

export default async function AdminPagesPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id,slug,title,modules,seo_title,seo_description")
    .order("slug", { ascending: true });
  const pageBySlug = new Map(
    ((data ?? []) as PageRow[]).map((page) => [page.slug, page]),
  );
  const pages = defaultPages.map((page) => pageBySlug.get(page.slug) ?? page);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Pages
      </p>
      <h2 className="mt-3 text-3xl font-semibold">页面</h2>
      <p className="mt-3 text-sm text-white/48">
        先管理首页、作品页和简历页的标题与 SEO；模块化内容编辑会接在这里继续扩展。
      </p>

      {error ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          页面读取失败：{error.message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4">
        {pages.map((page) => (
          <div key={page.slug}>
            <form
              action={savePageSettings}
              className="rounded-md border border-white/10 bg-white/[0.035] p-5"
            >
              <input type="hidden" name="slug" value={page.slug} />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase text-white/36">
                    {page.slug}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">
                    {labels[page.slug]}
                  </h3>
                </div>
                <button className="min-h-10 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
                  保存
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field label="页面标题" name="title" defaultValue={page.title} />
                <Field
                  label="SEO 标题"
                  name="seo_title"
                  defaultValue={page.seo_title}
                />
                <Field
                  label="SEO 描述"
                  name="seo_description"
                  defaultValue={page.seo_description}
                />
              </div>

              <p className="mt-4 font-mono text-[10px] text-white/30">
                {page.modules.length} modules
              </p>
            </form>

            {page.slug === "home" ? (
              <section className="mt-4 rounded-md border border-white/10 bg-white/[0.035] p-5">
                <div>
                  <h4 className="text-sm font-medium text-white/80">首页板块排序</h4>
                  <p className="mt-1 text-xs text-white/40">
                    调整首页 Hero 首屏与专业能力板块的显示顺序。
                  </p>
                </div>
                <HomeSectionOrderEditor initialOrder={getHomeSectionOrder(page.modules)} />
              </section>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={name === "title"}
        className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
    </label>
  );
}
