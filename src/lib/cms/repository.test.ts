import { getPublishedWorks } from "@/data/portfolio";
import { describe, expect, it, vi } from "vitest";

import { createCmsRepository } from "./repository";

describe("CMS repository", () => {
  it("returns database works when the source succeeds", async () => {
    const databaseWork = { ...getPublishedWorks()[0], slug: "database-work" };
    const repository = createCmsRepository({
      listPublishedWorks: vi.fn().mockResolvedValue([databaseWork]),
      listFeaturedWorks: vi.fn().mockResolvedValue([]),
      listCompositeWorks: vi.fn().mockResolvedValue([]),
      listVisibleCategories: vi.fn().mockResolvedValue([]),
      getSiteSettings: vi.fn().mockResolvedValue(null),
    });

    await expect(repository.listPublishedWorks()).resolves.toEqual([
      databaseWork,
    ]);
  });

  it("uses static works when CMS is not configured", async () => {
    const repository = createCmsRepository(null);
    const works = await repository.listPublishedWorks();

    expect(works.length).toBeGreaterThan(0);
  });

  it("falls back to static works when the database source fails", async () => {
    const repository = createCmsRepository({
      listPublishedWorks: vi.fn().mockRejectedValue(new Error("offline")),
      listFeaturedWorks: vi.fn().mockResolvedValue([]),
      listCompositeWorks: vi.fn().mockResolvedValue([]),
      listVisibleCategories: vi.fn().mockResolvedValue([]),
      getSiteSettings: vi.fn().mockResolvedValue(null),
    });

    await expect(repository.listPublishedWorks()).resolves.toEqual(
      getPublishedWorks(),
    );
  });
});
