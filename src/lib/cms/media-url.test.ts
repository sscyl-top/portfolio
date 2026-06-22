import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("buildPublicMediaUrl", () => {
  it("builds a deterministic public storage URL from the project URL and key", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");

    const { buildPublicMediaUrl } = await import("./media-url");

    expect(buildPublicMediaUrl("uploads/2026/06/abc-cover.png")).toBe(
      "https://example.supabase.co/storage/v1/object/public/portfolio-media/uploads/2026/06/abc-cover.png",
    );
  });

  it("preserves nested paths and file extensions", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");

    const { buildPublicMediaUrl } = await import("./media-url");

    expect(buildPublicMediaUrl("uploads/2026/01/id-clip.mp4")).toBe(
      "https://demo.supabase.co/storage/v1/object/public/portfolio-media/uploads/2026/01/id-clip.mp4",
    );
  });
});