import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Supabase configuration", () => {
  it("reports CMS readiness without requiring Resend", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret");

    const { getBackendReadiness } = await import("./config");

    expect(getBackendReadiness()).toEqual({
      supabase: true,
      contactEmail: false,
      cms: true,
    });
  });

  it("reports every capability unavailable without credentials", async () => {
    const { getBackendReadiness } = await import("./config");

    expect(getBackendReadiness()).toEqual({
      supabase: false,
      contactEmail: false,
      cms: false,
    });
  });
});
