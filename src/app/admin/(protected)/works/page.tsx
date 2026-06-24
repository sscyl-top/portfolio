import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WorkWizard } from "@/components/admin/WorkWizard";
import { WorkBatchManager } from "@/components/admin/WorkBatchToolbar";
import { publishScheduledWorks } from "./actions";

type AdminWorkRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "private";
  year: string;
  sort_order: number;
  is_representative: boolean;
  is_composite: boolean;
  updated_at: string;
};

type TaxonomyRow = {
  id: string;
  name: string;
};

type Section = "all" | "representative" | "composite";
type StatusFilter = "all" | "draft" | "published" | "private";

export default async function AdminWorksPage({
  searchParams,
}: {
  searchParams: Promise<{
    seeded?: string;
    seedError?: string;
    section?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const { seeded, seedError, section: rawSection = "all", status: rawStatus = "all", q = "" } = await searchParams;
  const section: Section = ["all", "representative", "composite"].includes(rawSection ?? "all")
    ? (rawSection as Section)
    : "all";
  const status: StatusFilter = ["all", "draft", "published", "private"].includes(rawStatus ?? "all")
    ? (rawStatus as StatusFilter)
    : "all";
  const query = q.trim().toLowerCase();

  const supabase = await createSupabaseServerClient();
  const [
    { data, error },
    { data: categoriesData },
    { data: tagsData },
  ] = await Promise.all([
    supabase
      .from("works")
      .select(
        "id,title,slug,status,year,sort_order,is_representative,is_composite,updated_at",
      )
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("id,name").is("deleted_at", null).order("sort_order", { ascending: true }),
    supabase.from("tags").select("id,name").is("deleted_at", null).order("name", { ascending: true }),
  ]);
  const works = (data ?? []) as AdminWorkRow[];
  const categories = (categoriesData ?? []) as TaxonomyRow[];
  const tags = (tagsData ?? []) as TaxonomyRow[];

  // 根据 section / status / query 筛选作品
  const filteredWorks = works.filter((work) => {
    if (section === "representative" && !work.is_representative) return false;
    if (section === "composite" && !work.is_composite) return false;
    if (status !== "all" && work.status !== status) return false;
    if (query) {
      const haystack = `${work.title} ${work.slug} ${work.year}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
            Works
          </p>
          <h2 className="mt-3 text-3xl font-semibold">作品</h2>
          <p className="mt-3 text-sm text-white/48">
            {works.length} 个 CMS 作品，支持从当前静态作品一键导入。
          </p>
        </div>
        <form action="/admin/works/seed" method="post">
          <button
            type="submit"
            className="min-h-10 rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10"
          >
            导入当前作品
          </button>
        </form>
      </div>

      {seeded ? (
        <p className="mt-5 rounded-md border border-cyan/25 bg-cyan/10 p-3 text-sm text-cyan">
          当前静态作品已导入 CMS。
        </p>
      ) : null}
      {seedError ? (
        <p className="mt-5 rounded-md border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-200">
          导入失败：{seedError}
        </p>
      ) : null}

      {/* 板块筛选选项卡 */}
      <SectionTabs currentSection={section} worksCount={works.length} filteredCount={filteredWorks.length} />

      <WorkWizard categories={categories} tags={tags} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <FilterBar currentStatus={status} query={query} />
        <form action={publishScheduledWorks}>
          <button
            type="submit"
            className="min-h-10 rounded-md border border-white/10 px-4 text-sm text-white/70 transition hover:border-cyan/30 hover:text-cyan"
          >
            发布到期草稿
          </button>
        </form>
      </div>

      {error ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          作品读取失败：{error.message}
        </p>
      ) : (
        <WorkBatchManager works={filteredWorks} />
      )}
    </div>
  );
}

function FilterBar({
  currentStatus,
  query,
}: {
  currentStatus: StatusFilter;
  query: string;
}) {
  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "全部状态" },
    { value: "draft", label: "草稿" },
    { value: "published", label: "已发布" },
    { value: "private", label: "私密" },
  ];

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <form className="contents">
        <select
          name="status"
          defaultValue={currentStatus}
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
        >
          {statusOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="搜索标题 / slug / 年份"
          className="min-h-10 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan sm:min-w-64"
        />
        <button
          type="submit"
          className="min-h-10 rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10"
        >
          筛选
        </button>
      </form>
    </div>
  );
}

function SectionTabs({
  currentSection,
  worksCount,
  filteredCount,
}: {
  currentSection: Section;
  worksCount: number;
  filteredCount: number;
}) {
  const sections: { key: Section; label: string }[] = [
    { key: "all", label: "全部作品" },
    { key: "representative", label: "代表作" },
    { key: "composite", label: "复合设计" },
  ];

  return (
    <div className="mt-6 border-b border-white/10">
      <div className="flex gap-1">
        {sections.map(({ key, label }) => {
          const isActive = currentSection === key;
          return (
            <Link
              key={key}
              href={`/admin/works?section=${key}`}
              className={`relative px-4 py-3 text-sm transition ${
                isActive
                  ? "text-white"
                  : "text-white/45 hover:text-white/75"
              }`}
            >
              {label}
              {isActive ? (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
              ) : null}
            </Link>
          );
        })}
      </div>
      <p className="mt-3 pb-4 text-xs text-white/34">
        {filteredCount === worksCount
          ? `共 ${worksCount} 个作品`
          : `显示 ${filteredCount} 个作品（共 ${worksCount} 个）`}
      </p>
    </div>
  );
}
