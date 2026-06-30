import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { WorkBatchManager } from "@/components/admin/WorkBatchToolbar";
import { AutoSubmitSelect } from "@/components/admin/AutoSubmitSelect";
import { RepresentativeCoverUploader } from "@/components/admin/RepresentativeCoverUploader";
import {
  publishScheduledWorks,
  assignToRepresentativeSlot,
  removeFromRepresentative,
  createEmptyWork,
} from "./actions";

type AdminWorkRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "private";
  year: string;
  sort_order: number;
  is_representative: boolean;
  is_composite: boolean;
  representative_order: number | null;
  composite_order: number | null;
  updated_at: string;
  cover_media_id: string | null;
  representative_cover_media_id?: string | null;
  category_names: string[];
};

type CoverMediaRow = {
  id: string;
  storage_key: string;
  mime_type: string;
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
    category?: string | string[];
  }>;
}) {
  const { seeded, seedError, section: rawSection = "all", status: rawStatus = "all", q = "", category = "" } = await searchParams;
  const section: Section = ["all", "representative", "composite"].includes(rawSection ?? "all")
    ? (rawSection as Section)
    : "all";
  const status: StatusFilter = ["all", "draft", "published", "private"].includes(rawStatus ?? "all")
    ? (rawStatus as StatusFilter)
    : "all";
  const query = q.trim().toLowerCase();
  const categoryFilter = Array.isArray(category) ? category[0] : category;

  const supabase = await createSupabaseServerClient();

  // 注意：representative_cover_media_id 列早已存在，迁移在 actions.ts 保存失败时重试

  const [
    { data, error },
    { data: categoriesData },
    { data: tagsData },
    { data: coverMediaData },
    { data: workCategoriesData },
  ] = await Promise.all([
    supabase
      .from("works")
      .select(
        "id,title,slug,status,year,sort_order,is_representative,is_composite,representative_order,composite_order,updated_at,cover_media_id,representative_cover_media_id",
      )
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("id,name").is("deleted_at", null).order("sort_order", { ascending: true }),
    supabase.from("tags").select("id,name").is("deleted_at", null).order("name", { ascending: true }),
    supabase
      .from("media_assets")
      .select("id,storage_key,mime_type")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("work_categories")
      .select("work_id,categories(name)")
      .is("categories.deleted_at", null),
  ]);
  let works = (data ?? []) as AdminWorkRow[];
  const categories = (categoriesData ?? []) as TaxonomyRow[];
  const tags = (tagsData ?? []) as TaxonomyRow[];
  const coverMedia = (coverMediaData ?? []) as CoverMediaRow[];

  const workCategoryMap = new Map<string, string[]>();
  for (const wc of (workCategoriesData ?? []) as Array<{ work_id: string; categories: { name: string } | { name: string }[] | null }>) {
    const names: string[] = [];
    if (wc.categories) {
      if (Array.isArray(wc.categories)) {
        for (const c of wc.categories) names.push(c.name);
      } else {
        names.push(wc.categories.name);
      }
    }
    if (names.length > 0) {
      workCategoryMap.set(wc.work_id, names);
    }
  }
  works = works.map((w) => ({
    ...w,
    category_names: workCategoryMap.get(w.id) ?? [],
  }));

  const coverMediaMap = new Map(coverMedia.map((m) => [m.id, m]));

  const getCoverUrl = (work: AdminWorkRow) => {
    const coverId = work.cover_media_id || work.representative_cover_media_id;
    if (!coverId) return null;
    const media = coverMediaMap.get(coverId);
    if (!media) return null;
    return { url: buildPublicMediaUrl(media.storage_key), mime_type: media.mime_type };
  };

  const getRepresentativeCoverUrl = (work: AdminWorkRow) => {
    if (!work.representative_cover_media_id) return null;
    const media = coverMediaMap.get(work.representative_cover_media_id);
    if (!media) return null;
    return { url: buildPublicMediaUrl(media.storage_key), mime_type: media.mime_type };
  };

  const filteredWorks = works.filter((work) => {
    if (section === "representative" && !work.is_representative) return false;
    if (section === "composite" && !work.is_composite) return false;
    if (status !== "all" && work.status !== status) return false;
    if (categoryFilter && section === "all") {
      if (categoryFilter === "__uncategorized__") {
        if (work.category_names.length > 0) return false;
      } else if (!work.category_names.includes(categoryFilter)) return false;
    }
    if (query) {
      const haystack = `${work.title} ${work.slug} ${work.year}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const filteredWorksForBatch = filteredWorks.map((w) => {
    const cover = getCoverUrl(w);
    return {
      id: w.id,
      title: w.title,
      slug: w.slug,
      status: w.status,
      year: w.year,
      is_representative: w.is_representative,
      is_composite: w.is_composite,
      cover_url: cover?.url ?? null,
      cover_mime_type: cover?.mime_type ?? null,
    };
  });

  const representativeSlots: { slot: number; work: AdminWorkRow | null }[] = Array.from({ length: 7 }, (_, i) => {
    const slotNum = i + 1;
    const work = works.find((w) => w.is_representative && w.representative_order === slotNum);
    return { slot: slotNum, work: work ?? null };
  });

  const unorderedRepresentativeWorks = works
    .filter((w) => w.is_representative && w.representative_order == null)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  for (const unorderedWork of unorderedRepresentativeWorks) {
    const emptySlot = representativeSlots.find((s) => s.work === null);
    if (emptySlot) {
      emptySlot.work = unorderedWork;
    }
  }

  const worksInSlots = new Set(representativeSlots.filter((s) => s.work).map((s) => s.work!.id));
  const nonRepresentativeWorks = works.filter((w) => !w.is_representative && !worksInSlots.has(w.id));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
            Works
          </p>
          <h2 className="mt-2 text-2xl font-semibold">作品</h2>
          <p className="mt-1.5 text-xs text-white/48">
            {works.length} 个 CMS 作品，支持从当前静态作品一键导入。
          </p>
        </div>
        <form action="/admin/works/seed" method="post">
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-cyan/35 px-3 text-xs text-cyan transition hover:bg-cyan/10"
          >
            导入当前作品
          </button>
        </form>
      </div>

      {seeded ? (
        <p className="mt-4 rounded-md border border-cyan/25 bg-cyan/10 p-2.5 text-xs text-cyan">
          当前静态作品已导入 CMS。
        </p>
      ) : null}
      {seedError ? (
        <p className="mt-4 rounded-md border border-red-300/20 bg-red-300/10 p-2.5 text-xs text-red-200">
          导入失败：{seedError}
        </p>
      ) : null}

      <SectionTabs currentSection={section} worksCount={works.length} filteredCount={filteredWorks.length} />

      {section === "representative" ? (
        <RepresentativeSlotsManager
          slots={representativeSlots}
          allWorks={nonRepresentativeWorks}
          getCoverUrl={getCoverUrl}
          getRepresentativeCoverUrl={getRepresentativeCoverUrl}
        />
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <div />
            <form action={createEmptyWork}>
              <input type="hidden" name="section" value={section === "composite" ? "composite" : "all"} />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-cyan px-4 text-xs font-medium text-black transition hover:bg-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {section === "composite" ? "上传早期作品" : "上传新作品"}
              </button>
            </form>
          </div>

          {section === "all" ? (
            <CategoryPills
              categories={categories}
              works={works}
              currentCategory={categoryFilter}
              currentStatus={status}
              currentQuery={query}
            />
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <FilterBar currentStatus={status} query={query} section={section} currentCategory={categoryFilter} />
            <form action={publishScheduledWorks}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs text-white/70 transition hover:border-cyan/30 hover:text-cyan"
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
            <WorkBatchManager
              works={filteredWorksForBatch}
              viewMode="cards"
              dense={section === "composite"}
            />
          )}
        </>
      )}
    </div>
  );
}

function FilterBar({
  currentStatus,
  query,
  section,
  currentCategory,
}: {
  currentStatus: StatusFilter;
  query: string;
  section: Section;
  currentCategory?: string;
}) {
  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "全部状态" },
    { value: "draft", label: "草稿" },
    { value: "published", label: "已发布" },
    { value: "private", label: "私密" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form className="contents" action="">
        <input type="hidden" name="section" value={section} />
        {currentCategory ? <input type="hidden" name="category" value={currentCategory} /> : null}
        <select
          name="status"
          defaultValue={currentStatus}
          className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
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
          className="h-9 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan sm:min-w-56"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-cyan/35 px-3 text-xs text-cyan transition hover:bg-cyan/10"
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
    { key: "all", label: "分类作品" },
    { key: "representative", label: "代表作" },
    { key: "composite", label: "早期作品" },
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
        {currentSection === "representative"
          ? "7 个推荐位，可上传新作品或从全部作品中选择"
          : filteredCount === worksCount
            ? `共 ${worksCount} 个作品`
            : `显示 ${filteredCount} 个作品（共 ${worksCount} 个）`}
      </p>
    </div>
  );
}

function CategoryPills({
  categories,
  works,
  currentCategory,
  currentStatus,
  currentQuery,
}: {
  categories: TaxonomyRow[];
  works: AdminWorkRow[];
  currentCategory: string;
  currentStatus: StatusFilter;
  currentQuery: string;
}) {
  const categoryWorkCounts = new Map<string, number>();
  for (const w of works) {
    for (const cat of w.category_names) {
      categoryWorkCounts.set(cat, (categoryWorkCounts.get(cat) ?? 0) + 1);
    }
  }
  const uncategorizedCount = works.filter((w) => w.category_names.length === 0).length;

  const buildHref = (cat: string) => {
    const params = new URLSearchParams();
    params.set("section", "all");
    if (cat) params.set("category", cat);
    if (currentStatus !== "all") params.set("status", currentStatus);
    if (currentQuery) params.set("q", currentQuery);
    return `/admin/works?${params.toString()}`;
  };

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <Link
        href={buildHref("")}
        className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs transition ${
          !currentCategory
            ? "bg-cyan text-black"
            : "border border-white/12 text-white/60 hover:border-white/30 hover:text-white/90"
        }`}
      >
        全部
        <span className={`ml-1.5 ${!currentCategory ? "text-black/60" : "text-white/30"}`}>
          {works.length}
        </span>
      </Link>
      {categories.map((cat) => {
        const count = categoryWorkCounts.get(cat.name) ?? 0;
        if (count === 0) return null;
        const isActive = currentCategory === cat.name;
        return (
          <Link
            key={cat.id}
            href={buildHref(cat.name)}
            className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs transition ${
              isActive
                ? "bg-cyan text-black"
                : "border border-white/12 text-white/60 hover:border-white/30 hover:text-white/90"
            }`}
          >
            {cat.name}
            <span className={`ml-1.5 ${isActive ? "text-black/60" : "text-white/30"}`}>
              {count}
            </span>
          </Link>
        );
      })}
      {uncategorizedCount > 0 ? (
        <Link
          href={buildHref("__uncategorized__")}
          className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs transition ${
            currentCategory === "__uncategorized__"
              ? "bg-cyan text-black"
              : "border border-white/12 text-white/60 hover:border-white/30 hover:text-white/90"
          }`}
        >
          未分类
          <span className={`ml-1.5 ${currentCategory === "__uncategorized__" ? "text-black/60" : "text-white/30"}`}>
            {uncategorizedCount}
          </span>
        </Link>
      ) : null}
    </div>
  );
}

type CoverPreview = { url: string; mime_type: string } | null;

function CoverPreviewMedia({ media, alt, className }: { media: CoverPreview; alt: string; className?: string }) {
  if (!media) return null;
  if (media.mime_type.startsWith("video/")) {
    return (
      <video
        src={media.url}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }
  return <img src={media.url} alt={alt} className={className} />;
}

function RepresentativeSlotsManager({
  slots,
  allWorks,
  getCoverUrl,
  getRepresentativeCoverUrl,
}: {
  slots: { slot: number; work: AdminWorkRow | null }[];
  allWorks: AdminWorkRow[];
  getCoverUrl: (work: AdminWorkRow) => CoverPreview;
  getRepresentativeCoverUrl: (work: AdminWorkRow) => CoverPreview;
}) {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {slots.map(({ slot, work }) => (
          <div
            key={slot}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-white/20"
          >
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
              <span className="font-mono text-xs text-white/40">
                代表作位 #{slot}
              </span>
              {work ? (
                <form action={removeFromRepresentative}>
                  <input type="hidden" name="work_id" value={work.id} />
                  <button
                    type="submit"
                    className="text-[11px] text-red-300/70 transition hover:text-red-300"
                  >
                    移除
                  </button>
                </form>
              ) : null}
            </div>

            {work ? (
              <div className="p-3">
                <div className="relative aspect-[3/4.5] overflow-hidden rounded-lg bg-black/30">
                  {getRepresentativeCoverUrl(work) ? (
                    <CoverPreviewMedia
                      media={getRepresentativeCoverUrl(work)}
                      alt={work.title}
                      className="h-full w-full object-cover"
                    />
                  ) : getCoverUrl(work) ? (
                    <CoverPreviewMedia
                      media={getCoverUrl(work)}
                      alt={work.title}
                      className="h-full w-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-white/20">
                      无封面
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <Link
                    href={`/admin/works/${work.id}`}
                    className="absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm transition hover:bg-black/70"
                  >
                    编辑作品
                  </Link>
                  {getRepresentativeCoverUrl(work) && (
                    <div className="absolute right-2 top-2 rounded-md bg-cyan/80 px-2 py-1 text-[9px] font-medium text-black">
                      专属封面
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <p className="truncate text-sm font-medium text-white/90">
                    {work.title}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">
                    {work.status === "published" ? "已发布" : work.status === "draft" ? "草稿" : "私密"}
                    {work.year ? ` · ${work.year}` : ""}
                  </p>
                </div>
                <div className="mt-3 border-t border-white/8 pt-3">
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-white/35">
                    竖版封面（推荐比例 3:4）
                  </p>
                  <RepresentativeCoverUploader workId={work.id} />
                </div>
              </div>
            ) : (
              <div className="p-3">
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 bg-black/20 p-3">
                  <span className="text-xs text-white/25">空槽位</span>
                  <div className="flex flex-col gap-1.5">
                    <form action={createEmptyWork}>
                      <input type="hidden" name="section" value="representative" />
                      <input type="hidden" name="representative_slot" value={slot} />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-cyan/90 px-2.5 py-1.5 text-[11px] font-medium text-black transition hover:bg-cyan"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        上传新作品
                      </button>
                    </form>
                    <SlotWorkSelector slot={slot} allWorks={allWorks} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {allWorks.length === 0 && slots.every((s) => !s.work) ? null : (
        <div className="rounded-md border border-white/8 bg-white/[0.02] p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">
            从全部作品中选择
          </h3>
          {allWorks.length === 0 ? (
            <p className="text-xs text-white/30">暂无其他作品，请先上传新作品</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {allWorks.slice(0, 12).map((work) => (
                <form key={work.id} action={assignToRepresentativeSlot}>
                  <input type="hidden" name="work_id" value={work.id} />
                  <div className="group relative overflow-hidden rounded-md border border-white/8">
                    <div className="aspect-square bg-black/30">
                      {getCoverUrl(work) ? (
                        <CoverPreviewMedia
                          media={getCoverUrl(work)}
                          alt={work.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-white/20">
                          无封面
                        </div>
                      )}
                    </div>
                    <div className="p-1.5">
                      <p className="truncate text-[10px] text-white/60">{work.title}</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
                      <AutoSubmitSelect
                        name="slot"
                        placeholder="添加到槽位"
                        className="min-h-7 rounded border border-cyan/40 bg-black/80 px-2 text-[11px] text-cyan outline-none"
                        options={slots.map((s) => ({
                          value: String(s.slot),
                          label: `槽位 #${s.slot}${s.work ? ` (替换: ${s.work.title.slice(0, 8)}...)` : ""}`,
                        }))}
                      />
                    </div>
                  </div>
                </form>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SlotWorkSelector({
  slot,
  allWorks,
}: {
  slot: number;
  allWorks: AdminWorkRow[];
}) {
  if (allWorks.length === 0) return null;

  return (
    <form action={assignToRepresentativeSlot} className="relative">
      <input type="hidden" name="slot" value={slot} />
      <AutoSubmitSelect
        name="work_id"
        placeholder="从已有作品选择"
        className="w-full min-h-7 rounded border border-white/15 bg-black/40 px-2 text-[11px] text-white/70 outline-none focus:border-cyan/50"
        options={allWorks.map((w) => ({ value: w.id, label: w.title }))}
      />
    </form>
  );
}
