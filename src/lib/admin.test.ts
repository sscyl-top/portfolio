import { describe, expect, it } from "vitest";

import { isAdminEmail } from "./admin";

describe("isAdminEmail", () => {
  it("only accepts the configured portfolio owner email", () => {
    expect(isAdminEmail("hello@sscyl.top", "hello@sscyl.top")).toBe(
      true,
    );
    expect(isAdminEmail("other@example.com", "hello@sscyl.top")).toBe(
      false,
    );
    expect(isAdminEmail(undefined, "hello@sscyl.top")).toBe(false);
  });
});
