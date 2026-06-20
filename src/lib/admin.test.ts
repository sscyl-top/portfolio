import { describe, expect, it } from "vitest";

import { isAdminEmail } from "./admin";

describe("isAdminEmail", () => {
  it("only accepts the configured portfolio owner email", () => {
    expect(isAdminEmail("3624457672@qq.com", "3624457672@qq.com")).toBe(
      true,
    );
    expect(isAdminEmail("other@example.com", "3624457672@qq.com")).toBe(
      false,
    );
    expect(isAdminEmail(undefined, "3624457672@qq.com")).toBe(false);
  });
});
