import { describe, expect, it } from "vitest";

import { workRecordSchema } from "./validation";

const validWork = {
  id: "9af7c627-00a4-4bb4-a62f-286ee22f3dde",
  slug: "sample-work",
  title: "示例作品",
  subtitle: "",
  summary: "",
  year: "2026",
  client: "",
  status: "published",
  palette: [],
  is_representative: false,
  representative_order: null,
  is_composite: false,
  composite_order: null,
  sort_order: 0,
  seo_title: "",
  seo_description: "",
  published_at: "2026-06-21T00:00:00.000Z",
};

describe("workRecordSchema", () => {
  it("accepts a normalized published work", () => {
    expect(workRecordSchema.parse(validWork).slug).toBe("sample-work");
  });

  it("rejects invalid status and blank slug", () => {
    expect(() =>
      workRecordSchema.parse({
        ...validWork,
        slug: "",
        status: "hidden",
      }),
    ).toThrow();
  });
});
