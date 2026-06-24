import { describe, expect, it, vi } from "vitest";

import { getAuthorizedAdmin } from "./admin-session";

describe("getAuthorizedAdmin", () => {
  it("returns the configured admin", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "admin-id",
              email: "3624457672@qq.com",
              app_metadata: { role: "admin" },
            },
          },
        }),
      },
    };

    await expect(getAuthorizedAdmin(client)).resolves.toMatchObject({
      id: "admin-id",
      email: "3624457672@qq.com",
    });
  });

  it("returns null for a normal authenticated user", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "viewer-id",
              email: "viewer@example.com",
              app_metadata: {},
            },
          },
        }),
      },
    };

    await expect(getAuthorizedAdmin(client)).resolves.toBeNull();
  });
});
