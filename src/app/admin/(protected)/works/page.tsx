import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { WorkWizard } from "@/components/admin/WorkWizard";
import { WorkBatchManager } from "@/components/admin/WorkBatchToolbar";
import { AutoSubmitSelect } from "@/components/admin/AutoSubmitSelect";
import { publishScheduledWorks, assignToRepresentativeSlot, removeFromRepresentative } from "./actions";

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
    wizardOpen?: string;
    slot?: string;
  }>;
}) {
  const { seeded, seedError, section: rawSection = "all", status: rawStatus = "all", q = "", wizardOpen, slot } = await searchParams;
  const section: Section = ["all", "representative", "composite"].includes(rawSection ?? "all")
    ? (rawSection as Section)
    : "all";
  const status: StatusFilter = ["all", "draft", "published", "private"].includes(rawStatus ?? "all")
    ? (rawStatus as StatusFilter)
    : "all";
  const query = q.trim().toLowerCase();
  const isWizardOpen = wizardOpen === "true";
  const activeSlot = slot ? Number(slot) : undefined;

  const supabase = await createSupabaseServerClient();
  const [
    { data, error },
    { data: categoriesData },
    { data: tagsData },
    { data: coverMediaData },
  ] = await Promise.all([
    supabase
      .from("works")
      .select(
        "id,title,slug,status,year,sort_order,is_representative,is_composite,representative_order,composite_order,updated_at,cover_media_id",
      )
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("id,name").is("deleted_at", null).order("sort_order", { ascending: true }),
    supabase.from("tags").select("id,name").is("deleted_at", null).order("name", { ascending: true }),
    supabase
      .from("media_assets")
      .select("id,storage_key,mime_type")
      .is("deleted_at", null),
  ]);
  const works = (data ?? []) as AdminWorkRow[];
  const categories = (categoriesData ?? []) as TaxonomyRow[];
  const tags = (tagsData ?? []) as TaxonomyRow[];
  const coverMedia = (coverMediaData ?? []) as CoverMediaRow[];

  const coverMediaMap = new Map(coverMedia.map((m) => [m.id, m]));

  const getCoverUrl = (work: AdminWorkRow) => {
    if (!work.cover_media_id) return null;
    const media = coverMediaMap.get(work.cover_media_id);
    if (!media || !media.mime_type.startsWith("image/")) return null;
    return buildPublicMediaUrl(media.storage_key);
  };

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

      <SectionTabs currentSection={section} worksCount={works.length} filteredCount={filteredWorks.length} />

      {section === "representative" ? (
        <RepresentativeSlotsManager
          slots={representativeSlots}
          allWorks={nonRepresentativeWorks}
          getCoverUrl={getCoverUrl}
          isWizardOpen={isWizardOpen}
          activeSlot={activeSlot}
          categories={categories}
          tags={tags}
        />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <div />
            <Link
              href={`/admin/works?section=${section}&wizardOpen=true`}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-cyan px-5 text-sm font-medium text-black transition hover:bg-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {section === "composite" ? "上传复合设计" : "上传新作品"}
            </Link>
          </div>

          {isWizardOpen ? (
            <WorkWizard
              categories={categories}
              tags={tags}
              presetSection={section === "composite" ? "composite" : "all"}
            />
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <FilterBar currentStatus={status} query={query} section={section} />
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
        </>
      )}
    </div>
  );
}

function FilterBar({
  currentStatus,
  query,
  section,
}: {
  currentStatus: StatusFilter;
  query: string;
  section: Section;
}) {
  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "全部状态" },
    { value: "draft", label: "草稿" },
    { value: "published", label: "已发布" },
    { value: "private", label: "私密" },
  ];

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <form className="contents" action="">
        <input type="hidden" name="section" value={section} />
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
        {currentSection === "representative"
          ? "7 个推荐位，可上传新作品或从全部作品中选择"
          : filteredCount === worksCount
            ? `共 ${worksCount} 个作品`
            : `显示 ${filteredCount} 个作品（共 ${worksCount} 个）`}
      </p>
    </div>
  );
}

function RepresentativeSlotsManager({
  slots,
  allWorks,
  getCoverUrl,
  isWizardOpen,
  activeSlot,
  categories,
  tags,
}: {
  slots: { slot: number; work: AdminWorkRow | null }[];
  allWorks: AdminWorkRow[];
  getCoverUrl: (work: AdminWorkRow) => string | null;
  isWizardOpen: boolean;
  activeSlot?: number;
  categories: TaxonomyRow[];
  tags: TaxonomyRow[];
}) {
  return (
    <div className="mt-6 space-y-6">
      {isWizardOpen && activeSlot ? (
        <div className="rounded-md border border-cyan/30 bg-cyan/5 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cyan">
              上传新作品到代表作位 #{activeSlot}
            </h3>
            <Link
              href="/admin/works?section=representative"
              className="text-xs text-white/50 hover:text-white"
            >
              取消
            </Link>
          </div>
          <WorkWizard
            categories={categories}
            tags={tags}
            presetSection="representative"
            representativeSlot={activeSlot}
          />
        </div>
      ) : null}

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
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black/30">
                  {getCoverUrl(work) ? (
                    <img
                      src={getCoverUrl(work)!}
                      alt={work.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-white/20">
                      无封面
                    </div>
                  )}
                  <Link
                    href={`/admin/works/${work.id}`}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/50"
                  >
                    <span className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-black opacity-0 transition hover:opacity-100">
                      编辑作品
                    </span>
                  </Link>
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
              </div>
            ) : (
              <div className="p-3">
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 bg-black/20 p-3">
                  <span className="text-xs text-white/25">空槽位</span>
                  <div className="flex flex-col gap-1.5">
                    <Link
                      href={`/admin/works?section=representative&wizardOpen=true&slot=${slot}`}
                      className="inline-flex items-center justify-center gap-1 rounded-md bg-cyan/90 px-2.5 py-1.5 text-[11px] font-medium text-black transition hover:bg-cyan"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      上传新作品
                    </Link>
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
                        <img
                          src={getCoverUrl(work)!}
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
