import type { Work } from "@/data/portfolio";

export type CategorySeedRow = {
  name: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
};

export type TagSeedRow = {
  name: string;
  slug: string;
};

export type WorkSeedRow = {
  slug: string;
  title: string;
  summary: string;
  year: string;
  status: Work["status"];
  palette: string[];
  is_representative: boolean;
  representative_order: number | null;
  is_composite: boolean;
  composite_order: number | null;
  sort_order: number;
  published_at: string | null;
};

export function createStableSlug(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function toCategorySeedRows(categories: string[]): CategorySeedRow[] {
  return categories.map((name, index) => ({
    name,
    slug: createStableSlug(name, `category-${index + 1}`),
    sort_order: index,
    is_visible: true,
  }));
}

export function toTagSeedRows(works: Work[]): TagSeedRow[] {
  const tags = Array.from(new Set(works.flatMap((work) => work.tags)));

  return tags.map((name, index) => ({
    name,
    slug: createStableSlug(name, `tag-${index + 1}`),
  }));
}

export function toWorkSeedRows(
  works: Work[],
  compositeSlugs: Set<string>,
): WorkSeedRow[] {
  return works.map((work) => {
    const isComposite = compositeSlugs.has(work.slug);

    return {
      slug: work.slug,
      title: work.title,
      summary: work.summary,
      year: work.year,
      status: work.status,
      palette: work.palette,
      is_representative: typeof work.featuredPriority === "number",
      representative_order: work.featuredPriority ?? null,
      is_composite: isComposite,
      composite_order: isComposite ? work.priority : null,
      sort_order: work.priority,
      published_at: work.status === "published" ? new Date().toISOString() : null,
    };
  });
}

export function buildStorageKey(fileName: string, id: string, now = new Date()) {
  const safeName =
    fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "asset";
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `uploads/${year}/${month}/${id}-${safeName}`;
}
