import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createDraftWork } from "./actions";

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

export default async function AdminWorksPage({
  searchParams,
}: {
  searchParams: Promise<{ seeded?: string; seedError?: string; section?: string }>;
}) {
  const { seeded, seedError, section: rawSection = "all" } = await searchParams;
  const section: Section = ["all", "representative", "composite"].includes(rawSection ?? "all")
    ? (rawSection as Section)
    : "all";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("works")
    .select(
      "id,title,slug,status,year,sort_order,is_representative,is_composite,updated_at",
    )
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .order("updated_at", { ascending: false });
  const works = (data ?? []) as AdminWorkRow[];

  // 根据 section 筛选作品
  const filteredWorks = works.filter((work) => {
    if (section === "representative") return work.is_representative;
    if (section === "composite") return work.is_composite;
    return true;
  });

  return (
    <div>
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

      <form
        action={createDraftWork}
        className="mt-6 grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_0.8fr_0.35fr_auto]"
      >
        {/* 根据当前板块预设置作品属性 */}
        {section === "representative" ? (
          <input type="hidden" name="is_representative" value="true" />
        ) : null}
        {section === "composite" ? (
          <input type="hidden" name="is_composite" value="true" />
        ) : null}
        
        <input
          name="title"
          required
          placeholder="作品标题"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
        />
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="url-slug"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 font-mono text-sm outline-none focus:border-cyan"
        />
        <input
          name="year"
          placeholder="年份"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
        />
        <button className="min-h-10 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white">
          新建草稿
        </button>
      </form>

      {error ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          作品读取失败：{error.message}
        </p>
      ) : (
        <WorkTable works={filteredWorks} />
      )}
    </div>
  );
}

function WorkTable({ works }: { works: AdminWorkRow[] }) {
  if (works.length === 0) {
    return (
      <div className="mt-6 grid min-h-64 place-items-center border-y border-white/10 text-sm text-white/38">
        暂无 CMS 作品。可以先导入当前作品，或新建一个草稿。
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto border-y border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="font-mono text-[10px] uppercase text-white/36">
          <tr>
            <th className="py-3 pr-4 font-normal">Title</th>
            <th className="px-4 py-3 font-normal">Status</th>
            <th className="px-4 py-3 font-normal">Year</th>
            <th className="px-4 py-3 font-normal">Placement</th>
            <th className="py-3 pl-4 font-normal">Public URL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {works.map((work) => (
            <tr key={work.id} className="align-top">
              <td className="py-4 pr-4">
                <Link
                  href={`/admin/works/${work.id}`}
                  className="font-medium text-white transition hover:text-cyan"
                >
                  {work.title}
                </Link>
                <p className="mt-1 font-mono text-xs text-white/36">
                  {work.slug}
                </p>
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={work.status} />
              </td>
              <td className="px-4 py-4 text-white/56">{work.year || "-"}</td>
              <td className="px-4 py-4 text-white/56">
                {[
                  work.is_representative ? "代表作" : null,
                  work.is_composite ? "复合设计" : null,
                ]
                  .filter(Boolean)
                  .join(" / ") || "-"}
              </td>
              <td className="py-4 pl-4">
                {work.status === "published" ? (
                  <Link
                    href={`/works/${work.slug}`}
                    className="text-cyan hover:text-white"
                  >
                    查看
                  </Link>
                ) : (
                  <span className="text-white/28">未公开</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminWorkRow["status"] }) {
  const label = {
    draft: "草稿",
    published: "已发布",
    private: "私密",
  }[status];

  return (
    <span className="rounded-full border border-white/12 px-2.5 py-1 text-xs text-white/62">
      {label}
    </span>
  );
}

type Section = "all" | "representative" | "composite";

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
