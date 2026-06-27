import { describe, expect, it } from "vitest";

import {
  buildStorageKey,
  createStableSlug,
  toTagSeedRows,
  toWorkSeedRows,
} from "./admin-model";

const sampleWork = {
  title: "Sample",
  subtitle: "",
  slug: "sample",
  summary: "A sample work",
  category: "Identity",
  tags: ["Brand", "Brand", "UI"],
  tools: ["Figma"],
  year: "2026",
  status: "published" as const,
  priority: 10,
  featuredPriority: 5,
  palette: ["#000000"],
  coverTone: "dark",
  blocks: [],
};

describe("CMS admin model helpers", () => {
  it("creates an ascii slug with a fallback for non-ascii names", () => {
    expect(createStableSlug("Visual Identity", "fallback")).toBe(
      "visual-identity",
    );
    expect(createStableSlug("视觉设计", "category-1")).toBe("category-1");
  });

  it("deduplicates tags before seeding", () => {
    expect(toTagSeedRows([sampleWork])).toEqual([
      { name: "Brand", slug: "brand" },
      { name: "UI", slug: "ui" },
    ]);
  });

  it("maps static works to CMS rows", () => {
    const [row] = toWorkSeedRows([sampleWork], new Set(["sample"]));

    expect(row).toMatchObject({
      slug: "sample",
      status: "published",
      is_representative: true,
      representative_order: 5,
      is_composite: true,
      composite_order: 10,
      sort_order: 10,
    });
    expect(row.published_at).toEqual(expect.any(String));
  });

  it("builds stable storage paths", () => {
    expect(
      buildStorageKey("Hero Image.PNG", "abc", new Date("2026-06-21T00:00:00Z")),
    ).toBe("uploads/2026/06/abc-hero-image.png");
  });
});
